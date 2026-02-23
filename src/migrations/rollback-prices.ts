/**
 * Rollback wrongly converted non-JUKI prices
 *
 * Problem: normalize-prices.ts converted ALL prices > 1000 as KZT,
 * but non-JUKI products (from OpenCart) were already in USD.
 *
 * Fix: Restore original USD prices from data/opencart/products.json
 * for all non-JUKI products. JUKI prices (from prices.json KZT) stay converted.
 *
 * Usage:
 *   npx tsx src/migrations/rollback-prices.ts --dry-run
 *   npx tsx src/migrations/rollback-prices.ts
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload/payload.config'

const DRY_RUN = process.argv.includes('--dry-run')
const PROJECT_ROOT = '/home/yerla/projects/sewtech-next'

interface OpenCartProduct {
  id: number
  name: string
  model: string
  sku: string
  price: number
}

async function main() {
  console.log(`\n=== Rollback Non-JUKI Prices ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`)

  // Load OpenCart source data (prices are in USD)
  const ocPath = path.join(PROJECT_ROOT, 'data/opencart/products.json')
  const ocProducts: OpenCartProduct[] = JSON.parse(fs.readFileSync(ocPath, 'utf-8'))

  // Build lookup: name → original USD price (only products with price > 0)
  const ocPriceByName = new Map<string, number>()
  const ocPriceBySku = new Map<string, number>()
  for (const p of ocProducts) {
    if (p.price > 0) {
      ocPriceByName.set(p.name.trim().toLowerCase(), p.price)
      if (p.sku) ocPriceBySku.set(p.sku.trim().toLowerCase(), p.price)
      if (p.model) ocPriceBySku.set(p.model.trim().toLowerCase(), p.price)
    }
  }
  console.log(`OpenCart products with prices: ${ocPriceByName.size}`)

  const payload = await getPayload({ config })

  // Fetch all products with price > 0
  const allProducts = await payload.find({
    collection: 'products',
    where: { price: { greater_than: 0 } },
    limit: 2000,
    depth: 0,
  })

  console.log(`Payload products with price > 0: ${allProducts.docs.length}\n`)

  let restored = 0
  let skippedJuki = 0
  let skippedNoMatch = 0
  let skippedSamePrice = 0

  for (const p of allProducts.docs) {
    const nameKey = p.name.trim().toLowerCase()
    const skuKey = (p.sku || '').trim().toLowerCase()

    // Try to find original OpenCart price
    const originalPrice = ocPriceByName.get(nameKey) || ocPriceBySku.get(skuKey)

    if (!originalPrice) {
      // Not in OpenCart → likely JUKI from prices.json → skip (conversion was correct)
      skippedJuki++
      continue
    }

    // Compare current price with original
    const currentPrice = p.price!
    const diff = Math.abs(currentPrice - originalPrice)

    if (diff < 0.01) {
      // Already correct
      skippedSamePrice++
      continue
    }

    console.log(`  [RESTORE] ${p.name.substring(0, 60)}`)
    console.log(`            current: $${currentPrice}  →  original: $${originalPrice}`)

    if (!DRY_RUN) {
      await payload.update({
        collection: 'products',
        id: p.id,
        data: { price: originalPrice },
      })
    }
    restored++
  }

  console.log(`\n=== Results ===`)
  console.log(`  Restored to original USD: ${restored}`)
  console.log(`  Skipped (JUKI, no OpenCart match): ${skippedJuki}`)
  console.log(`  Skipped (price already correct): ${skippedSamePrice}`)
  console.log(`  Total: ${restored + skippedJuki + skippedSamePrice + skippedNoMatch}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Rollback failed:', err)
  process.exit(1)
})
