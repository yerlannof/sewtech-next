/**
 * Fix Non-JUKI Product Visibility
 *
 * 368 non-JUKI products exist in Payload CMS but are invisible in the catalog
 * because they lack a `subcategory`. The frontend filters by subcategory.
 *
 * This script:
 *   1. Creates 7 new root categories + ~41 subcategories (skip if slug exists)
 *   2. Maps each non-JUKI product to the correct subcategory via OC category_id
 *   3. Hides 9 old OpenCart root categories (showInMegaMenu=false)
 *
 * JUKI products (4 existing roots) are NOT touched.
 *
 * Prerequisites:
 *   - PostgreSQL running (docker compose up -d)
 *   - Dev server NOT running (exclusive DB access)
 *
 * Usage:
 *   cd ~/projects/sewtech-next
 *   npx tsx src/migrations/fix-non-juki-categories.ts 2>&1 | tee /tmp/fix-non-juki.log
 */

import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { getPayload, type Payload } from 'payload'
import config from '../payload/payload.config'

// ─── Constants ───────────────────────────────────────────────────────────────

const PROJECT_ROOT = '/home/yerla/projects/sewtech-next'
const OC_PRODUCTS_JSON = path.join(PROJECT_ROOT, 'data/opencart/products.json')

// JUKI manufacturer_id in OpenCart
const JUKI_MANUFACTURER_ID = 6

// ─── New Category Tree (same as restructure-categories.ts) ───────────────────

interface SubcategoryDef {
  name: string
  slug: string
  sortOrder: number
}

interface RootCategoryDef {
  name: string
  slug: string
  icon: string
  sortOrder: number
  children: SubcategoryDef[]
}

