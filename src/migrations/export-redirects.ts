/**
 * Export redirects from Payload CMS to data/redirects.json
 *
 * Usage: npx tsx src/migrations/export-redirects.ts
 *
 * Output format for next.config.ts:
 * [{ "source": "/old-path", "destination": "/new-path", "permanent": true }]
 */

import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '@payload-config'

async function main() {
  const payload = await getPayload({ config })

  console.log('Fetching redirects from Payload...')

  const result = await payload.find({
    collection: 'redirects',
    limit: 1000,
    depth: 0,
  })

  console.log(`Found ${result.totalDocs} redirects`)

  const redirects: Array<{ source: string; destination: string; permanent: boolean }> = []

  for (const doc of result.docs) {
    const from = (doc as any).from as string | undefined
    const to = (doc as any).to as { type?: string; url?: string; reference?: unknown } | undefined

    if (!from) continue

    let destination: string | undefined

    if (to?.type === 'custom' && to.url) {
      destination = to.url
    } else if (to?.type === 'reference' && to.reference) {
      // Reference-type redirects point to a document — skip (handled by Payload at runtime)
      continue
    }

    if (!destination) continue
    if (from === destination) continue

    redirects.push({
      source: from.startsWith('/') ? from : `/${from}`,
      destination: destination.startsWith('/') ? destination : `/${destination}`,
      permanent: true,
    })
  }

  const outPath = path.resolve(process.cwd(), 'data/redirects.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(redirects, null, 2))

  console.log(`Exported ${redirects.length} redirects to ${outPath}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Failed to export redirects:', err)
  process.exit(1)
})
