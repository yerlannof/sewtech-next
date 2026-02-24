/**
 * Export filename → blob URL mapping to a JSON file.
 * This file is used by Next.js middleware to redirect media requests to blob storage.
 */

import pg from 'pg'
import fs from 'fs'
const { Client } = pg

const NEON_URL = process.env.NEON_URL ||
  'postgresql://neondb_owner:npg_ZRITNKAPy30e@ep-old-sea-al8vemub-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'

async function main() {
  const client = new Client({ connectionString: NEON_URL })
  await client.connect()

  // Get all media with blob URLs (both main and size variants)
  const { rows } = await client.query(`
    SELECT filename, blob_url,
           sizes_thumbnail_filename, blob_thumbnail_url,
           sizes_card_filename, sizes_card_url,
           sizes_feature_filename, sizes_feature_url
    FROM media
    WHERE blob_url LIKE 'https://%'
  `)

  const map = {}
  for (const row of rows) {
    if (row.blob_url) map[row.filename] = row.blob_url
    if (row.blob_thumbnail_url && row.sizes_thumbnail_filename)
      map[row.sizes_thumbnail_filename] = row.blob_thumbnail_url
    if (row.sizes_card_url?.startsWith('https://') && row.sizes_card_filename)
      map[row.sizes_card_filename] = row.sizes_card_url
    if (row.sizes_feature_url?.startsWith('https://') && row.sizes_feature_filename)
      map[row.sizes_feature_filename] = row.sizes_feature_url
  }

  const outPath = 'src/data/blob-map.json'
  fs.mkdirSync('src/data', { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(map))
  console.log(`Exported ${Object.keys(map).length} filename → blob URL mappings to ${outPath}`)
  console.log(`File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`)

  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
