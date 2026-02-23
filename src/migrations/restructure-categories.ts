/**
 * Category Restructure Migration
 *
 * Restructures 9 root categories (62 subcategories) into 7 clean roots (~41 subcategories).
 * Merges duplicates, breaks up "Другое" catch-all, creates redirects.
 *
 * Usage:
 *   cd ~/projects/sewtech-next
 *   npx tsx src/migrations/restructure-categories.ts 2>&1 | tee /tmp/restructure.log
 *
 * Steps:
 *   1. Create 7 new root categories + subcategories
 *   2. Build old→new subcategory mapping
 *   3. Reassign all products
 *   4. Create URL redirects
 *   5. Mark old root categories showInMegaMenu=false
 *
 * Prerequisites:
 *   - PostgreSQL running
 *   - Dev server NOT running (exclusive DB access)
 */

import 'dotenv/config'
import { getPayload, type Payload } from 'payload'
import config from '../payload/payload.config'

// ─── New Category Tree Definition ───────────────────────────────────────────

interface SubcategoryDef {
  name: string
  slug: string
  sortOrder: number
  /** Old subcategory slugs that map into this one */
  oldSlugs: string[]
}

interface RootCategoryDef {
  name: string
  slug: string
  icon: string
  sortOrder: number
  children: SubcategoryDef[]
  /** Old root slugs whose unmatched products fall into this root */
  fallbackForRoots?: string[]
  /** Default subcategory slug for unmatched products in this root */
  defaultSubSlug?: string
}

