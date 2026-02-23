/**
 * Fix #2: Reassign the remaining 339 products that fix-category-mapping.ts missed.
 *
 * Two groups:
 *  A) 164 products whose category_id already points to a NEW subcategory (e.g. 78=Иглы)
 *     but subcategory_id is NULL. Fix: set subcategory = category_id, category = parent root.
 *
 *  B) 175 products whose category_id points to an OLD subcategory (e.g. 79=Ножницы under parent=38).
 *     Fix: map old cat → new sub + new root.
 *
 * Usage:
 *   cd ~/projects/sewtech-next
 *   npx tsx src/migrations/fix-category-mapping-2.ts 2>&1 | tee /tmp/fix-mapping-2.log
 */

import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload/payload.config'

// New root IDs
const NEW_ROOT_IDS = new Set([70, 105, 108, 115, 119, 125, 127])

// All new subcategory IDs → their root
const NEW_SUB_TO_ROOT: Record<number, number> = {
  // Швейные машины (root=70)
  100: 70, 61: 70, 101: 70, 102: 70, 103: 70, 65: 70, 66: 70, 67: 70, 68: 70, 104: 70,
  // Бытовые машины (root=105)
  106: 105, 107: 105, 71: 105,
  // Раскрой и настил (root=108)
  109: 108, 110: 108, 111: 108, 47: 108, 112: 108, 113: 108, 114: 108,
  // Утюжильное оборудование (root=115)
  116: 115, 51: 115, 52: 115, 117: 115, 118: 115,
  // Вышивка и печать (root=119)
  120: 119, 121: 119, 122: 119, 123: 119, 124: 119,
  // Расходники и аксессуары (root=125)
  78: 125, 77: 125, 126: 125, 84: 125, 85: 125, 83: 125, 76: 125,
  // Мебель и оснащение (root=127)
  128: 127, 80: 127, 82: 127, 129: 127,
}

// Old subcategory → new subcategory mapping (for group B)
const OLD_CAT_TO_NEW_SUB: Record<number, number> = {
  // Ножницы (parent=38 Другое) → Ножницы (126, under 125 Расходники)
  79: 126,
  // Расходники (parent=33 Вышивка) → Аксессуары (76, under 125)
  73: 76,
  // Плоскошовные машины (parent=31 Промышленные) → Распошивальные (101)
  62: 101,
  // Настилочные столы (parent=35 Раскройное) → Настилочные машины и столы (113)
  45: 113,
  // Столы, стулья и тележки (parent=38 Другое) → Столы и стулья (128)
  81: 128,
  // Машины с сабельным ножом (parent=35) → Сабельные ножи (110)
  41: 110,
  // Производительные сублимационные (parent=34 Печать) → Сублимационные принтеры (122)
  96: 122,
  // Машины с ленточным ножом (parent=35) → Ленточные ножи (111)
  42: 111,
  // Концевые линейки (parent=35) → Концевые линейки и перемотчики (114)
  43: 114,
  // Спец. машины (parent=31) → Специальные (104)
  69: 104,
  // Вышивальные головки (parent=72 Машины under 33 Вышивка) → Вышивальные машины (120)
  89: 120, 90: 120, 91: 120, 92: 120, 93: 120, 94: 120,
  // Перемоточные машины (parent=35) → Концевые линейки и перемотчики (114)
  46: 114,
  // Программное обеспечение (parent=38) → Софт для дизайна (124)
  87: 124,
  // Промышленные сублимационные (parent=34) → Сублимационные принтеры (122)
  97: 122,
  // Химчистка (parent=38) → Оборудование для химчистки (129)
  75: 129,
  // Компактные сублимационные (parent=34) → Сублимационные принтеры (122)
  95: 122,
  // Оборудование для производства лекал (parent=34) → Материалы для вышивки (121)
  99: 121,
  // DTG-принтеры (parent=34) → DTG-принтеры (123)
  98: 123,
  // Утюги с парогенераторами (parent=36) → Утюги и парогенераторы (116)
  50: 116,
  // Настилочные машины (parent=35) → Настилочные машины и столы (113)
  44: 113,
  // Пресса для дублирования (parent=36) → Прессa (117)
  54: 117,
  // Электро-паровые утюги (parent=36) → Утюги и парогенераторы (116)
  49: 116,
  // Машины с дисковым ножом (parent=35) → Дисковые ножи (109)
  39: 109,
  // Пароменекены (parent=36) → Пароманекены и колодки (118)
  53: 118,
  // Зиг-заг (parent=31) → Зигзаг (103)
  64: 103,
}

async function main() {
  const payload = await getPayload({ config })
  console.log('Connected to Payload CMS')

  let page = 1
  let groupA = 0
  let groupB = 0
  let alreadyOk = 0
  let noMatch = 0
  let total = 0

  while (true) {
    const products = await payload.find({
      collection: 'products',
      limit: 100,
      page,
      depth: 0,
    })

    if (products.docs.length === 0) break

    for (const product of products.docs) {
      total++
      const catId = product.category as number | null
      const subId = product.subcategory as number | null

      // Already fully mapped?
      if (catId && NEW_ROOT_IDS.has(catId) && subId && NEW_SUB_TO_ROOT[subId]) {
        alreadyOk++
        continue
      }

      // Group A: category_id IS a new subcategory, just needs root + sub swap
      if (catId && NEW_SUB_TO_ROOT[catId]) {
        const newRootId = NEW_SUB_TO_ROOT[catId]
        await payload.update({
          collection: 'products',
          id: product.id,
          data: { category: newRootId, subcategory: catId },
        })
        groupA++
        continue
      }

      // Group B: category_id is an OLD subcategory, map to new
      if (catId && OLD_CAT_TO_NEW_SUB[catId]) {
        const newSubId = OLD_CAT_TO_NEW_SUB[catId]
        const newRootId = NEW_SUB_TO_ROOT[newSubId]
        if (newRootId) {
          await payload.update({
            collection: 'products',
            id: product.id,
            data: { category: newRootId, subcategory: newSubId },
          })
          groupB++
          continue
        }
      }

      console.log(`  [NO MATCH] "${product.name}" (id=${product.id}) cat=${catId} sub=${subId}`)
      noMatch++
    }

    console.log(`Page ${page}: processed ${products.docs.length}`)
    page++
    if (page > products.totalPages) break
  }

  console.log(`\n=== FIX #2 COMPLETE ===`)
  console.log(`Total: ${total}`)
  console.log(`Group A (sub→root swap): ${groupA}`)
  console.log(`Group B (old→new map): ${groupB}`)
  console.log(`Already OK: ${alreadyOk}`)
  console.log(`No match: ${noMatch}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Fix #2 failed:', err)
  process.exit(1)
})
