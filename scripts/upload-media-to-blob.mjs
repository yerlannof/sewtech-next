/**
 * Upload all local media files to Vercel Blob and update DB URLs.
 *
 * Prerequisites:
 *   1. Create Blob Store in Vercel Dashboard → your project → Storage → Create → Blob
 *   2. Copy BLOB_READ_WRITE_TOKEN from Vercel Dashboard
 *   3. Run: BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..." node scripts/upload-media-to-blob.mjs
 *
 * What it does:
 *   1. Reads all media records from Neon DB
 *   2. Uploads each file from local media/ to Vercel Blob
 *   3. Updates the DB url field to point to the Blob URL
 */

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { put } from '@vercel/blob'

const { Client } = pg

const NEON_URL = process.env.NEON_URL ||
  'postgresql://neondb_owner:npg_ZRITNKAPy30e@ep-old-sea-al8vemub-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN
const MEDIA_DIR = path.resolve('media')

if (!BLOB_TOKEN) {
  console.error('ERROR: BLOB_READ_WRITE_TOKEN is required.')
  console.error('')
  console.error('Steps:')
  console.error('  1. Go to https://vercel.com/dashboard → your project → Storage → Create → Blob')
  console.error('  2. Copy the BLOB_READ_WRITE_TOKEN')
  console.error('  3. Run: BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..." node scripts/upload-media-to-blob.mjs')
  process.exit(1)
}

async function main() {
  const client = new Client({ connectionString: NEON_URL })
  await client.connect()
  console.log('Connected to Neon DB')

  // Get all media records
  const { rows: mediaRows } = await client.query(`
    SELECT id, filename, url, mime_type,
           "sizes_thumbnail_filename", "sizes_thumbnail_url",
           "sizes_card_filename", "sizes_card_url",
           "sizes_feature_filename", "sizes_feature_url"
    FROM media
    ORDER BY id
  `)
  console.log(`Total media records: ${mediaRows.length}`)

  let uploaded = 0
  let skipped = 0
  let errors = 0

  for (const row of mediaRows) {
    // Upload main file
    const localPath = path.join(MEDIA_DIR, row.filename)
    if (!fs.existsSync(localPath)) {
      skipped++
      continue
    }

    try {
      // Upload main image
      const fileBuffer = fs.readFileSync(localPath)
      const blob = await put(`media/${row.filename}`, fileBuffer, {
        access: 'public',
        token: BLOB_TOKEN,
        contentType: row.mime_type || 'image/jpeg',
      })

      // Build update query for main file
      const updates = [`url = $1`]
      const values = [blob.url]
      let paramIdx = 2

      // Upload thumbnail if exists
      if (row.sizes_thumbnail_filename) {
        const thumbPath = path.join(MEDIA_DIR, row.sizes_thumbnail_filename)
        if (fs.existsSync(thumbPath)) {
          const thumbBlob = await put(`media/${row.sizes_thumbnail_filename}`, fs.readFileSync(thumbPath), {
            access: 'public',
            token: BLOB_TOKEN,
            contentType: row.mime_type || 'image/jpeg',
          })
          updates.push(`sizes_thumbnail_url = $${paramIdx}`)
          values.push(thumbBlob.url)
          paramIdx++
        }
      }

      // Upload card size if exists
      if (row.sizes_card_filename) {
        const cardPath = path.join(MEDIA_DIR, row.sizes_card_filename)
        if (fs.existsSync(cardPath)) {
          const cardBlob = await put(`media/${row.sizes_card_filename}`, fs.readFileSync(cardPath), {
            access: 'public',
            token: BLOB_TOKEN,
            contentType: row.mime_type || 'image/jpeg',
          })
          updates.push(`sizes_card_url = $${paramIdx}`)
          values.push(cardBlob.url)
          paramIdx++
        }
      }

      // Upload feature size if exists
      if (row.sizes_feature_filename) {
        const featPath = path.join(MEDIA_DIR, row.sizes_feature_filename)
        if (fs.existsSync(featPath)) {
          const featBlob = await put(`media/${row.sizes_feature_filename}`, fs.readFileSync(featPath), {
            access: 'public',
            token: BLOB_TOKEN,
            contentType: row.mime_type || 'image/jpeg',
          })
          updates.push(`sizes_feature_url = $${paramIdx}`)
          values.push(featBlob.url)
          paramIdx++
        }
      }

      // Update DB
      values.push(row.id)
      await client.query(
        `UPDATE media SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
        values
      )

      uploaded++
      if (uploaded % 50 === 0) {
        console.log(`  Progress: ${uploaded}/${mediaRows.length} uploaded, ${skipped} skipped, ${errors} errors`)
      }
    } catch (e) {
      errors++
      console.error(`  Error uploading ${row.filename}: ${e.message}`)
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Uploaded: ${uploaded}`)
  console.log(`Skipped (file not found): ${skipped}`)
  console.log(`Errors: ${errors}`)
  console.log(`Total: ${mediaRows.length}`)

  await client.end()
  console.log('Done!')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