const NEW_TREE: RootCategoryDef[] = [
  {
    name: 'Швейные машины',
    slug: 'shvejnye-mashiny',
    icon: '🧵',
    sortOrder: 1,
    children: [
      { name: 'Прямострочные', slug: 'pryamostrochnye', sortOrder: 1 },
      { name: 'Оверлоки', slug: 'overloki', sortOrder: 2 },
      { name: 'Распошивальные', slug: 'rasposhivalnye', sortOrder: 3 },
      { name: 'Цепного стежка', slug: 'cepnogo-stezhka', sortOrder: 4 },
      { name: 'Зигзаг', slug: 'zigzag', sortOrder: 5 },
      { name: 'Петельные', slug: 'petelnye', sortOrder: 6 },
      { name: 'Пуговичные', slug: 'pugovichnye', sortOrder: 7 },
      { name: 'Закрепочные', slug: 'zakrepochnye', sortOrder: 8 },
      { name: 'Швейные автоматы', slug: 'shvejnye-avtomaty', sortOrder: 9 },
      { name: 'Специальные', slug: 'specialnye', sortOrder: 10 },
    ],
  },
  {
    name: 'Бытовые машины',
    slug: 'bytovye-mashiny',
    icon: '🏠',
    sortOrder: 2,
    children: [
      { name: 'Швейные машины', slug: 'bytovye-shvejnye-mashiny', sortOrder: 1 },
      { name: 'Оверлоки', slug: 'bytovye-overloki', sortOrder: 2 },
      { name: 'Принадлежности', slug: 'prinadlezhnosti', sortOrder: 3 },
    ],
  },
  {
    name: 'Раскрой и настил',
    slug: 'raskroj-i-nastil',
    icon: '✂️',
    sortOrder: 3,
    children: [
      { name: 'Дисковые ножи', slug: 'diskovye-nozhi', sortOrder: 1 },
      { name: 'Сабельные ножи', slug: 'sabelnye-nozhi', sortOrder: 2 },
      { name: 'Ленточные ножи', slug: 'lentochnye-nozhi', sortOrder: 3 },
      { name: 'Лазерные машины', slug: 'lazernye-mashiny', sortOrder: 4 },
      { name: 'Автоматические раскройные комплексы', slug: 'avtomaticheskie-raskrojnye-kompleksy', sortOrder: 5 },
      { name: 'Настилочные машины и столы', slug: 'nastilochnye-mashiny-i-stoly', sortOrder: 6 },
      { name: 'Концевые линейки и перемотчики', slug: 'koncevye-linejki-i-peremotchiki', sortOrder: 7 },
    ],
  },
  {
    name: 'Утюжильное оборудование',
    slug: 'utyuzhilnoe-oborudovanie',
    icon: '♨️',
    sortOrder: 4,
    children: [
      { name: 'Утюги и парогенераторы', slug: 'utyugi-i-parogeneratory', sortOrder: 1 },
      { name: 'Промышленные парогенераторы', slug: 'promyshlennye-parogeneratory', sortOrder: 2 },
      { name: 'Гладильные столы', slug: 'gladilnye-stoly', sortOrder: 3 },
      { name: 'Прессa', slug: 'pressa', sortOrder: 4 },
      { name: 'Пароманекены и колодки', slug: 'paromanekeny-i-kolodki', sortOrder: 5 },
    ],
  },
  {
    name: 'Вышивка и печать',
    slug: 'vyshivka-i-pechat',
    icon: '🎨',
    sortOrder: 5,
    children: [
      { name: 'Вышивальные машины', slug: 'vyshivalnye-mashiny', sortOrder: 1 },
      { name: 'Материалы для вышивки', slug: 'materialy-dlya-vyshivki', sortOrder: 2 },
      { name: 'Сублимационные принтеры', slug: 'sublimacionnye-printery', sortOrder: 3 },
      { name: 'DTG-принтеры', slug: 'dtg-printery', sortOrder: 4 },
      { name: 'Софт для дизайна', slug: 'soft-dlya-dizajna', sortOrder: 5 },
    ],
  },
  {
    name: 'Расходники и аксессуары',
    slug: 'raskhodniki-i-aksessuary',
    icon: '🔧',
    sortOrder: 6,
    children: [
      { name: 'Иглы', slug: 'igly', sortOrder: 1 },
      { name: 'Нитки', slug: 'nitki', sortOrder: 2 },
      { name: 'Ножницы', slug: 'nozhnicy', sortOrder: 3 },
      { name: 'Запчасти и приспособления', slug: 'zapchasti-i-prisposobleniya', sortOrder: 4 },
      { name: 'Масла и очистители', slug: 'masla-i-ochistiteli', sortOrder: 5 },
      { name: 'Светильники', slug: 'svetilniki', sortOrder: 6 },
      { name: 'Аксессуары', slug: 'aksessuary', sortOrder: 7 },
    ],
  },
  {
    name: 'Мебель и оснащение',
    slug: 'mebel-i-osnashchenie',
    icon: '🪑',
    sortOrder: 7,
    children: [
      { name: 'Столы и стулья', slug: 'stoly-i-stulya', sortOrder: 1 },
      { name: 'Манекены', slug: 'manekeny', sortOrder: 2 },
      { name: 'Пневматические столы', slug: 'pnevmaticheskie-stoly', sortOrder: 3 },
      { name: 'Оборудование для химчистки', slug: 'oborudovanie-dlya-himchistki', sortOrder: 4 },
    ],
  },
]

// ─── OpenCart category_id → new subcategory slug mapping ─────────────────────

