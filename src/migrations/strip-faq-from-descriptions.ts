/**
 * Strip duplicate FAQ and JSON-LD from descriptionHtml
 *
 * Problem: 373 JUKI products have FAQ accordion + JSON-LD scripts baked into
 * descriptionHtml (carried over from OpenCart). The same FAQ is also stored
 * in the structured faq[] field and rendered by page.tsx, causing duplication.
 *
 * This script uses cheerio to cleanly remove:
 *   1. The FAQ <div> containing "Часто задаваемые вопросы"
 *   2. All <script type="application/ld+json"> tags
 *
 * Usage:
 *   cd ~/projects/sewtech-next
 *   npx tsx src/migrations/strip-faq-from-descriptions.ts --dry-run
 *   npx tsx src/migrations/strip-faq-from-descriptions.ts
 */

import 'dotenv/config'
import { getPayload, type Payload } from 'payload'
import config from '../payload/payload.config'
import * as cheerio from 'cheerio'

// ─── Types ────────────────────────────────────────────────────────

interface ProductRecord {
  id: number
  name: string
  descriptionHtml?: string | null
}

// ─── Core: strip FAQ + JSON-LD from HTML ──────────────────────────

function stripFaqAndJsonLd(html: string): { cleaned: string; changed: boolean } {
  const $ = cheerio.load(html, { decodeEntities: false } as Parameters<typeof cheerio.load>[1])

  let removed = 0

  // 1. Remove the FAQ div: find <div> containing h2 with "Часто задаваемые вопросы"
  $('div').each((_, el) => {
    const h2Text = $(el).find('h2').text()
    if (h2Text.includes('Часто задаваемые вопросы')) {
      $(el).remove()
      removed++
    }
  })

  // 2. Remove all JSON-LD script tags
  $('script[type="application/ld+json"]').each((_, el) => {
    $(el).remove()
    removed++
  })

  if (removed === 0) {
    return { cleaned: html, changed: false }
  }

  // cheerio.load wraps in <html><body>, extract just the body content
  const cleaned = $('body').html()?.trim() || ''
  return { cleaned, changed: true }
}

// ─── Batch update ─────────────────────────────────────────────────

async function batchUpdate(
  payload: Payload,
  updates: Array<{ id: number; descriptionHtml: string }>,
  dryRun: boolean,
) {
  if (dryRun) {
    console.log(`[DRY RUN] Would update ${updates.length} products`)
    return { success: updates.length, errors: 0 }
  }

  let success = 0
  let errors = 0

  for (let i = 0; i < updates.length; i++) {
    const { id, descriptionHtml } = updates[i]
    try {
      await payload.update({
        collection: 'products',
        id,
        data: { descriptionHtml } as any,
      })
      success++
    } catch (err) {
      errors++
      console.error(`  Error updating #${id}: ${(err as Error).message?.slice(0, 100)}`)
    }

    if ((i + 1) % 50 === 0 || i === updates.length - 1) {
      console.log(`  Updated ${i + 1}/${updates.length} — ${success} ok, ${errors} errors`)
    }
  }

  return { success, errors }
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log(`=== Strip FAQ from descriptionHtml ${dryRun ? '(DRY RUN)' : ''} ===\n`)

  const payload = await getPayload({ config })
  console.log('Payload initialized.\n')

  // Load all products
  console.log('Loading products...')
  const allProducts: ProductRecord[] = []
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
  console.log(`Loaded ${allProducts.length} products\n`)

  // Filter to products with descriptionHtml containing FAQ or JSON-LD
  const candidates = allProducts.filter(
    (p) =>
      p.descriptionHtml &&
      (p.descriptionHtml.includes('Часто задаваемые вопросы') ||
        p.descriptionHtml.includes('application/ld+json')),
  )
  console.log(`Found ${candidates.length} products with FAQ/JSON-LD in descriptionHtml\n`)

  if (candidates.length === 0) {
    console.log('Nothing to do.')
    process.exit(0)
  }

  // Process each candidate
  const updates: Array<{ id: number; descriptionHtml: string }> = []
  let faqRemoved = 0
  let jsonldRemoved = 0

  for (const product of candidates) {
    const html = product.descriptionHtml!
    const hadFaq = html.includes('Часто задаваемые вопросы')
    const hadJsonLd = html.includes('application/ld+json')

    const { cleaned, changed } = stripFaqAndJsonLd(html)

    if (changed) {
      updates.push({ id: product.id, descriptionHtml: cleaned })
      if (hadFaq) faqRemoved++
      if (hadJsonLd) jsonldRemoved++
    }
  }

  console.log(`Products to update: ${updates.length}`)
  console.log(`  FAQ sections removed: ${faqRemoved}`)
  console.log(`  JSON-LD scripts removed from: ${jsonldRemoved}\n`)

  if (dryRun) {
    // Show a sample
    if (updates.length > 0) {
      const sample = candidates[0]
      const { cleaned } = stripFaqAndJsonLd(sample.descriptionHtml!)
      console.log(`--- Sample: ${sample.name} ---`)
      console.log(`  Before: ${sample.descriptionHtml!.length} chars`)
      console.log(`  After:  ${cleaned.length} chars`)
      console.log(`  Removed: ${sample.descriptionHtml!.length - cleaned.length} chars`)
    }
    console.log('\n[DRY RUN] No changes written. Remove --dry-run to apply.')
    process.exit(0)
  }

  // Apply updates
  const result = await batchUpdate(payload, updates, dryRun)

  // Verification
  console.log('\n--- Verification ---')
  let remaining = 0
  let vPage = 1
  while (true) {
    const batch = await payload.find({
      collection: 'products',
      limit: 100,
      page: vPage,
      depth: 0,
    })
    for (const doc of batch.docs as any[]) {
      if (
        doc.descriptionHtml &&
        (doc.descriptionHtml.includes('Часто задаваемые вопросы') ||
          doc.descriptionHtml.includes('application/ld+json'))
      ) {
        remaining++
      }
    }
    if (!batch.hasNextPage) break
    vPage++
  }

  console.log(`Products still containing FAQ/JSON-LD: ${remaining}`)

  console.log('\n=== Done ===')
  console.log(`Updated: ${result.success}, Errors: ${result.errors}, Remaining: ${remaining}`)

  process.exit(result.errors > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
