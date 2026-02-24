/**
 * Upload REMAINING local media files to Vercel Blob (only those not yet uploaded).
 * Run this after the store is unsuspended.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..." node scripts/upload-remaining-to-blob.mjs
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
  process.exit(1)
}

async function main() {
  const client = new Client({ connectionString: NEON_URL })
  await client.connect()
  console.log('Connected to Neon DB')

  // Get only media records that DON'T have blob URLs yet
  const { rows: mediaRows } = await client.query(`
    SELECT id, filename, url, mime_type,
           "sizes_thumbnail_filename", "sizes_thumbnail_url",
           "sizes_card_filename", "sizes_card_url",
           "sizes_feature_filename", "sizes_feature_url"
    FROM media
    WHERE url NOT LIKE '%blob.vercel-storage%'
    ORDER BY id
  `)
  console.log(`Remaining media to upload: ${mediaRows.length}`)

  let uploaded = 0
  let skipped = 0
  let errors = 0

  for (const row of mediaRows) {
    const localPath = path.join(MEDIA_DIR, row.filename)
    if (!fs.existsSync(localPath)) {
      skipped++
      continue
    }

    try {
      const fileBuffer = fs.readFileSync(localPath)
      const blob = await put(`media/${row.filename}`, fileBuffer, {
        access: 'public',
        token: BLOB_TOKEN,
        contentType: row.mime_type || 'image/jpeg',
      })

      const updates = [`url = $1`]
      const values = [blob.url]
      let paramIdx = 2

      // Upload sizes
      for (const size of ['thumbnail', 'card', 'feature']) {
        const fnCol = `sizes_${size}_filename`
        const fn = row[fnCol]
        if (fn) {
          const sizePath = path.join(MEDIA_DIR, fn)
          if (fs.existsSync(sizePath)) {
            const sizeBlob = await put(`media/${fn}`, fs.readFileSync(sizePath), {
              access: 'public',
              token: BLOB_TOKEN,
              contentType: row.mime_type || 'image/jpeg',
            })
            updates.push(`"sizes_${size}_url" = $${paramIdx}`)
            values.push(sizeBlob.url)
            paramIdx++
          }
        }
      }

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
      if (errors <= 3) {
        console.error(`  Error: ${e.message}`)
      }
      if (e.message.includes('suspended')) {
        console.error('\nStore is still suspended! Try again later.')
        break
      }
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Uploaded: ${uploaded}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)

  // Final check
  const remaining = await client.query("SELECT COUNT(*) as c FROM media WHERE url NOT LIKE '%blob.vercel-storage%'")
  console.log(`Still remaining: ${remaining.rows[0].c}`)

  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