const OC_ID_TO_NEW_SUB_SLUG: Record<number, string> = {
  // Промышленные → Швейные машины
  30: 'pryamostrochnye',     // 1-игольные челночного стежка
  43: 'pryamostrochnye',     // 2-х игольные челночного стежка
  31: 'pryamostrochnye',     // Для кожи и тяжелых материалов
  33: 'overloki',            // Оверлоки (промышленные)
  36: 'rasposhivalnye',      // Плоскошовные машины
  44: 'cepnogo-stezhka',     // Цепного стежка
  32: 'zigzag',              // Зиг-заг
  48: 'petelnye',            // Петельные
  49: 'pugovichnye',         // Пуговичные
  50: 'zakrepochnye',        // Закрепочные
  51: 'shvejnye-avtomaty',   // Швейные автоматы
  52: 'specialnye',          // Спец. машины

  // Бытовые → Бытовые машины
  55: 'bytovye-shvejnye-mashiny', // Швейные машины (бытовые)
  56: 'bytovye-overloki',         // Оверлоки (бытовые)
  57: 'prinadlezhnosti',          // Принадлежности

  // Раскройное → Раскрой и настил
  35: 'diskovye-nozhi',                      // Машины с дисковым ножом
  59: 'sabelnye-nozhi',                      // Машины с сабельным ножом
  60: 'lentochnye-nozhi',                    // Машины с ленточным ножом
  34: 'lazernye-mashiny',                    // Лазерные машины
  94: 'avtomaticheskie-raskrojnye-kompleksy', // Автоматические раскройные и настилочные комплексы
  62: 'nastilochnye-mashiny-i-stoly',        // Настилочные машины
  63: 'nastilochnye-mashiny-i-stoly',        // Настилочные столы
  61: 'koncevye-linejki-i-peremotchiki',     // Концевые линейки
  64: 'koncevye-linejki-i-peremotchiki',     // Перемоточные машины

  // Гладильное → Утюжильное оборудование
  65: 'utyugi-i-parogeneratory',     // Паровые утюги
  66: 'utyugi-i-parogeneratory',     // Электро-паровые утюги
  67: 'utyugi-i-parogeneratory',     // Утюги с парогенераторами
  73: 'promyshlennye-parogeneratory', // Промышленные парогенераторы
  74: 'gladilnye-stoly',             // Гладильные столы
  76: 'pressa',                      // Пресса для дублирования
  77: 'pressa',                      // Пресс для термо-трансфера
  78: 'pressa',                      // Пресса формовочные
  75: 'paromanekeny-i-kolodki',      // Пароменекены
  79: 'paromanekeny-i-kolodki',      // Колодки и приспособления

  // Вышивка → Вышивка и печать
  53: 'vyshivalnye-mashiny',     // Машины (вышивальные)
  86: 'vyshivalnye-mashiny',     // 1-головочные
  87: 'vyshivalnye-mashiny',     // 2-х головочные
  88: 'vyshivalnye-mashiny',     // 4-х головочные
  89: 'vyshivalnye-mashiny',     // 6-ти головочные
  90: 'vyshivalnye-mashiny',     // 8-ми головочные
  91: 'vyshivalnye-mashiny',     // Плоская платформа
  54: 'materialy-dlya-vyshivki', // Расходники (вышивка)

  // Печать → Вышивка и печать
  82: 'sublimacionnye-printery', // Компактные сублимационные принтеры
  83: 'sublimacionnye-printery', // Производительные сублимационные принтеры
  84: 'sublimacionnye-printery', // Промышленные сублимационные принтеры
  85: 'dtg-printery',           // DTG-принтеры

  // Софт (multiple OC categories → soft-dlya-dizajna)
  58: 'soft-dlya-dizajna',  // Софт (Вышивка > Софт)
  41: 'soft-dlya-dizajna',  // Программное обеспечение (Другое)
  95: 'soft-dlya-dizajna',  // САПР (Другое > ПО)
  92: 'soft-dlya-dizajna',  // Оборудование для производства лекал (Печать)

  // Другое → Расходники и аксессуары
  28: 'igly',                        // Иглы
  18: 'nitki',                       // Нитки
  71: 'nozhnicy',                    // Ножницы
  46: 'zapchasti-i-prisposobleniya', // Запчасти и приспособления
  42: 'masla-i-ochistiteli',         // Масла и очистители
  69: 'svetilniki',                  // Светильники
  39: 'aksessuary',                  // Аксессуары
  47: 'aksessuary',                  // Услуги → Аксессуары (fallback)

  // Другое → Мебель и оснащение
  68: 'stoly-i-stulya',             // Столы, стулья и тележки
  72: 'manekeny',                    // Манекены
  70: 'pnevmaticheskie-stoly',      // Пневматические столы
  80: 'oborudovanie-dlya-himchistki', // Химчистка
}

