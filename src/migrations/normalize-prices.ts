/**
 * Normalize prices: KZT → USD conversion (JUKI only)
 *
 * Background:
 *   JUKI prices came from data/knowledge/prices.json (field: price_kzt) → in KZT
 *   Non-JUKI prices came from data/opencart/products.json → already in USD
 *
 * Logic:
 *   - Load JUKI model list from prices.json
 *   - Only convert products that match JUKI price list models
 *   - Non-JUKI products are NEVER touched
 *
 * Also:
 *   - Assigns category to "Kansai Special DLR 1508P" (P1-4)
 *   - Creates "Без бренда" brand and assigns to brandless products (P2-4)
 *
 * Usage:
 *   npx tsx src/migrations/normalize-prices.ts --dry-run    # Preview changes
 *   npx tsx src/migrations/normalize-prices.ts              # Execute changes
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload, type Payload } from 'payload'
import config from '../payload/payload.config'

const EXCHANGE_RATE = 470
const DRY_RUN = process.argv.includes('--dry-run')
const JUKI_PRICES_PATH = '/home/yerla/projects/juki-rag-project/data/knowledge/prices.json'

async function main() {
  console.log(`\n=== Normalize Prices Migration ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`)
  console.log(`Exchange rate: 1 USD = ${EXCHANGE_RATE} KZT\n`)

  const payload = await getPayload({ config })

  await normalizePrices(payload)
  await fixKansaiCategory(payload)
  await fixBrandlessProducts(payload)

  console.log('\n=== Migration complete ===')
  process.exit(0)
}

async function normalizePrices(payload: Payload) {
  console.log('--- Step 1: Normalize JUKI prices (KZT → USD) ---')

  // Load JUKI price list to know which models have KZT prices
  if (!fs.existsSync(JUKI_PRICES_PATH)) {
    console.log(`  ⚠ JUKI prices file not found: ${JUKI_PRICES_PATH}`)
    console.log('  Skipping price normalization')
    return
  }

  const jukiPrices: Array<{ model: string; price_kzt: number }> = JSON.parse(
    fs.readFileSync(JUKI_PRICES_PATH, 'utf-8'),
  )

  // Build set of JUKI models that have KZT prices
  const jukiModels = new Set<string>()
  for (const jp of jukiPrices) {
    // Normalize: "DDL-8100e" → "ddl-8100e", "DDL-7000 AH" → "ddl-7000ah"
    const normalized = jp.model.replace(/\s+/g, '').toLowerCase()
    jukiModels.add(normalized)
  }
  console.log(`  JUKI models with KZT prices: ${jukiModels.size}`)

  // Fetch products with prices that look like KZT (> 100,000)
  const products = await payload.find({
    collection: 'products',
    where: { price: { greater_than: 100000 } },
    limit: 2000,
    depth: 0,
  })

  console.log(`  Products with price > 100,000: ${products.docs.length}\n`)

  let converted = 0
  let skipped = 0

  for (const p of products.docs) {
    const price = p.price!
    const usd = Math.round((price / EXCHANGE_RATE) * 100) / 100

    // Verify this is a JUKI product by checking name or SKU
    const nameHasJuki = p.name.toUpperCase().includes('JUKI')
    const skuNormalized = (p.sku || '').replace(/\s+/g, '').toLowerCase()
    const nameModel = p.name.replace(/^Швейная машина JUKI\s*/i, '').replace(/\s+/g, '').toLowerCase()
    const isJukiModel = jukiModels.has(skuNormalized) || jukiModels.has(nameModel)

    if (nameHasJuki || isJukiModel) {
      console.log(`  [KZT→USD] ${p.name}: ${price.toLocaleString()} KZT → $${usd}`)
      if (!DRY_RUN) {
        await payload.update({
          collection: 'products',
          id: p.id,
          data: { price: usd },
        })
      }
      converted++
    } else {
      console.log(`  [SKIP] ${p.name}: $${price} (not JUKI, already USD)`)
      skipped++
    }
  }

  console.log(`\nResults:`)
  console.log(`  Converted JUKI KZT→USD: ${converted}`)
  console.log(`  Skipped (not JUKI): ${skipped}`)
}

async function fixKansaiCategory(payload: Payload) {
  console.log('\n--- Step 2: Fix Kansai Special DLR 1508P category ---')

  const result = await payload.find({
    collection: 'products',
    where: {
      or: [
        { name: { contains: 'DLR 1508P' } },
        { name: { contains: 'DLR-1508P' } },
        { sku: { contains: 'DLR-1508P' } },
      ],
    },
    depth: 1,
    limit: 5,
  })

  if (!result.docs.length) {
    console.log('  Product not found, skipping')
    return
  }

  for (const product of result.docs) {
    if (product.category) {
      console.log(`  "${product.name}" already has category, skipping`)
      continue
    }

    // Find a suitable category (coverstitch / interlock)
    const cats = await payload.find({
      collection: 'categories',
      where: {
        or: [
          { slug: { contains: 'rasposhivalnaya' } },
          { slug: { contains: 'coverstitch' } },
          { name: { contains: 'Распошивальная' } },
        ],
      },
      limit: 5,
    })

    if (cats.docs.length > 0) {
      const cat = cats.docs[0]
      console.log(`  Assigning "${product.name}" → category "${cat.name}"`)
      if (!DRY_RUN) {
        await payload.update({
          collection: 'products',
          id: product.id,
          data: { category: cat.id },
        })
      }
    } else {
      console.log(`  No coverstitch category found for "${product.name}"`)
    }
  }
}

async function fixBrandlessProducts(payload: Payload) {
  console.log('\n--- Step 3: Fix brandless products ---')

  const brandless = await payload.find({
    collection: 'products',
    where: { brand: { exists: false } },
    limit: 200,
    depth: 0,
  })

  console.log(`  Found ${brandless.docs.length} products without brand`)

  if (brandless.docs.length === 0) return

  // Find or create "Без бренда" brand
  let noBrand = await payload.find({
    collection: 'brands',
    where: {
      or: [
        { slug: { equals: 'bez-brenda' } },
        { name: { equals: 'Без бренда' } },
      ],
    },
    limit: 1,
  })

  let brandId: number

  if (noBrand.docs.length > 0) {
    brandId = noBrand.docs[0].id
    console.log(`  Found existing "Без бренда" brand (id: ${brandId})`)
  } else {
    console.log(`  Creating "Без бренда" brand`)
    if (!DRY_RUN) {
      const created = await payload.create({
        collection: 'brands',
        data: {
          name: 'Без бренда',
          slug: 'bez-brenda',
        },
      })
      brandId = created.id
    } else {
      brandId = 0
    }
  }

  if (!DRY_RUN && brandId) {
    let assigned = 0
    for (const p of brandless.docs) {
      await payload.update({
        collection: 'products',
        id: p.id,
        data: { brand: brandId },
      })
      assigned++
    }
    console.log(`  Assigned "Без бренда" to ${assigned} products`)
  } else {
    console.log(`  Would assign "Без бренда" to ${brandless.docs.length} products`)
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
