/**
 * Backfill maxSpeed and needleCount from product specifications
 *
 * Usage:
 *   cd ~/projects/sewtech-next
 *   npx tsx src/migrations/backfill-specs.ts 2>&1 | tee /tmp/backfill-specs.log
 */

import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload/payload.config'

const SPEED_PATTERNS = [
  /скорость/i,
  /speed/i,
  /ст\/мин/i,
  /стежк/i,
  /rpm/i,
  /spm/i,
  /sti\/min/i,
]

const NEEDLE_PATTERNS = [
  /игл/i,
  /needle/i,
  /кол-во игл/i,
  /количество игл/i,
]

function extractMaxSpeed(specs: Array<{ name: string; value: string; unit?: string | null }>): number | null {
  for (const spec of specs) {
    const nameMatch = SPEED_PATTERNS.some(p => p.test(spec.name))
    if (!nameMatch) continue

    // Extract numbers from value
    const numbers = spec.value.match(/[\d,]+/g)
    if (!numbers) continue

    const parsed = numbers.map(n => parseInt(n.replace(/,/g, ''))).filter(n => !isNaN(n) && n > 100 && n < 20000)
    if (parsed.length > 0) return Math.max(...parsed)
  }
  return null
}

function extractNeedleCount(
  specs: Array<{ name: string; value: string; unit?: string | null }>,
  productName: string,
): number | null {
  // Try from specs
  for (const spec of specs) {
    const nameMatch = NEEDLE_PATTERNS.some(p => p.test(spec.name))
    if (!nameMatch) continue

    const num = parseInt(spec.value)
    if (!isNaN(num) && num >= 1 && num <= 20) return num
  }

  // Try from product name
  if (/\b1-?игол/i.test(productName) || /\b1-?needle/i.test(productName)) return 1
  if (/\b2-?(?:х\s*)?игол/i.test(productName) || /\b2-?needle/i.test(productName)) return 2
  if (/\b3-?игол/i.test(productName) || /\b3-?needle/i.test(productName)) return 3

  return null
}

async function main() {
  const payload = await getPayload({ config })
  console.log('Connected to Payload CMS')

  let page = 1
  let speedUpdated = 0
  let needleUpdated = 0
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
      const specs = (product.specifications || []) as Array<{ name: string; value: string; unit?: string | null }>
      const update: Record<string, unknown> = {}

      if (!product.maxSpeed) {
        const speed = extractMaxSpeed(specs)
        if (speed) {
          update.maxSpeed = speed
          speedUpdated++
        }
      }

      if (!product.needleCount) {
        const needles = extractNeedleCount(specs, product.name)
        if (needles) {
          update.needleCount = needles
          needleUpdated++
        }
      }

      if (Object.keys(update).length > 0) {
        await payload.update({
          collection: 'products',
          id: product.id,
          data: update,
        })
      }
    }

    console.log(`Page ${page}: processed ${products.docs.length} products`)
    page++
    if (page > products.totalPages) break
  }

  console.log(`\n=== BACKFILL COMPLETE ===`)
  console.log(`Total products: ${total}`)
  console.log(`maxSpeed filled: ${speedUpdated}`)
  console.log(`needleCount filled: ${needleUpdated}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
