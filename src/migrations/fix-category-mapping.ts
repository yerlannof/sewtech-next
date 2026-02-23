/**
 * Fix: Reassign remaining 708 products that weren't matched in restructure-categories.ts
 *
 * The first migration missed products under old roots:
 *   - "Для пошива одежды" (id=11) — JUKI apparel categories
 *   - "Для неодёжных изделий" (id=1) — JUKI non-apparel categories
 *   - "Промышленные" (id=31) — OpenCart industrial categories (slug mismatches)
 *   - "Комплектующие" (id=27), "Системы" (id=29)
 *   - "Другое" (id=38) — remaining subcats
 *
 * Usage:
 *   cd ~/projects/sewtech-next
 *   npx tsx src/migrations/fix-category-mapping.ts 2>&1 | tee /tmp/fix-mapping.log
 */

import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload/payload.config'

// Direct old subcategory ID → new subcategory ID mapping
// Based on actual DB: SELECT id, slug, name, parent_id FROM categories
const OLD_SUB_TO_NEW_SUB: Record<number, number> = {
  // ─── From parent=11 "Для пошива одежды" → "Швейные машины" (root=70) ───
  22: 100,  // odnoigolnaya-pryamostrochnaya → Прямострочные
  13: 100,  // dvuhigolnaya-pryamostrochnaya → Прямострочные
  12: 68,   // avtomaticheskaya-shvejnaya-mashina → Швейные автоматы
  17: 68,   // mashina-strochki-po-programme → Швейные автоматы
  20: 68,   // mashina-shitya-po-shablonu → Швейные автоматы
  21: 61,   // overlok-kraeobmyotochnaya → Оверлоки
  24: 101,  // ploskoshovnaya-mashina → Распошивальные
  14: 102,  // dvuhnitochnaya-tsepnogo-stezhka → Цепного стежка
  16: 103,  // zigzag-mashina → Зигзаг
  23: 65,   // petelnaya-mashina → Петельные
  25: 66,   // pugovichnaya-mashina → Пуговичные
  15: 67,   // zakrepochnaya-mashina → Закрепочные
  26: 104,  // smyotochnaya-mashina → Специальные
  18: 104,  // mashina-tochechnoj-proshivki → Специальные
  19: 104,  // mashina-ustanovki-knopok → Специальные

  // ─── From parent=1 "Для неодёжных изделий" → "Швейные машины" (root=70) ───
  6: 100,   // mashina-ploskoj-platformoj → Прямострочные
  4: 100,   // kolonkovaya-mashina → Прямострочные
  10: 100,  // rukavnaya-mashina → Прямострочные
  7: 61,    // overlok-neodezhda → Оверлоки
  2: 68,    // avtomaticheskaya-mashina-neodezhda → Швейные автоматы
  5: 68,    // mashina-strochki-po-programme-neodezhda → Швейные автоматы
  8: 68,    // programmiruemaya-plk-g → Швейные автоматы
  9: 68,    // programmiruemaya-plk-j → Швейные автоматы
  3: 67,    // zakrepochnaya-mashina-neodezhda → Закрепочные

  // ─── From parent=31 "Промышленные" (slug mismatches in first run) ───
  58: 100,  // 1-igolnye-chelnochnogo-stezhka → Прямострочные
  59: 100,  // 2-h-igolnye-chelnochnogo-stezhka → Прямострочные
  60: 100,  // dlya-kozhi-i-tyazhelyh-materialov → Прямострочные
  62: 101,  // ploskoshovnye-mashiny → Распошивальные
  63: 102,  // tsepnogo-stezhka → Цепного стежка
  64: 103,  // zig-zag → Зигзаг
  69: 104,  // spets-mashiny → Специальные

  // ─── From parent=27 "Комплектующие" ───
  28: 84,   // blok-upravleniya-motor-panel → Запчасти и приспособления

  // ─── From parent=29 "Системы" ───
  30: 124,  // programmnoe-obespechenie → Софт для дизайна

  // ─── From parent=38 "Другое" (remaining unmapped) ───
  75: 129,  // himchistka → Оборудование для химчистки
  79: 126,  // nozhnitsy → Ножницы
  81: 128,  // stoly-stulya-i-telezhki → Столы и стулья
  87: 124,  // drugoe-programmnoe-obespechenie → Софт для дизайна
  88: 76,   // uslugi → Аксессуары

  // ─── From parent=32 "Бытовые" ───
  // 55→106 (bytovye-shvejnye), 56→107 (bytovye-overloki), 57→71 (prinadlezhnosti)
  // These are OpenCart subcats — check if any products reference them
}

