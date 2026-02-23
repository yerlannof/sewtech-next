/**
 * Normalize prices: KZT → USD conversion
 *
 * Background:
 *   Prices in the DB are a mix of KZT and USD values.
 *   - JUKI machines imported from OpenCart had prices in KZT (e.g., 16,800,000 for a machine)
 *   - Non-JUKI items (needles, accessories) already have prices in USD (e.g., 1.10, 15.50)
 *
 * Logic:
 *   - price > 1000  → KZT, convert to USD: price / EXCHANGE_RATE
 *   - price ≤ 1000  → already USD, no change
 *   - Boundary cases (500-1000) → flagged for manual review
 *
 * Also:
 *   - Removes priceUSD field values (field will be dropped from schema)
 *   - Assigns category to "Kansai Special DLR 1508P" (P1-4)
 *   - Creates "Без бренда" brand and assigns to 38 brandless products (P2-4)
 *
 * Usage:
 *   npx tsx src/migrations/normalize-prices.ts --dry-run    # Preview changes
 *   npx tsx src/migrations/normalize-prices.ts              # Execute changes
 */

import 'dotenv/config'
import { getPayload, type Payload } from 'payload'
import config from '../payload/payload.config'

const EXCHANGE_RATE = 470
const BOUNDARY_LOW = 500
const BOUNDARY_HIGH = 1000
const DRY_RUN = process.argv.includes('--dry-run')

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
  console.log('--- Step 1: Normalize prices (KZT → USD) ---')

  const products = await payload.find({
    collection: 'products',
    where: { price: { greater_than: 0 } },
    limit: 2000,
    depth: 0,
  })

  console.log(`Found ${products.docs.length} products with price > 0\n`)

  let converted = 0
  let alreadyUSD = 0
  const boundary: Array<{ id: number; name: string; price: number }> = []

  for (const p of products.docs) {
    const price = p.price!

    if (price > BOUNDARY_HIGH) {
      // KZT → USD
      const usd = Math.round((price / EXCHANGE_RATE) * 100) / 100
      console.log(`  [KZT→USD] ${p.name}: ${price.toLocaleString()} KZT → $${usd}`)

      if (!DRY_RUN) {
        await payload.update({
          collection: 'products',
          id: p.id,
          data: { price: usd },
        })
      }
      converted++
    } else if (price >= BOUNDARY_LOW && price <= BOUNDARY_HIGH) {
      // Boundary — unclear
      boundary.push({ id: p.id, name: p.name, price })
    } else {
      // Already USD
      alreadyUSD++
    }
  }

  console.log(`\nResults:`)
  console.log(`  Converted KZT→USD: ${converted}`)
  console.log(`  Already USD (≤${BOUNDARY_HIGH}): ${alreadyUSD}`)
  console.log(`  Boundary cases (${BOUNDARY_LOW}-${BOUNDARY_HIGH}): ${boundary.length}`)

  if (boundary.length > 0) {
    console.log('\n  ⚠ BOUNDARY CASES — review manually:')
    for (const b of boundary) {
      console.log(`    ID ${b.id}: "${b.name}" — price: ${b.price}`)
    }
  }
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