// Root-level OC category fallbacks (for products with only root category_id)
const OC_ROOT_TO_DEFAULT_SUB: Record<number, string> = {
  37: 'specialnye',              // Промышленные → Швейные машины > Специальные
  38: 'bytovye-shvejnye-mashiny', // Бытовые → Бытовые машины > Швейные машины
  40: 'vyshivalnye-mashiny',     // Вышивка → Вышивка и печать > Вышивальные
  81: 'sublimacionnye-printery', // Печать → Вышивка и печать > Сублимационные
  20: 'diskovye-nozhi',          // Раскройное → Раскрой > Дисковые ножи
  25: 'utyugi-i-parogeneratory', // Гладильное → Утюжильное > Утюги
  29: 'stoly-i-stulya',          // Готовые решения → Мебель
  93: 'zapchasti-i-prisposobleniya', // Запасные части → Расходники
  45: 'aksessuary',              // Другое → Расходники > Аксессуары
}

// Old OC root category slugs to hide from mega menu
const OLD_ROOT_SLUGS_TO_HIDE = [
  'promyshlennye',
  'bytovye',
  'vyshivka',
  'pechat',
  'raskrojnoe',
  'gladilnoe',
  'gotovye-resheniya',
  'zapasnye-chasti',
  'drugoe',
]