// New subcategory → new root mapping
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

// Old root ID → new root ID (fallback for products with no subcategory match)
const OLD_ROOT_TO_NEW_ROOT: Record<number, number> = {
  11: 70,   // Для пошива одежды → Швейные машины
  1: 70,    // Для неодёжных изделий → Швейные машины
  31: 70,   // Промышленные → Швейные машины
  32: 105,  // Бытовые → Бытовые машины
  33: 119,  // Вышивка → Вышивка и печать
  34: 119,  // Печать → Вышивка и печать
  35: 108,  // Раскройное → Раскрой и настил
  36: 115,  // Гладильное → Утюжильное оборудование
  37: 125,  // Запасные части → Расходники и аксессуары
  38: 125,  // Другое → Расходники и аксессуары
  27: 125,  // Комплектующие → Расходники и аксессуары
  29: 119,  // Системы → Вышивка и печать
}

// Default subcategory for each new root (when no sub match)
const ROOT_DEFAULT_SUB: Record<number, number> = {
  70: 104,   // Швейные машины → Специальные
  105: 106,  // Бытовые машины → Швейные машины
  108: 109,  // Раскрой → Дисковые ножи
  115: 116,  // Утюжильное → Утюги и парогенераторы
  119: 120,  // Вышивка → Вышивальные машины
  125: 76,   // Расходники → Аксессуары
  127: 128,  // Мебель → Столы и стулья
}

// Set of all new root/sub IDs (to detect already-migrated products)
const NEW_ROOT_IDS = new Set([70, 105, 108, 115, 119, 125, 127])
const NEW_SUB_IDS = new Set(Object.keys(NEW_SUB_TO_ROOT).map(Number))

async function main() {
  const payload = await getPayload({ config })
  console.log('Connected to Payload CMS')

  let page = 1
  let updated = 0
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
      const oldCatId = product.category as number | null
      const oldSubId = product.subcategory as number | null

      // Skip if already in a new root + new sub
      if (oldCatId && NEW_ROOT_IDS.has(oldCatId) && oldSubId && NEW_SUB_IDS.has(oldSubId)) {
        alreadyOk++
        continue
      }

      let newRootId: number | undefined
      let newSubId: number | undefined

      // Try mapping by old subcategory ID
      if (oldSubId && OLD_SUB_TO_NEW_SUB[oldSubId]) {
        newSubId = OLD_SUB_TO_NEW_SUB[oldSubId]
        newRootId = NEW_SUB_TO_ROOT[newSubId]
      }
      // Try mapping by old root ID
      else if (oldCatId && OLD_ROOT_TO_NEW_ROOT[oldCatId]) {
        newRootId = OLD_ROOT_TO_NEW_ROOT[oldCatId]
        newSubId = ROOT_DEFAULT_SUB[newRootId]
      }

      if (newRootId && newSubId) {
        await payload.update({
          collection: 'products',
          id: product.id,
          data: { category: newRootId, subcategory: newSubId },
        })
        updated++
      } else {
        console.log(`  [NO MATCH] "${product.name}" (id=${product.id}) cat=${oldCatId} sub=${oldSubId}`)
        noMatch++
      }
    }

    console.log(`Page ${page}: processed ${products.docs.length}`)
    page++
    if (page > products.totalPages) break
  }

  console.log(`\n=== FIX COMPLETE ===`)
  console.log(`Total: ${total}`)
  console.log(`Updated: ${updated}`)
  console.log(`Already OK: ${alreadyOk}`)
  console.log(`No match: ${noMatch}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Fix failed:', err)
  process.exit(1)
})
