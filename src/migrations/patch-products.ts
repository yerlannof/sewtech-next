/**
 * Patch script: Fill missing data for 373 existing JUKI products in Payload CMS
 *
 * What it does:
 *   Step 1: Upload missing images (main + additional) — ~1,800 new media files
 *   Step 2: Import error codes from FAQ items with category "error_codes" — ~260 codes
 *   Step 3: Improve shortDescription (subtitle → seo.meta_description fallback)
 *   Step 4: Re-link related products (some may have been missed on first pass)
 *
 * Usage: cd ~/projects/sewtech-next && npx tsx src/migrations/patch-products.ts 2>&1 | tee /tmp/patch-products.log
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
const IMAGES_BASE = path.join(JUKI_RAG_DIR, 'output/images')

interface OpenCartProduct {
  name: string
  model: string
  sku: string
  subtitle: string
  image_main: string
  image_additional: string[]
  related_models: string[]
  faq: Array<{
    question: string
    answer: string
    category: string
  }>
  seo: {
    meta_description: string
  }
}

/** Resolve image_main/image_additional path to actual file on disk */
function resolveImagePath(catalogPath: string): string | null {
  if (!catalogPath) return null
  // image_main = "catalog/juki/ab-1351/ab-1351_main.jpg"
  // actual     = output/images/juki/ab-1351/ab-1351_main.jpg
  // Skip absolute URLs (some models have external URLs instead of local paths)
  if (catalogPath.startsWith('http')) return null
  const filePath = path.join(IMAGES_BASE, catalogPath.replace('catalog/', ''))
  return fs.existsSync(filePath) ? filePath : null
}

/** Parse error code from FAQ question text */
function parseErrorCode(question: string): string | null {
  // "Что означает ошибка E001 на JUKI AB-1351?" → "E001"
  const match = question.match(/[EeЕе][-]?\d{2,4}/)
  return match ? match[0].toUpperCase() : null
}