const NEW_TREE: RootCategoryDef[] = [
  {
    name: 'Швейные машины',
    slug: 'shvejnye-mashiny',
    icon: '🧵',
    sortOrder: 1,
    fallbackForRoots: ['promyshlennye'],
    defaultSubSlug: 'specialnye',
    children: [
      {
        name: 'Прямострочные',
        slug: 'pryamostrochnye',
        sortOrder: 1,
        oldSlugs: [
          '1-igolnye-chelnohnogo-stezhka',
          '2-h-igolnye-chelnohnogo-stezhka',
          'dlya-kozhi-i-tyazhelyh-materialov',
        ],
      },
      {
        name: 'Оверлоки',
        slug: 'overloki',
        sortOrder: 2,
        oldSlugs: ['overloki'],
      },
      {
        name: 'Распошивальные',
        slug: 'rasposhivalnye',
        sortOrder: 3,
        oldSlugs: ['ploskoshovnye-mashiny'],
      },
      {
        name: 'Цепного стежка',
        slug: 'cepnogo-stezhka',
        sortOrder: 4,
        oldSlugs: ['cepnogo-stezhka'],
      },
      {
        name: 'Зигзаг',
        slug: 'zigzag',
        sortOrder: 5,
        oldSlugs: ['zig-zag'],
      },
      {
        name: 'Петельные',
        slug: 'petelnye',
        sortOrder: 6,
        oldSlugs: ['petelnye'],
      },
      {
        name: 'Пуговичные',
        slug: 'pugovichnye',
        sortOrder: 7,
        oldSlugs: ['pugovichnye'],
      },
      {
        name: 'Закрепочные',
        slug: 'zakrepochnye',
        sortOrder: 8,
        oldSlugs: ['zakrepochnye'],
      },
      {
        name: 'Швейные автоматы',
        slug: 'shvejnye-avtomaty',
        sortOrder: 9,
        oldSlugs: ['shvejnye-avtomaty'],
      },
      {
        name: 'Специальные',
        slug: 'specialnye',
        sortOrder: 10,
        oldSlugs: ['spec-mashiny'],
      },
    ],
  },
  {
    name: 'Бытовые машины',
    slug: 'bytovye-mashiny',
    icon: '🏠',
    sortOrder: 2,
    fallbackForRoots: ['bytovye'],
    defaultSubSlug: 'bytovye-shvejnye-mashiny',
    children: [
      {
        name: 'Швейные машины',
        slug: 'bytovye-shvejnye-mashiny',
        sortOrder: 1,
        oldSlugs: ['shvejnye-mashiny'],
      },
      {
        name: 'Оверлоки',
        slug: 'bytovye-overloki',
        sortOrder: 2,
        oldSlugs: [],
      },
      {
        name: 'Принадлежности',
        slug: 'prinadlezhnosti',
        sortOrder: 3,
        oldSlugs: ['prinadlezhnosti'],
      },
    ],
  },
  {
    name: 'Раскрой и настил',
    slug: 'raskroj-i-nastil',
    icon: '✂️',
    sortOrder: 3,
    fallbackForRoots: ['raskrojnoe'],
    defaultSubSlug: 'diskovye-nozhi',
    children: [
      {
        name: 'Дисковые ножи',
        slug: 'diskovye-nozhi',
        sortOrder: 1,
        oldSlugs: ['mashiny-s-diskovym-nozhom'],
      },
      {
        name: 'Сабельные ножи',
        slug: 'sabelnye-nozhi',
        sortOrder: 2,
        oldSlugs: ['mashiny-s-sabelnym-nozhom'],
      },
      {
        name: 'Ленточные ножи',
        slug: 'lentochnye-nozhi',
        sortOrder: 3,
        oldSlugs: ['mashiny-s-lentochnym-nozhom'],
      },
      {
        name: 'Лазерные машины',
        slug: 'lazernye-mashiny',
        sortOrder: 4,
        oldSlugs: ['lazernye-mashiny'],
      },
      {
        name: 'Автоматические раскройные комплексы',
        slug: 'avtomaticheskie-raskrojnye-kompleksy',
        sortOrder: 5,
        oldSlugs: ['avtomaticheskie-raskrojnye-i-nastilochnye-kompleksy'],
      },
      {
        name: 'Настилочные машины и столы',
        slug: 'nastilochnye-mashiny-i-stoly',
        sortOrder: 6,
        oldSlugs: ['nastilochnye-mashiny', 'nastilochnye-stoly'],
      },
      {
        name: 'Концевые линейки и перемотчики',
        slug: 'koncevye-linejki-i-peremotchiki',
        sortOrder: 7,
        oldSlugs: ['koncevye-linejki', 'peremotochnye-mashiny'],
      },
    ],
  },
  {
    name: 'Утюжильное оборудование',
    slug: 'utyuzhilnoe-oborudovanie',
    icon: '♨️',
    sortOrder: 4,
    fallbackForRoots: ['gladilnoe'],
    defaultSubSlug: 'utyugi-i-parogeneratory',
    children: [
      {
        name: 'Утюги и парогенераторы',
        slug: 'utyugi-i-parogeneratory',
        sortOrder: 1,
        oldSlugs: ['parovye-utyugi', 'elektro-parovye-utyugi', 'utyugi-s-parogeneratorami'],
      },
      {
        name: 'Промышленные парогенераторы',
        slug: 'promyshlennye-parogeneratory',
        sortOrder: 2,
        oldSlugs: ['promyshlennye-parogeneratory'],
      },
      {
        name: 'Гладильные столы',
        slug: 'gladilnye-stoly',
        sortOrder: 3,
        oldSlugs: ['gladilnye-stoly'],
      },
      {
        name: 'Прессa',
        slug: 'pressa',
        sortOrder: 4,
        oldSlugs: ['pressa-dlya-dublirovaniya', 'press-dlya-termo-transfera', 'pressa-formovochnye'],
      },
      {
        name: 'Пароманекены и колодки',
        slug: 'paromanekeny-i-kolodki',
        sortOrder: 5,
        oldSlugs: ['paromenekeny', 'kolodki-i-prisposobleniya'],
      },
    ],
  },
  {
    name: 'Вышивка и печать',
    slug: 'vyshivka-i-pechat',
    icon: '🎨',
    sortOrder: 5,
    fallbackForRoots: ['vyshivka', 'pechat'],
    defaultSubSlug: 'vyshivalnye-mashiny',
    children: [
      {
        name: 'Вышивальные машины',
        slug: 'vyshivalnye-mashiny',
        sortOrder: 1,
        oldSlugs: [
          'mashiny',
          '1-golovochnye',
          '2-h-golovochnye',
          '4-h-golovochnye',
          '6-ti-golovochnye',
          '8-mi-golovochnye',
          'ploskaya-platforma',
        ],
      },
      {
        name: 'Материалы для вышивки',
        slug: 'materialy-dlya-vyshivki',
        sortOrder: 2,
        oldSlugs: ['raskhodniki'],
      },
      {
        name: 'Сублимационные принтеры',
        slug: 'sublimacionnye-printery',
        sortOrder: 3,
        oldSlugs: [
          'kompaktnye-sublimacionnye-printery',
          'proizvoditelnye-sublimacionnye-printery',
          'promyshlennye-sublimacionnye-printery',
        ],
      },
      {
        name: 'DTG-принтеры',
        slug: 'dtg-printery',
        sortOrder: 4,
        oldSlugs: ['dtg-printery-pryamoj-pechati-po-tekstilyu'],
      },
      {
        name: 'Софт для дизайна',
        slug: 'soft-dlya-dizajna',
        sortOrder: 5,
        oldSlugs: [
          'soft',
          'programmnoe-obespechenie',
          'sapr',
          'oborudovanie-dlya-proizvodstva-lekal',
        ],
      },
    ],
  },
  {
    name: 'Расходники и аксессуары',
    slug: 'raskhodniki-i-aksessuary',
    icon: '🔧',
    sortOrder: 6,
    fallbackForRoots: ['drugoe', 'zapasnye-chasti'],
    defaultSubSlug: 'aksessuary',
    children: [
      {
        name: 'Иглы',
        slug: 'igly',
        sortOrder: 1,
        oldSlugs: ['igly'],
      },
      {
        name: 'Нитки',
        slug: 'nitki',
        sortOrder: 2,
        oldSlugs: ['nitki'],
      },
      {
        name: 'Ножницы',
        slug: 'nozhnicy',
        sortOrder: 3,
        oldSlugs: ['nozhnicy'],
      },
      {
        name: 'Запчасти и приспособления',
        slug: 'zapchasti-i-prisposobleniya',
        sortOrder: 4,
        oldSlugs: ['zapchasti-i-prisposobleniya'],
      },
      {
        name: 'Масла и очистители',
        slug: 'masla-i-ochistiteli',
        sortOrder: 5,
        oldSlugs: ['masla-i-ochistiteli'],
      },
      {
        name: 'Светильники',
        slug: 'svetilniki',
        sortOrder: 6,
        oldSlugs: ['svetilniki'],
      },
      {
        name: 'Аксессуары',
        slug: 'aksessuary',
        sortOrder: 7,
        oldSlugs: ['aksessuary', 'uslugi'],
      },
    ],
  },
  {
    name: 'Мебель и оснащение',
    slug: 'mebel-i-osnashchenie',
    icon: '🪑',
    sortOrder: 7,
    fallbackForRoots: ['gotovye-resheniya'],
    defaultSubSlug: 'stoly-i-stulya',
    children: [
      {
        name: 'Столы и стулья',
        slug: 'stoly-i-stulya',
        sortOrder: 1,
        oldSlugs: ['stoly-stulya-i-telezhki'],
      },
      {
        name: 'Манекены',
        slug: 'manekeny',
        sortOrder: 2,
        oldSlugs: ['manekeny'],
      },
      {
        name: 'Пневматические столы',
        slug: 'pnevmaticheskie-stoly',
        sortOrder: 3,
        oldSlugs: ['pnevmaticheskie-stoly'],
      },
      {
        name: 'Оборудование для химчистки',
        slug: 'oborudovanie-dlya-himchistki',
        sortOrder: 4,
        oldSlugs: ['himchistka'],
      },
    ],
  },
]

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const payload = await getPayload({ config })
  console.log('Connected to Payload CMS')

  // Step 1: Load all existing categories
  const allCats = await payload.find({
    collection: 'categories',
    limit: 500,
    depth: 0,
  })
  console.log(`Found ${allCats.docs.length} existing categories`)

  // Build slug→id map for old categories
  const oldSlugToId = new Map<string, number>()
  const oldIdToSlug = new Map<number, string>()
  const oldIdToName = new Map<number, string>()
  const oldIdToParent = new Map<number, number | null>()

  for (const cat of allCats.docs) {
    if (cat.slug) {
      oldSlugToId.set(cat.slug, cat.id)
      oldIdToSlug.set(cat.id, cat.slug)
    }
    oldIdToName.set(cat.id, cat.name)
    const parentId = typeof cat.parent === 'object' && cat.parent !== null
      ? (cat.parent as { id: number }).id
      : (cat.parent as number | null)
    oldIdToParent.set(cat.id, parentId ?? null)
  }

  // Step 2: Create new categories (skip if slug already exists)
  console.log('\n=== Creating new categories ===')

  // oldSubSlug → newSubPayloadId mapping
  const oldSubSlugToNewSubId = new Map<string, number>()
  // newRootSlug → newRootPayloadId
  const newRootSlugToId = new Map<string, number>()
  // newSubSlug → newSubPayloadId
  const newSubSlugToId = new Map<string, number>()
  // oldRootSlug → newRootSlug (for products that reference root directly)
  const oldRootSlugToNewRootSlug = new Map<string, string>()

  for (const rootDef of NEW_TREE) {
    // Create or find root category
    let rootId: number
    const existingRoot = oldSlugToId.get(rootDef.slug)
    if (existingRoot) {
      console.log(`  Root "${rootDef.name}" already exists (id=${existingRoot}), updating...`)
      await payload.update({
        collection: 'categories',
        id: existingRoot,
        data: {
          name: rootDef.name,
          sortOrder: rootDef.sortOrder,
          showInMegaMenu: true,
          icon: rootDef.icon,
          parent: null,
        },
      })
      rootId = existingRoot
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
      rootId = created.id
      console.log(`  Created root "${rootDef.name}" (id=${rootId}, slug=${rootDef.slug})`)
    }
    newRootSlugToId.set(rootDef.slug, rootId)

    // Map old root slugs to this new root
    for (const oldRootSlug of rootDef.fallbackForRoots || []) {
      oldRootSlugToNewRootSlug.set(oldRootSlug, rootDef.slug)
    }

    // Create subcategories
    for (const subDef of rootDef.children) {
      let subId: number
      const existingSub = oldSlugToId.get(subDef.slug)
      if (existingSub) {
        console.log(`    Sub "${subDef.name}" already exists (id=${existingSub}), updating...`)
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
        subId = created.id
        console.log(`    Created sub "${subDef.name}" (id=${subId}, slug=${subDef.slug})`)
      }
      newSubSlugToId.set(subDef.slug, subId)

      // Map each old subcategory slug to this new subcategory
      for (const oldSlug of subDef.oldSlugs) {
        oldSubSlugToNewSubId.set(oldSlug, subId)
      }
    }
  }

  // Step 3: Build complete mapping for old category Payload IDs → new IDs
  console.log('\n=== Building product reassignment map ===')

  // For each old subcategory slug → find its Payload ID and map to new sub ID
  const oldSubIdToNewSubId = new Map<number, number>()
  const oldSubIdToNewRootId = new Map<number, number>()

  for (const [oldSlug, newSubId] of oldSubSlugToNewSubId) {
    const oldId = oldSlugToId.get(oldSlug)
    if (oldId) {
      oldSubIdToNewSubId.set(oldId, newSubId)

      // Find which new root this new sub belongs to
      for (const rootDef of NEW_TREE) {
        for (const subDef of rootDef.children) {
          if (subDef.oldSlugs.includes(oldSlug)) {
            oldSubIdToNewRootId.set(oldId, newRootSlugToId.get(rootDef.slug)!)
            break
          }
        }
      }
    }
  }

  // Special handling for "Бытовые" > "Оверлоки" — old slug may collide with industrial "overloki"
  // The industrial one has parent=37 (Промышленные), domestic has parent=38 (Бытовые)
  // Find the domestic overlock by parent
  const domesticOverlockSub = allCats.docs.find(c => {
    const parentId = typeof c.parent === 'object' && c.parent !== null
      ? (c.parent as { id: number }).id
      : c.parent as number | null
    const parentSlug = parentId ? oldIdToSlug.get(parentId) : null
    return c.name === 'Оверлоки' && parentSlug === 'bytovye'
  })
  if (domesticOverlockSub) {
    const bytOvId = newSubSlugToId.get('bytovye-overloki')!
    oldSubIdToNewSubId.set(domesticOverlockSub.id, bytOvId)
    oldSubIdToNewRootId.set(domesticOverlockSub.id, newRootSlugToId.get('bytovye-mashiny')!)
    console.log(`  Mapped domestic "Оверлоки" (id=${domesticOverlockSub.id}) → bytovye-overloki`)
  }

  // Map old root IDs to new root IDs (for fallback)
  const oldRootIdToNewRootId = new Map<number, number>()
  for (const cat of allCats.docs) {
    const parentId = typeof cat.parent === 'object' && cat.parent !== null
      ? (cat.parent as { id: number }).id
      : cat.parent as number | null
    if (parentId === null && cat.slug) {
      const newRootSlug = oldRootSlugToNewRootSlug.get(cat.slug)
      if (newRootSlug) {
        oldRootIdToNewRootId.set(cat.id, newRootSlugToId.get(newRootSlug)!)
      }
    }
  }

  // Default subcategory IDs for each new root (for products with no sub match)
  const newRootDefaultSubId = new Map<number, number>()
  for (const rootDef of NEW_TREE) {
    if (rootDef.defaultSubSlug) {
      const rootId = newRootSlugToId.get(rootDef.slug)!
      const defaultSubId = newSubSlugToId.get(rootDef.defaultSubSlug)!
      newRootDefaultSubId.set(rootId, defaultSubId)
    }
  }

  // Step 4: Reassign all products
  console.log('\n=== Reassigning products ===')

  let page = 1
  let updated = 0
  let skipped = 0
  let noMatch = 0

  while (true) {
    const products = await payload.find({
      collection: 'products',
      limit: 100,
      page,
      depth: 0,
    })

    if (products.docs.length === 0) break

    for (const product of products.docs) {
      const oldCatId = product.category as number | null
      const oldSubId = product.subcategory as number | null

      let newRootId: number | undefined
      let newSubId: number | undefined

      // Try to match by subcategory first (most specific)
      if (oldSubId && oldSubIdToNewSubId.has(oldSubId)) {
        newSubId = oldSubIdToNewSubId.get(oldSubId)!
        newRootId = oldSubIdToNewRootId.get(oldSubId)!
      }
      // Try matching by root category
      else if (oldCatId && oldRootIdToNewRootId.has(oldCatId)) {
        newRootId = oldRootIdToNewRootId.get(oldCatId)!
        newSubId = newRootDefaultSubId.get(newRootId)
      }
      // Product might already be in a new category (re-run safety)
      else if (oldCatId && Array.from(newRootSlugToId.values()).includes(oldCatId)) {
        skipped++
        continue
      }

      if (newRootId) {
        const updateData: Record<string, unknown> = { category: newRootId }
        if (newSubId) updateData.subcategory = newSubId

        await payload.update({
          collection: 'products',
          id: product.id,
          data: updateData,
        })
        updated++
      } else {
        console.log(`  [NO MATCH] Product "${product.name}" (id=${product.id}) cat=${oldCatId} sub=${oldSubId}`)
        noMatch++
      }
    }

    console.log(`  Page ${page}: processed ${products.docs.length} products`)
    page++
    if (page > products.totalPages) break
  }

  console.log(`\nProducts: ${updated} updated, ${skipped} already migrated, ${noMatch} no match`)

  // Step 5: Create redirects (old URLs → new URLs)
  console.log('\n=== Creating URL redirects ===')

  let redirectsCreated = 0
  for (const rootDef of NEW_TREE) {
    for (const subDef of rootDef.children) {
      for (const oldSlug of subDef.oldSlugs) {
        // Find old parent slug for this old subcategory
        const oldSubId = oldSlugToId.get(oldSlug)
        if (!oldSubId) continue
        const oldParentId = oldIdToParent.get(oldSubId)
        const oldParentSlug = oldParentId ? oldIdToSlug.get(oldParentId) : null

        if (oldParentSlug && oldSlug !== subDef.slug) {
          const fromPath = `/catalog/${oldParentSlug}/${oldSlug}`
          const toPath = `/catalog/${rootDef.slug}/${subDef.slug}`

          if (fromPath !== toPath) {
            try {
              await payload.create({
                collection: 'redirects',
                data: {
                  from: fromPath,
                  to: { type: 'custom', url: toPath },
                },
              })
              redirectsCreated++
            } catch (err: unknown) {
              // Redirect may already exist
              const msg = err instanceof Error ? err.message : String(err)
              if (!msg.includes('duplicate') && !msg.includes('unique')) {
                console.log(`  Redirect error ${fromPath} → ${toPath}: ${msg}`)
              }
            }
          }
        }
      }
    }
  }
  console.log(`Created ${redirectsCreated} redirects`)

  // Step 6: Hide old root categories from mega menu
  console.log('\n=== Hiding old root categories ===')

  const oldRootSlugsToHide = [
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

  for (const slug of oldRootSlugsToHide) {
    const id = oldSlugToId.get(slug)
    if (id) {
      // Only hide if this is NOT one of our new roots
      if (!Array.from(newRootSlugToId.values()).includes(id)) {
        await payload.update({
          collection: 'categories',
          id,
          data: { showInMegaMenu: false },
        })
        console.log(`  Hidden: "${oldIdToName.get(id)}" (slug=${slug})`)
      }
    }
  }

  // Summary
  console.log('\n=== MIGRATION COMPLETE ===')
  console.log(`New roots: ${NEW_TREE.length}`)
  console.log(`New subcategories: ${NEW_TREE.reduce((sum, r) => sum + r.children.length, 0)}`)
  console.log(`Products updated: ${updated}`)
  console.log(`Products skipped: ${skipped}`)
  console.log(`Products no match: ${noMatch}`)
  console.log(`Redirects created: ${redirectsCreated}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
