/**
 * Migration script: Import 373 JUKI products from OpenCart products.json into Payload CMS
 *
 * Usage: cd ~/projects/sewtech-next && npx tsx src/migrations/opencart-import.ts
 *
 * Prerequisites:
 * - PostgreSQL running (docker-compose up -d)
 * - Dev server NOT running (Payload needs exclusive DB access)
 */

import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { getPayload } from 'payload'
import config from '../payload/payload.config'

const JUKI_RAG_DIR = '/home/yerla/projects/juki-rag-project'
const PRODUCTS_JSON = path.join(JUKI_RAG_DIR, 'output/opencart_import/products.json')
const CATEGORIES_JSON = path.join(JUKI_RAG_DIR, 'output/opencart_import/categories.json')
const IMAGES_DIR = path.join(JUKI_RAG_DIR, 'output/images/juki')

interface OpenCartProduct {
  name: string
  model: string
  sku: string
  price: number | null
  category: string
  subcategory: string
  description: string
  attributes: Array<{
    attribute_name: string
    text: string
    sort_order: number
  }>
  faq: Array<{
    question: string
    answer: string
  }>
  image_main: string
  image_additional: string[]
  related_models: string[]
  seo: {
    meta_title: string
    meta_description: string
    meta_keyword: string
    seo_url: string
  }
  filters: string[]
  status: number
  stock_status_id: number
  product_id: number
  tags: string[]
}

interface OpenCartCategory {
  name: string
  children: Array<{ name: string }>
}

// Machine type mapping from subcategory name
const MACHINE_TYPE_MAP: Record<string, string> = {
  'Одноигольная прямострочная машина (челночный стежок)': 'lockstitch',
  'Двухигольная прямострочная машина (челночный стежок)': 'lockstitch',
  'Оверлок / краеобмёточная машина': 'overlock',
  'Оверлок': 'overlock',
  'Плоскошовная (распошивальная) машина': 'coverstitch',
  'Закрепочная машина': 'bartacking',
  'Петельная машина (для изготовления петель)': 'buttonhole',
  'Пуговичная машина (для пришивания пуговиц)': 'button-sewing',
  'Зигзаг-машина': 'zigzag',
  'Автоматическая швейная машина': 'automatic',
  'Машина для выполнения строчек по программе': 'automatic',
  'Машина для шитья по шаблону': 'automatic',
  'Программируемая машина PLK-G': 'automatic',
  'Программируемая машина PLK-J': 'automatic',
  'Колонковая машина': 'post-bed',
  'Рукавная машина (с цилиндрической платформой)': 'cylinder-bed',
  'Машина с плоской платформой': 'lockstitch',
  'Двухниточная цепного стежка': 'lockstitch',
  'Смёточная машина': 'other',
  'Машина для точечной прошивки': 'other',
  'Машина для установки кнопок': 'other',
  'Блок управления / мотор / панель': 'other',
  'Программное обеспечение / системы': 'other',
}

