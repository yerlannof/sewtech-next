/**
 * Copy blob URLs from url/sizes_thumbnail_url into dedicated blobUrl/blobThumbnailUrl columns.
 * These custom fields are read by the frontend to bypass Payload's URL override.
 *
 * First, creates the columns if they don't exist.
 * Then copies blob URLs for records that have them.
 */

import pg from 'pg'
const { Client } = pg

const NEON_URL = process.env.NEON_URL ||
  'postgresql://neondb_owner:npg_ZRITNKAPy30e@ep-old-sea-al8vemub-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'

async function main() {
  const client = new Client({ connectionString: NEON_URL })
  await client.connect()
  console.log('Connected to Neon DB')

  // Add columns if they don't exist
  for (const col of ['blob_url', 'blob_thumbnail_url']) {
    try {
      await client.query(`ALTER TABLE media ADD COLUMN IF NOT EXISTS "${col}" varchar`)
      console.log(`Column ${col}: OK`)
    } catch (e) {
      console.log(`Column ${col}: ${e.message}`)
    }
  }

  // Copy blob URLs to dedicated columns
  const res = await client.query(`
    UPDATE media
    SET blob_url = url,
        blob_thumbnail_url = sizes_thumbnail_url
    WHERE url LIKE 'https://%blob.vercel-storage%'
    RETURNING id
  `)
  console.log(`Updated ${res.rowCount} records with blob URLs`)

  // Verify
  const check = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE blob_url IS NOT NULL) as with_blob,
      COUNT(*) FILTER (WHERE blob_url IS NULL) as without_blob
    FROM media
  `)
  console.log(`With blob URL: ${check.rows[0].with_blob}`)
  console.log(`Without blob URL: ${check.rows[0].without_blob}`)

  await client.end()
  console.log('Done!')
}

main().catch(e => { console.error(e); process.exit(1) })
