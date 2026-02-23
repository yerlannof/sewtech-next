/**
 * Full migration: Import ALL data from OpenCart SQL dump into Payload CMS
 *
 * Steps:
 *   1. Create brands (45)
 *   2. Create/update categories (~41 new)
 *   3. Patch JUKI products with descriptionHtml (373)
 *   4. Upload non-JUKI images (~600 files)
 *   5. Create non-JUKI products (~380)
 *   6. Link related products (JUKI)
 *   7. Import SEO redirects
 *
 * Prerequisites:
 *   - python3 scripts/extract-opencart-data.py  (produces data/opencart/*.json)
 *   - python3 scripts/download-opencart-images.py (downloads images)
 *   - PostgreSQL running (docker compose up -d)
 *   - Dev server NOT running
 *
 * Usage:
 *   cd ~/projects/sewtech-next
 *   npx tsx src/migrations/full-import.ts 2>&1 | tee /tmp/full-import.log
 */

import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { getPayload, type Payload } from 'payload'
import config from '../payload/payload.config'

const PROJECT_ROOT = '/home/yerla/projects/sewtech-next'
const OC_DATA_DIR = path.join(PROJECT_ROOT, 'data/opencart')
const OC_IMAGES_DIR = path.join(OC_DATA_DIR, 'images')
const JUKI_RAG_DIR = '/home/yerla/projects/juki-rag-project'
const JUKI_PRODUCTS_JSON = path.join(JUKI_RAG_DIR, 'output/opencart_import/products.json')
const JUKI_IMAGES_DIR = path.join(JUKI_RAG_DIR, 'output/images')

const JUKI_MANUFACTURER_ID = 6

// ---------- Interfaces ----------

interface OCBrand {
  id: number
  name: string
  logo_path: string | null
  sort_order: number
}

interface OCCategory {
  id: number
  name: string
  parent_id: number | null
  sort_order: number
  status: number
  description: string
  meta_title: string
  meta_description: string
}

interface OCProduct {
  id: number
  name: string
  model: string
  sku: string
  manufacturer_id: number
  price: number
  quantity: number
  stock_status_id: number
  weight: number
  image: string | null
  additional_images: string[]
  category_id: number | null
  all_category_ids: number[]
  attributes: Array<{ attribute_id: number; name: string; value: string }>
  description_ru: string
  description_en: string
  tags: string
  meta_title: string
  meta_description: string
  meta_keyword: string
  seo_url: string
  sort_order: number
}

interface JUKIProduct {
  name: string
  model: string
  sku: string
  description: string
  image_main: string
  image_additional: string[]
  related_models: string[]
}

interface URLAlias {
  query: string
  keyword: string
}

// ---------- Helpers ----------

function slugify(text: string): string {
  const cyrMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  }
  return text
    .toLowerCase()
    .replace(/[а-яёА-ЯЁ]/g, (ch) => cyrMap[ch.toLowerCase()] || ch)
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function loadJSON<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(OC_DATA_DIR, filename), 'utf-8'))
}

async function uploadImage(
  payload: Payload,
  filePath: string,
  alt: string,
): Promise<number | null> {
  if (!fs.existsSync(filePath)) return null
  const stat = fs.statSync(filePath)
  if (stat.size === 0) return null

  const ext = path.extname(filePath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  }
  const mimetype = mimeMap[ext] || 'image/jpeg'

  try {
    const media = await payload.create({
      collection: 'media',
      data: { alt },
      file: {
        data: fs.readFileSync(filePath),
        mimetype,
        name: path.basename(filePath),
        size: stat.size,
      },
    })
    return media.id as number
  } catch {
    return null
  }
}

async function findAllProducts(payload: Payload): Promise<Array<{ id: number; sku: string | null; name: string }>> {
  const all: Array<{ id: number; sku: string | null; name: string }> = []
  let page = 1
  while (true) {
    const batch = await payload.find({
      collection: 'products',
      limit: 100,
      page,
      depth: 0,
    })
    all.push(...(batch.docs as any[]))
    if (!batch.hasNextPage) break
    page++
  }
  return all
}

// ---------- Step 1: Create Brands ----------