async function main() {
  console.log('=== SEWTECH Patch: Fill missing product data ===\n')

  const payload = await getPayload({ config })
  console.log('Payload initialized.\n')

  const sourceProducts: OpenCartProduct[] = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf-8'))
  console.log(`Loaded ${sourceProducts.length} source products\n`)

  // Build SKU → source product lookup
  const sourceMap = new Map<string, OpenCartProduct>()
  for (const p of sourceProducts) {
    sourceMap.set(p.sku, p)
  }

  // Load all existing products from Payload
  console.log('Loading existing products from DB...')
  const allProducts: Array<{ id: number; sku: string; name: string; images?: Array<{ id: number }> | null; relatedProducts?: Array<{ id: number }> | null }> = []
  let page = 1
  while (true) {
    const batch = await payload.find({
      collection: 'products',
      limit: 100,
      page,
      depth: 0,
    })
    allProducts.push(...(batch.docs as any[]))
    if (!batch.hasNextPage) break
    page++
  }
  console.log(`Found ${allProducts.length} products in DB\n`)

  // Build model → payload ID map (for related products)
  const modelToId = new Map<string, number>()
  const skuToPayloadProduct = new Map<string, { id: number; name: string; imageCount: number }>()
  for (const p of allProducts) {
    // SKU format: "JUKI-DDL-9000CF" → model: "DDL-9000CF"
    const model = p.sku.replace('JUKI-', '')
    modelToId.set(model, p.id)
    const imageCount = Array.isArray(p.images) ? p.images.length : 0
    skuToPayloadProduct.set(p.sku, { id: p.id, name: p.name, imageCount })
  }

  // ============================================
  // Step 1: Upload missing images
  // ============================================
  console.log('--- Step 1: Uploading missing images ---')
  let imagesUploaded = 0
  let productsPatched = 0
  let imageErrors = 0

  for (let i = 0; i < sourceProducts.length; i++) {
    const src = sourceProducts[i]
    const existing = skuToPayloadProduct.get(src.sku)
    if (!existing) continue

    // Skip if product already has images
    if (existing.imageCount > 0) continue

    const imageIds: number[] = []

    // Upload main image
    const mainPath = resolveImagePath(src.image_main)
    if (mainPath) {
      try {
        const mainFile = path.basename(mainPath)
        const media = await payload.create({
          collection: 'media',
          data: { alt: `JUKI ${src.model}` },
          file: {
            data: fs.readFileSync(mainPath),
            mimetype: 'image/jpeg',
            name: mainFile,
            size: fs.statSync(mainPath).size,
          },
        }) as unknown as { id: number }
        imageIds.push(media.id)
        imagesUploaded++
      } catch {
        imageErrors++
      }
    }

    // Upload additional images
    for (const addImg of src.image_additional || []) {
      const addPath = resolveImagePath(addImg)
      if (!addPath) continue
      try {
        const fileName = path.basename(addPath)
        const media = await payload.create({
          collection: 'media',
          data: { alt: `JUKI ${src.model}` },
          file: {
            data: fs.readFileSync(addPath),
            mimetype: 'image/jpeg',
            name: fileName,
            size: fs.statSync(addPath).size,
          },
        }) as unknown as { id: number }
        imageIds.push(media.id)
        imagesUploaded++
      } catch {
        imageErrors++
      }
    }

    // Link images to product
    if (imageIds.length > 0) {
      await payload.update({
        collection: 'products',
        id: existing.id,
        data: { images: imageIds } as any,
      })
      productsPatched++
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  [${i + 1}/${sourceProducts.length}] Uploaded ${imagesUploaded} images, patched ${productsPatched} products`)
    }
  }

  console.log(`\nImages: ${imagesUploaded} uploaded, ${productsPatched} products patched, ${imageErrors} errors\n`)

  // ============================================
  // Step 2: Import error codes
  // ============================================
  console.log('--- Step 2: Importing error codes ---')
  let errorCodesTotal = 0
  let errorCodeProducts = 0

  for (const src of sourceProducts) {
    const existing = skuToPayloadProduct.get(src.sku)
    if (!existing) continue

    const errorFaqs = (src.faq || []).filter((f) => f.category === 'error_codes')
    if (errorFaqs.length === 0) continue

    const errorCodes = errorFaqs.map((f) => {
      const code = parseErrorCode(f.question) || 'Unknown'
      // Description: question without the model-specific prefix
      // "Что означает ошибка E001 на JUKI AB-1351?" → keep full question as description
      return {
        code,
        description: f.question,
        solution: f.answer,
      }
    })

    try {
      await payload.update({
        collection: 'products',
        id: existing.id,
        data: { errorCodes } as any,
      })
      errorCodesTotal += errorCodes.length
      errorCodeProducts++
    } catch (err) {
      console.error(`  Error setting error codes for ${src.model}: ${(err as Error).message?.slice(0, 80)}`)
    }
  }

  console.log(`Error codes: ${errorCodesTotal} codes on ${errorCodeProducts} products\n`)

  // ============================================
  // Step 3: Improve shortDescription
  // ============================================
  console.log('--- Step 3: Improving shortDescription ---')
  let descUpdated = 0

  for (const src of sourceProducts) {
    const existing = skuToPayloadProduct.get(src.sku)
    if (!existing) continue

    // Use subtitle (best), or seo.meta_description (fallback)
    const shortDescription = src.subtitle || src.seo?.meta_description || ''
    if (!shortDescription || shortDescription === existing.name) continue

    try {
      await payload.update({
        collection: 'products',
        id: existing.id,
        data: { shortDescription } as any,
      })
      descUpdated++
    } catch (err) {
      console.error(`  Error updating shortDescription for ${src.model}: ${(err as Error).message?.slice(0, 80)}`)
    }
  }

  console.log(`Short descriptions: ${descUpdated} updated\n`)

  // ============================================
  // Step 4: Re-link related products
  // ============================================
  console.log('--- Step 4: Re-linking related products ---')
  let relatedUpdated = 0
  let relatedNewLinks = 0

  for (const src of sourceProducts) {
    if (!src.related_models?.length) continue
    const existing = skuToPayloadProduct.get(src.sku)
    if (!existing) continue

    const relatedIds = src.related_models
      .map((m) => modelToId.get(m))
      .filter((id): id is number => id !== undefined)

    if (relatedIds.length === 0) continue

    // Get current related products
    const current = allProducts.find((p) => p.id === existing.id)
    const currentRelated = Array.isArray(current?.relatedProducts)
      ? (current.relatedProducts as Array<{ id: number } | number>).map((r) => typeof r === 'number' ? r : r.id)
      : []

    // Only update if there are new relations
    const merged = [...new Set([...currentRelated, ...relatedIds])]
    if (merged.length > currentRelated.length) {
      try {
        await payload.update({
          collection: 'products',
          id: existing.id,
          data: { relatedProducts: merged } as any,
        })
        relatedNewLinks += merged.length - currentRelated.length
        relatedUpdated++
      } catch {
        // Skip silently
      }
    }
  }

  console.log(`Related products: ${relatedUpdated} products updated, ${relatedNewLinks} new links\n`)

  // ============================================
  // Summary
  // ============================================
  console.log('=== Patch Complete ===')
  console.log(`Images:           ${imagesUploaded} uploaded → ${productsPatched} products`)
  console.log(`Error codes:      ${errorCodesTotal} codes → ${errorCodeProducts} products`)
  console.log(`Descriptions:     ${descUpdated} updated`)
  console.log(`Related products: ${relatedNewLinks} new links on ${relatedUpdated} products`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Patch failed:', err)
  process.exit(1)
})