// Purpose mapping from top-level category
const PURPOSE_MAP: Record<string, string> = {
  'Для пошива одежды': 'apparel',
  'Для неодёжных изделий': 'non-apparel',
  'Комплектующие': 'apparel',
  'Системы': 'apparel',
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яёА-ЯЁ]/g, (char) => {
      const map: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      }
      return map[char.toLowerCase()] || char
    })
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  console.log('=== SEWTECH Migration: OpenCart → Payload CMS ===\n')

  // Initialize Payload
  console.log('Initializing Payload...')
  const payload = await getPayload({ config })
  console.log('Payload initialized.\n')

  // Load source data
  const products: OpenCartProduct[] = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf-8'))
  const categories: OpenCartCategory[] = JSON.parse(fs.readFileSync(CATEGORIES_JSON, 'utf-8'))
  console.log(`Loaded ${products.length} products, ${categories.length} top categories\n`)

  // ============================================
  // Step 1: Create brand JUKI
  // ============================================
  console.log('--- Step 1: Creating brand JUKI ---')
  let jukiBrand: { id: number }
  const existingBrand = await payload.find({
    collection: 'brands',
    where: { name: { equals: 'JUKI' } },
    limit: 1,
  })

  if (existingBrand.docs.length > 0) {
    jukiBrand = existingBrand.docs[0] as unknown as { id: number }
    console.log(`Brand JUKI already exists (id: ${jukiBrand.id})`)
  } else {
    jukiBrand = await payload.create({
      collection: 'brands',
      data: {
        name: 'JUKI',
        slug: 'juki',
        description: 'JUKI Corporation — мировой лидер в производстве промышленных швейных машин. Основана в 1938 году в Японии.',
        website: 'https://www.juki.co.jp',
        country: 'Япония',
        isOfficialDistributor: true,
      },
    }) as unknown as { id: number }
    console.log(`Created brand JUKI (id: ${jukiBrand.id})`)
  }

  // ============================================
  // Step 2: Create categories
  // ============================================
  console.log('\n--- Step 2: Creating categories ---')
  const categoryMap = new Map<string, number>() // "parentName/childName" → id

  for (const topCat of categories) {
    // Create parent category
    let parentId: number
    const existingParent = await payload.find({
      collection: 'categories',
      where: { name: { equals: topCat.name }, parent: { exists: false } },
      limit: 1,
    })

    if (existingParent.docs.length > 0) {
      parentId = (existingParent.docs[0] as unknown as { id: number }).id
    } else {
      const parent = await payload.create({
        collection: 'categories',
        data: {
          name: topCat.name,
          slug: slugify(topCat.name),
        },
      }) as unknown as { id: number }
      parentId = parent.id
    }
    categoryMap.set(topCat.name, parentId)
    console.log(`  ${topCat.name} (id: ${parentId})`)

    // Create child categories
    for (const child of topCat.children || []) {
      const key = `${topCat.name}/${child.name}`
      const existingChild = await payload.find({
        collection: 'categories',
        where: { name: { equals: child.name }, parent: { equals: parentId } },
        limit: 1,
      })

      if (existingChild.docs.length > 0) {
        categoryMap.set(key, (existingChild.docs[0] as unknown as { id: number }).id)
      } else {
        const created = await payload.create({
          collection: 'categories',
          data: {
            name: child.name,
            slug: slugify(`${topCat.name}-${child.name}`),
            parent: parentId,
          },
        }) as unknown as { id: number }
        categoryMap.set(key, created.id)
      }
      console.log(`    └─ ${child.name} (id: ${categoryMap.get(key)})`)
    }
  }

  // ============================================
  // Step 3: Upload images and create products
  // ============================================
  console.log('\n--- Step 3: Importing products ---')

  const modelToId = new Map<string, number>() // model → Payload product ID
  let created = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const progress = `[${i + 1}/${products.length}]`

    // Check if already exists
    const existing = await payload.find({
      collection: 'products',
      where: { sku: { equals: p.sku } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      modelToId.set(p.model, (existing.docs[0] as unknown as { id: number }).id)
      skipped++
      if (skipped % 50 === 0) console.log(`${progress} Skipped ${skipped} existing...`)
      continue
    }

    try {
      // Upload main image
      let mainImageId: number | undefined
      const modelDir = p.model.toLowerCase()
      const imgPath = path.join(IMAGES_DIR, modelDir)

      if (fs.existsSync(imgPath)) {
        const mainFile = fs.readdirSync(imgPath).find((f) => f.includes('_main'))
        if (mainFile) {
          const filePath = path.join(imgPath, mainFile)
          try {
            const mediaDoc = await payload.create({
              collection: 'media',
              data: {
                alt: `JUKI ${p.model}`,
              },
              file: {
                data: fs.readFileSync(filePath),
                mimetype: 'image/jpeg',
                name: mainFile,
                size: fs.statSync(filePath).size,
              },
            }) as unknown as { id: number }
            mainImageId = mediaDoc.id
          } catch {
            // Image upload failed, continue without image
          }
        }
      }

      // Find category and subcategory IDs
      const catKey = p.category
      const subCatKey = `${p.category}/${p.subcategory}`
      const categoryId = categoryMap.get(catKey)
      const subcategoryId = categoryMap.get(subCatKey)

      // Parse specifications from attributes
      const specifications = (p.attributes || []).map((attr) => ({
        name: attr.attribute_name,
        value: attr.text,
        unit: '',
      }))

      // Parse FAQ
      const faq = (p.faq || []).map((item) => ({
        question: item.question,
        answer: item.answer,
      }))

      // Determine machine type and purpose
      const machineType = MACHINE_TYPE_MAP[p.subcategory] || 'other'
      const purpose = PURPOSE_MAP[p.category] || 'apparel'

      // Determine stock status
      const inStock = p.stock_status_id === 7

      // Create the product
      const productData: Record<string, unknown> = {
        name: p.name,
        slug: slugify(p.model),
        sku: p.sku,
        brand: jukiBrand.id,
        ...(categoryId && { category: categoryId }),
        ...(subcategoryId && { subcategory: subcategoryId }),
        price: (p.price || 0) > 0 ? p.price : undefined,
        priceOnRequest: !p.price || p.price <= 0,
        shortDescription: p.name,
        specifications,
        faq,
        ...(mainImageId && { images: [mainImageId] }),
        inStock,
        machineType,
        purpose,
        oldOpencartId: p.product_id,
        oldSlug: p.seo?.seo_url || '',
      }

      const result = await payload.create({
        collection: 'products',
        data: productData as any,
      }) as unknown as { id: number }

      modelToId.set(p.model, result.id)
      created++

      if (created % 25 === 0) {
        console.log(`${progress} Created ${created} products...`)
      }
    } catch (err) {
      errors++
      console.error(`${progress} ERROR ${p.model}: ${(err as Error).message?.slice(0, 100)}`)
    }
  }

  console.log(`\nProducts: ${created} created, ${skipped} skipped, ${errors} errors`)

  // ============================================
  // Step 4: Set related products
  // ============================================
  console.log('\n--- Step 4: Setting related products ---')
  let relatedCount = 0

  for (const p of products) {
    if (!p.related_models?.length) continue
    const productId = modelToId.get(p.model)
    if (!productId) continue

    const relatedIds = p.related_models
      .map((m) => modelToId.get(m))
      .filter((id): id is number => id !== undefined)

    if (relatedIds.length > 0) {
      try {
        await payload.update({
          collection: 'products',
          id: productId,
          data: { relatedProducts: relatedIds },
        })
        relatedCount++
      } catch {
        // Skip relation errors silently
      }
    }
  }
  console.log(`Set related products on ${relatedCount} products`)

  // ============================================
  // Summary
  // ============================================
  console.log('\n=== Migration Complete ===')
  console.log(`Brand: JUKI (id: ${jukiBrand.id})`)
  console.log(`Categories: ${categoryMap.size}`)
  console.log(`Products: ${created} created, ${skipped} skipped, ${errors} errors`)
  console.log(`Related: ${relatedCount} products linked`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