async function step1_createBrands(payload: Payload): Promise<Map<number, number>> {
  console.log('\n=== Step 1: Creating brands ===')
  const brands: OCBrand[] = loadJSON('brands.json')
  const ocToPayload = new Map<number, number>() // oc_manufacturer_id → payload brand id

  for (const brand of brands) {
    // Skip JUKI (already exists)
    if (brand.id === JUKI_MANUFACTURER_ID) {
      const existing = await payload.find({
        collection: 'brands',
        where: { name: { equals: 'JUKI' } },
        limit: 1,
      })
      if (existing.docs.length > 0) {
        ocToPayload.set(brand.id, existing.docs[0].id as number)
        console.log(`  JUKI: exists (id: ${existing.docs[0].id})`)
      }
      continue
    }

    // Check if brand already exists
    const existing = await payload.find({
      collection: 'brands',
      where: { name: { equals: brand.name } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      ocToPayload.set(brand.id, existing.docs[0].id as number)
      continue
    }

    // Upload logo if exists
    let logoId: number | null = null
    if (brand.logo_path) {
      const logoPath = path.join(OC_IMAGES_DIR, brand.logo_path)
      logoId = await uploadImage(payload, logoPath, brand.name)
    }

    try {
      const created = await payload.create({
        collection: 'brands',
        data: {
          name: brand.name,
          slug: slugify(brand.name),
          ...(logoId && { logo: logoId }),
        },
      })
      ocToPayload.set(brand.id, created.id as number)
    } catch (err) {
      console.error(`  ERROR creating brand ${brand.name}: ${(err as Error).message?.slice(0, 80)}`)
    }
  }

  console.log(`  Brands mapped: ${ocToPayload.size}`)
  return ocToPayload
}

// ---------- Step 2: Create/update categories ----------

async function step2_createCategories(payload: Payload): Promise<Map<number, number>> {
  console.log('\n=== Step 2: Creating categories ===')
  const categories: OCCategory[] = loadJSON('categories.json')
  const ocToPayload = new Map<number, number>() // oc_category_id → payload category id

  // Load existing categories from Payload
  const existingCats: Array<{ id: number; name: string; slug: string; parent?: { id: number } | number | null }> = []
  let page = 1
  while (true) {
    const batch = await payload.find({
      collection: 'categories',
      limit: 100,
      page,
      depth: 0,
    })
    existingCats.push(...(batch.docs as any[]))
    if (!batch.hasNextPage) break
    page++
  }

  // Build name → payload id map for existing categories
  const existingByName = new Map<string, number>()
  for (const cat of existingCats) {
    existingByName.set(cat.name, cat.id)
  }

  // First pass: create top-level categories
  const topCats = categories.filter((c) => c.parent_id === null && c.status === 1)
  for (const cat of topCats) {
    const existingId = existingByName.get(cat.name)
    if (existingId) {
      ocToPayload.set(cat.id, existingId)
      continue
    }

    try {
      const created = await payload.create({
        collection: 'categories',
        data: {
          name: cat.name,
          slug: slugify(cat.name),
          sortOrder: cat.sort_order,
          ...(cat.description && { description: cat.description }),
        },
      })
      ocToPayload.set(cat.id, created.id as number)
      existingByName.set(cat.name, created.id as number)
    } catch (err) {
      console.error(`  ERROR creating category ${cat.name}: ${(err as Error).message?.slice(0, 80)}`)
    }
  }

  // Second pass: create subcategories
  const subCats = categories.filter((c) => c.parent_id !== null && c.status === 1)
  for (const cat of subCats) {
    const parentPayloadId = ocToPayload.get(cat.parent_id!)
    if (!parentPayloadId) {
      // Parent may be disabled — skip
      continue
    }

    const existingId = existingByName.get(cat.name)
    if (existingId) {
      ocToPayload.set(cat.id, existingId)
      continue
    }

    try {
      const created = await payload.create({
        collection: 'categories',
        data: {
          name: cat.name,
          slug: slugify(cat.name),
          parent: parentPayloadId,
          sortOrder: cat.sort_order,
          ...(cat.description && { description: cat.description }),
        },
      })
      ocToPayload.set(cat.id, created.id as number)
      existingByName.set(cat.name, created.id as number)
    } catch (err) {
      // Slug collision — try with parent prefix
      try {
        const parentCat = categories.find((c) => c.id === cat.parent_id)
        const prefixedSlug = slugify(`${parentCat?.name || ''}-${cat.name}`)
        const created = await payload.create({
          collection: 'categories',
          data: {
            name: cat.name,
            slug: prefixedSlug,
            parent: parentPayloadId,
            sortOrder: cat.sort_order,
          },
        })
        ocToPayload.set(cat.id, created.id as number)
        existingByName.set(cat.name, created.id as number)
      } catch {
        console.error(`  ERROR creating subcategory ${cat.name}: ${(err as Error).message?.slice(0, 80)}`)
      }
    }
  }

  console.log(`  Categories mapped: ${ocToPayload.size} (of ${categories.length} total)`)
  return ocToPayload
}

// ---------- Step 3: Patch JUKI descriptionHtml ----------

async function step3_patchJukiDescriptions(payload: Payload): Promise<void> {
  console.log('\n=== Step 3: Patching JUKI products with descriptionHtml ===')

  const jukiProducts: JUKIProduct[] = JSON.parse(fs.readFileSync(JUKI_PRODUCTS_JSON, 'utf-8'))
  console.log(`  Loaded ${jukiProducts.length} JUKI products from products.json`)

  // Load all existing Payload products (JUKI)
  const allProducts = await findAllProducts(payload)
  const skuToId = new Map<string, number>()
  for (const p of allProducts) {
    if (p.sku) skuToId.set(p.sku, p.id)
  }

  // Build a map of existing media filenames → URLs for inline image replacement
  console.log('  Building media filename → URL map...')
  const mediaMap = new Map<string, string>() // filename → url
  let mediaPage = 1
  while (true) {
    const batch = await payload.find({
      collection: 'media',
      limit: 100,
      page: mediaPage,
      depth: 0,
    })
    for (const m of batch.docs as any[]) {
      if (m.filename && m.url) {
        mediaMap.set(m.filename, m.url)
      }
    }
    if (!batch.hasNextPage) break
    mediaPage++
  }
  console.log(`  Media map: ${mediaMap.size} entries`)

  let patched = 0
  let skipped = 0

  for (let i = 0; i < jukiProducts.length; i++) {
    const jp = jukiProducts[i]
    const payloadId = skuToId.get(jp.sku)
    if (!payloadId) {
      skipped++
      continue
    }

    let html = jp.description
    if (!html) {
      skipped++
      continue
    }

    // Replace inline image paths: image/catalog/juki/model/file.jpg → /api/media/file/filename
    html = html.replace(/src="image\/catalog\/juki\/[^"]*\/([^"]+)"/g, (match, filename) => {
      const mediaUrl = mediaMap.get(filename)
      if (mediaUrl) {
        return `src="${mediaUrl}"`
      }
      // Fallback: try with different extensions or case
      const baseName = filename.replace(/\.[^.]+$/, '')
      for (const [mFilename, mUrl] of mediaMap) {
        if (mFilename.startsWith(baseName)) {
          return `src="${mUrl}"`
        }
      }
      return match // Leave as-is if not found
    })

    try {
      await payload.update({
        collection: 'products',
        id: payloadId,
        data: { descriptionHtml: html } as any,
      })
      patched++
    } catch (err) {
      console.error(`  ERROR patching ${jp.model}: ${(err as Error).message?.slice(0, 80)}`)
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  [${i + 1}/${jukiProducts.length}] Patched: ${patched}`)
    }
  }

  console.log(`  JUKI descriptions: ${patched} patched, ${skipped} skipped`)
}

// ---------- Step 4: Upload non-JUKI images ----------

async function step4_uploadNonJukiImages(
  payload: Payload,
  products: OCProduct[],
): Promise<Map<number, number[]>> {
  console.log('\n=== Step 4: Uploading non-JUKI images ===')

  const productImageIds = new Map<number, number[]>() // oc_product_id → [media_id, ...]

  let uploaded = 0
  let failed = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const imageIds: number[] = []

    // Main image
    if (p.image) {
      const imgPath = path.join(OC_IMAGES_DIR, p.image)
      const mediaId = await uploadImage(payload, imgPath, p.name)
      if (mediaId) {
        imageIds.push(mediaId)
        uploaded++
      } else {
        failed++
      }
    }

    // Additional images
    for (const addImg of p.additional_images) {
      const imgPath = path.join(OC_IMAGES_DIR, addImg)
      const mediaId = await uploadImage(payload, imgPath, p.name)
      if (mediaId) {
        imageIds.push(mediaId)
        uploaded++
      } else {
        failed++
      }
    }

    if (imageIds.length > 0) {
      productImageIds.set(p.id, imageIds)
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  [${i + 1}/${products.length}] Uploaded: ${uploaded}, Failed: ${failed}`)
    }
  }

  console.log(`  Images: ${uploaded} uploaded, ${failed} failed`)
  return productImageIds
}

// ---------- Step 5: Create non-JUKI products ----------

async function step5_createNonJukiProducts(
  payload: Payload,
  products: OCProduct[],
  brandMap: Map<number, number>,
  categoryMap: Map<number, number>,
  imageMap: Map<number, number[]>,
): Promise<Map<number, number>> {
  console.log('\n=== Step 5: Creating non-JUKI products ===')

  const ocToPayload = new Map<number, number>() // oc_product_id → payload product id
  let created = 0
  let skipped = 0
  let errors = 0

  // Build existing SKU set to skip duplicates
  const allProducts = await findAllProducts(payload)
  const existingSKUs = new Set<string>()
  const existingSlugs = new Set<string>()
  for (const p of allProducts) {
    if (p.sku) existingSKUs.add(p.sku)
  }

  for (let i = 0; i < products.length; i++) {
    const p = products[i]

    // Skip if already exists
    if (existingSKUs.has(p.sku) || existingSKUs.has(p.model)) {
      skipped++
      continue
    }

    try {
      const brandId = brandMap.get(p.manufacturer_id)
      const categoryId = p.category_id ? categoryMap.get(p.category_id) : undefined
      const imageIds = imageMap.get(p.id) || []

      // Build specifications from attributes
      const specifications = p.attributes.map((attr) => ({
        name: attr.name,
        value: attr.value,
        unit: '',
      }))

      // Determine stock status
      const inStock = p.stock_status_id === 7 || p.quantity > 0

      // Use RU description, fallback EN
      const descriptionHtml = p.description_ru || p.description_en || ''

      // Build short description from meta_description or strip HTML from description
      let shortDescription = p.meta_description || ''
      if (!shortDescription && descriptionHtml) {
        // Strip HTML tags for short description
        shortDescription = descriptionHtml
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 300)
      }

      // Generate slug — ensure uniqueness
      let slug = p.seo_url || slugify(p.model || p.name)
      if (existingSlugs.has(slug)) {
        slug = `${slug}-${p.id}`
      }
      existingSlugs.add(slug)

      const productData: Record<string, unknown> = {
        name: p.name,
        slug,
        sku: p.sku || p.model,
        ...(brandId && { brand: brandId }),
        ...(categoryId && { category: categoryId }),
        ...(p.price > 0 && { price: p.price }),
        priceOnRequest: p.price <= 0,
        shortDescription,
        ...(descriptionHtml && { descriptionHtml }),
        specifications,
        ...(imageIds.length > 0 && { images: imageIds }),
        inStock,
        oldOpencartId: p.id,
        oldSlug: p.seo_url || '',
        ...(p.meta_title && p.meta_title !== p.name && {
          meta: {
            title: p.meta_title,
            description: p.meta_description || '',
          },
        }),
      }

      const result = await payload.create({
        collection: 'products',
        data: productData as any,
      })

      ocToPayload.set(p.id, result.id as number)
      existingSKUs.add(p.sku || p.model)
      created++

      if (created % 25 === 0) {
        console.log(`  [${i + 1}/${products.length}] Created: ${created}`)
      }
    } catch (err) {
      errors++
      const msg = (err as Error).message || ''
      if (!msg.includes('unique')) {
        console.error(`  ERROR ${p.model}: ${msg.slice(0, 100)}`)
      }
    }
  }

  console.log(`  Products: ${created} created, ${skipped} skipped, ${errors} errors`)
  return ocToPayload
}

// ---------- Step 6: Link related products (JUKI) ----------

async function step6_linkRelatedProducts(payload: Payload): Promise<void> {
  console.log('\n=== Step 6: Linking JUKI related products ===')

  const jukiProducts: JUKIProduct[] = JSON.parse(fs.readFileSync(JUKI_PRODUCTS_JSON, 'utf-8'))

  // Build model → payload id map
  const allProducts = await findAllProducts(payload)
  const skuToId = new Map<string, number>()
  for (const p of allProducts) {
    if (p.sku) {
      skuToId.set(p.sku, p.id)
      // Also map by model (sku without prefix)
      const model = p.sku.replace('JUKI-', '')
      skuToId.set(model, p.id)
    }
  }

  let linked = 0
  for (const jp of jukiProducts) {
    if (!jp.related_models?.length) continue
    const productId = skuToId.get(jp.sku) || skuToId.get(jp.model)
    if (!productId) continue

    const relatedIds = jp.related_models
      .map((m) => skuToId.get(m))
      .filter((id): id is number => id !== undefined)

    if (relatedIds.length > 0) {
      try {
        await payload.update({
          collection: 'products',
          id: productId,
          data: { relatedProducts: relatedIds } as any,
        })
        linked++
      } catch {
        // Skip silently
      }
    }
  }

  console.log(`  Related products: ${linked} products linked`)
}

// ---------- Step 7: Import SEO redirects ----------

async function step7_importRedirects(
  payload: Payload,
  ocProductMap: Map<number, number>,
): Promise<void> {
  console.log('\n=== Step 7: Importing SEO redirects ===')

  const urlAliases: URLAlias[] = loadJSON('url_aliases.json')
  let created = 0

  // Only import product redirects
  for (const alias of urlAliases) {
    const match = alias.query.match(/^product_id=(\d+)$/)
    if (!match) continue

    const ocId = parseInt(match[1])
    const payloadId = ocProductMap.get(ocId)
    if (!payloadId) continue

    // Find the product's current slug
    try {
      const product = await payload.findByID({
        collection: 'products',
        id: payloadId,
        depth: 0,
      })

      if (!product?.slug) continue

      const from = `/${alias.keyword}`
      const to = `/product/${(product as any).slug}`

      if (from === to) continue

      // Check if redirect already exists
      const existing = await payload.find({
        collection: 'redirects',
        where: { from: { equals: from } },
        limit: 1,
      })
      if (existing.docs.length > 0) continue

      await payload.create({
        collection: 'redirects',
        data: {
          from,
          to: { type: 'custom', url: to },
        } as any,
      })
      created++
    } catch {
      // Redirects collection may not support this format — skip
    }
  }

  console.log(`  Redirects: ${created} created`)
}

// ---------- Main ----------

async function main() {
  console.log('=== SEWTECH Full Migration: OpenCart → Payload CMS ===')
  console.log(`Date: ${new Date().toISOString()}\n`)

  // Verify data files exist
  const requiredFiles = ['brands.json', 'categories.json', 'products.json']
  for (const file of requiredFiles) {
    const filePath = path.join(OC_DATA_DIR, file)
    if (!fs.existsSync(filePath)) {
      console.error(`ERROR: ${filePath} not found. Run extract-opencart-data.py first.`)
      process.exit(1)
    }
  }

  if (!fs.existsSync(JUKI_PRODUCTS_JSON)) {
    console.error(`ERROR: ${JUKI_PRODUCTS_JSON} not found.`)
    process.exit(1)
  }

  // Initialize Payload
  console.log('Initializing Payload...')
  const payload = await getPayload({ config })
  console.log('Payload initialized.\n')

  // Load OpenCart products
  const ocProducts: OCProduct[] = loadJSON('products.json')
  console.log(`Non-JUKI products to import: ${ocProducts.length}`)

  // Step 1: Brands
  const brandMap = await step1_createBrands(payload)

  // Step 2: Categories
  const categoryMap = await step2_createCategories(payload)

  // Step 3: JUKI descriptions
  await step3_patchJukiDescriptions(payload)

  // Step 4: Upload non-JUKI images
  const imageMap = await step4_uploadNonJukiImages(payload, ocProducts)

  // Step 5: Create non-JUKI products
  const ocProductMap = await step5_createNonJukiProducts(
    payload, ocProducts, brandMap, categoryMap, imageMap,
  )

  // Step 6: Related products
  await step6_linkRelatedProducts(payload)

  // Step 7: Redirects
  await step7_importRedirects(payload, ocProductMap)

  // ---------- Summary ----------
  console.log('\n=== Migration Summary ===')

  // Count totals
  const allProducts = await findAllProducts(payload)
  console.log(`Total products in DB: ${allProducts.length}`)

  let brandCount = 0
  let brandPage = 1
  while (true) {
    const batch = await payload.find({ collection: 'brands', limit: 100, page: brandPage, depth: 0 })
    brandCount += batch.docs.length
    if (!batch.hasNextPage) break
    brandPage++
  }
  console.log(`Total brands: ${brandCount}`)

  let catCount = 0
  let catPage = 1
  while (true) {
    const batch = await payload.find({ collection: 'categories', limit: 100, page: catPage, depth: 0 })
    catCount += batch.docs.length
    if (!batch.hasNextPage) break
    catPage++
  }
  console.log(`Total categories: ${catCount}`)

  let mediaCount = 0
  let mPage = 1
  while (true) {
    const batch = await payload.find({ collection: 'media', limit: 100, page: mPage, depth: 0 })
    mediaCount += batch.docs.length
    if (!batch.hasNextPage) break
    mPage++
  }
  console.log(`Total media: ${mediaCount}`)

  console.log('\nDone!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