// Hardcoded overrides for specific products (by oldOpencartId)
const PRODUCT_OVERRIDES: Record<number, string> = {
  420: 'rasposhivalnye', // Kansai Special DLR 1508P — no category_id in OC data
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface OCProduct {
  id: number
  name: string
  model: string
  manufacturer_id: number
  category_id: number | null
  all_category_ids: number[]
}

function loadJSON<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

// Build a map: new subcategory slug → which new root slug it belongs to
function buildSubToRootMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const root of NEW_TREE) {
    for (const sub of root.children) {
      map.set(sub.slug, root.slug)
    }
  }
  return map
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const payload = await getPayload({ config })
  console.log('Connected to Payload CMS')

  const subToRootSlug = buildSubToRootMap()

  // ─── Step 1: Create new categories ─────────────────────────────────────────

  console.log('\n=== Step 1: Creating new root categories + subcategories ===')

  // Load all existing categories
  const allCats: Array<{ id: number; name: string; slug: string; parent?: { id: number } | number | null }> = []
  let page = 1
  while (true) {
    const batch = await payload.find({
      collection: 'categories',
      limit: 100,
      page,
      depth: 0,
    })
    allCats.push(...(batch.docs as any[]))
    if (!batch.hasNextPage) break
    page++
  }
  console.log(`Found ${allCats.length} existing categories`)

  // Build slug → id map
  const slugToId = new Map<string, number>()
  for (const cat of allCats) {
    if (cat.slug) slugToId.set(cat.slug, cat.id)
  }

  // Maps we'll build
  const newRootSlugToId = new Map<string, number>()
  const newSubSlugToId = new Map<string, number>()

  let rootsCreated = 0
  let rootsExisted = 0
  let subsCreated = 0
  let subsExisted = 0

  for (const rootDef of NEW_TREE) {
    // Create or find root category
    let rootId: number
    const existingRoot = slugToId.get(rootDef.slug)
    if (existingRoot) {
      // Update to ensure showInMegaMenu=true and correct sortOrder
      await payload.update({
        collection: 'categories',
        id: existingRoot,
        data: {
          name: rootDef.name,
          sortOrder: rootDef.sortOrder,
          showInMegaMenu: true,
          icon: rootDef.icon,
          parent: null as any,
        },
      })
      rootId = existingRoot
      rootsExisted++
    } else {
      const created = await payload.create({
        collection: 'categories',
        data: {
          name: rootDef.name,
          slug: rootDef.slug,
          sortOrder: rootDef.sortOrder,
          showInMegaMenu: true,
          icon: rootDef.icon,
        },
      })
      rootId = created.id as number
      slugToId.set(rootDef.slug, rootId)
      rootsCreated++
      console.log(`  Created root: "${rootDef.name}" (id=${rootId})`)
    }
    newRootSlugToId.set(rootDef.slug, rootId)

    // Create subcategories
    for (const subDef of rootDef.children) {
      let subId: number
      const existingSub = slugToId.get(subDef.slug)
      if (existingSub) {
        // Update to ensure correct parent and showInMegaMenu
        await payload.update({
          collection: 'categories',
          id: existingSub,
          data: {
            name: subDef.name,
            sortOrder: subDef.sortOrder,
            showInMegaMenu: true,
            parent: rootId,
          },
        })
        subId = existingSub
        subsExisted++
      } else {
        const created = await payload.create({
          collection: 'categories',
          data: {
            name: subDef.name,
            slug: subDef.slug,
            sortOrder: subDef.sortOrder,
            showInMegaMenu: true,
            parent: rootId,
          },
        })
        subId = created.id as number
        slugToId.set(subDef.slug, subId)
        subsCreated++
        console.log(`    Created sub: "${subDef.name}" (id=${subId})`)
      }
      newSubSlugToId.set(subDef.slug, subId)
    }
  }

  console.log(`\nCategories: ${rootsCreated} roots created, ${rootsExisted} existed`)
  console.log(`Subcategories: ${subsCreated} created, ${subsExisted} existed`)

  // ─── Step 2: Map non-JUKI products to new subcategories ────────────────────

  console.log('\n=== Step 2: Mapping non-JUKI products to new subcategories ===')

  // Load OpenCart products data for category_id lookup
  const ocProducts = loadJSON<OCProduct[]>(OC_PRODUCTS_JSON)
  const ocProductById = new Map<number, OCProduct>()
  for (const p of ocProducts) {
    ocProductById.set(p.id, p)
  }
  console.log(`Loaded ${ocProducts.length} OC products for category lookup`)

  // Iterate through ALL Payload products, update non-JUKI ones without subcategory
  let updated = 0
  let alreadyHasSub = 0
  let isJuki = 0
  let noOcMatch = 0
  let noSubMatch = 0
  let errors = 0
  page = 1

  while (true) {
    const batch = await payload.find({
      collection: 'products',
      limit: 100,
      page,
      depth: 1, // need brand populated to check JUKI
    })

    if (batch.docs.length === 0) break

    for (const product of batch.docs) {
      // Skip if already has subcategory
      if (product.subcategory) {
        alreadyHasSub++
        continue
      }

      // Skip JUKI products (they have their own 4 root categories)
      const brand = product.brand as { id: number; name: string } | number | null
      const brandName = typeof brand === 'object' && brand !== null ? brand.name : null
      if (brandName === 'JUKI') {
        isJuki++
        continue
      }

      // Find the OC product by oldOpencartId
      const ocId = product.oldOpencartId as number | null
      if (!ocId) {
        noOcMatch++
        continue
      }

      // Check hardcoded overrides first
      let targetSubSlug: string | undefined = PRODUCT_OVERRIDES[ocId]

      if (!targetSubSlug) {
        const ocProd = ocProductById.get(ocId)
        if (!ocProd) {
          noOcMatch++
          console.log(`  [NO OC DATA] "${product.name}" (ocId=${ocId})`)
          continue
        }

        // Try to find subcategory from OC category_id
        const catId = ocProd.category_id
        if (catId) {
          // Direct match — subcategory level
          targetSubSlug = OC_ID_TO_NEW_SUB_SLUG[catId]

          // If catId is a root, check all_category_ids for a more specific match
          if (!targetSubSlug && OC_ROOT_TO_DEFAULT_SUB[catId]) {
            // Try all_category_ids for a subcategory-level match
            for (const altId of ocProd.all_category_ids) {
              if (altId !== catId && OC_ID_TO_NEW_SUB_SLUG[altId]) {
                targetSubSlug = OC_ID_TO_NEW_SUB_SLUG[altId]
                break
              }
            }
            // Fallback to root default
            if (!targetSubSlug) {
              targetSubSlug = OC_ROOT_TO_DEFAULT_SUB[catId]
            }
          }
        }

        // If still no match, try all_category_ids
        if (!targetSubSlug) {
          for (const altId of ocProd.all_category_ids || []) {
            if (OC_ID_TO_NEW_SUB_SLUG[altId]) {
              targetSubSlug = OC_ID_TO_NEW_SUB_SLUG[altId]
              break
            }
            if (OC_ROOT_TO_DEFAULT_SUB[altId]) {
              targetSubSlug = OC_ROOT_TO_DEFAULT_SUB[altId]
              break
            }
          }
        }
      }

      if (!targetSubSlug) {
        noSubMatch++
        console.log(`  [NO SUB MATCH] "${product.name}" (ocId=${ocId}, catId=${ocProductById.get(ocId)?.category_id}, allCats=${ocProductById.get(ocId)?.all_category_ids})`)
        continue
      }

      // Resolve Payload IDs
      const subPayloadId = newSubSlugToId.get(targetSubSlug)
      if (!subPayloadId) {
        noSubMatch++
        console.log(`  [SUB NOT FOUND] "${product.name}" → slug "${targetSubSlug}" not in Payload`)
        continue
      }

      const rootSlug = subToRootSlug.get(targetSubSlug)
      const rootPayloadId = rootSlug ? newRootSlugToId.get(rootSlug) : undefined

      try {
        const updateData: Record<string, unknown> = {
          subcategory: subPayloadId,
        }
        if (rootPayloadId) {
          updateData.category = rootPayloadId
        }

        await payload.update({
          collection: 'products',
          id: product.id,
          data: updateData,
        })
        updated++

        if (updated % 50 === 0) {
          console.log(`  Updated ${updated} products...`)
        }
      } catch (err) {
        errors++
        console.error(`  ERROR updating "${product.name}": ${(err as Error).message?.slice(0, 100)}`)
      }
    }

    page++
    if (page > batch.totalPages) break
  }

  console.log(`\nProducts: ${updated} updated, ${alreadyHasSub} already had subcategory, ${isJuki} JUKI skipped`)
  console.log(`  No OC match: ${noOcMatch}, No sub match: ${noSubMatch}, Errors: ${errors}`)

  // ─── Step 3: Hide old OpenCart root categories ─────────────────────────────

  console.log('\n=== Step 3: Hiding old OpenCart root categories ===')

  // JUKI root slugs that must NOT be touched
  const jukiRootSlugs = new Set([
    'dlya-poshiva-odezhdy',
    'dlya-neodezhdnyh-izdelij',
    'komplektuyuschie',
    'sistemy',
  ])

  let hidden = 0
  for (const slug of OLD_ROOT_SLUGS_TO_HIDE) {
    const id = slugToId.get(slug)
    if (!id) {
      console.log(`  Slug "${slug}" not found in DB, skipping`)
      continue
    }

    // Safety: never touch JUKI roots
    if (jukiRootSlugs.has(slug)) {
      console.log(`  SKIP JUKI root: "${slug}"`)
      continue
    }

    // Don't hide if it's one of our new roots (shouldn't happen, but safety)
    if (Array.from(newRootSlugToId.values()).includes(id)) {
      console.log(`  SKIP new root: "${slug}" (id=${id})`)
      continue
    }

    await payload.update({
      collection: 'categories',
      id,
      data: { showInMegaMenu: false },
    })
    hidden++
    console.log(`  Hidden: "${slug}" (id=${id})`)
  }

  console.log(`\nHidden ${hidden} old root categories`)

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log('\n=== MIGRATION COMPLETE ===')
  console.log(`New roots: ${rootsCreated} created, ${rootsExisted} existed`)
  console.log(`New subcategories: ${subsCreated} created, ${subsExisted} existed`)
  console.log(`Products updated: ${updated}`)
  console.log(`Products skipped (already had sub): ${alreadyHasSub}`)
  console.log(`Products skipped (JUKI): ${isJuki}`)
  console.log(`Products no OC match: ${noOcMatch}`)
  console.log(`Products no sub match: ${noSubMatch}`)
  console.log(`Errors: ${errors}`)
  console.log(`Old roots hidden: ${hidden}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
