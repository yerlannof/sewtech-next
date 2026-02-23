/**
 * Download images for 4 JUKI machines missing them and insert into Payload DB.
 *
 * Usage: cd sewtech-next && npx tsx scripts/fix-missing-images.ts
 */

import fs from 'fs'
import path from 'path'
import https from 'https'
import pg from 'pg'
import sharp from 'sharp'
import 'dotenv/config'

const { Pool } = pg

const JUKI_MACHINES: { slug: string; jsonFile: string; name: string }[] = [
  { slug: 'm900dj', jsonFile: 'M900DJ.json', name: 'JUKI M900/DJ' },
  { slug: 'plk-j10050rh', jsonFile: 'PLK-J10050RH_E2.json', name: 'JUKI PLK-J10050RH' },
  { slug: 'plk-j3020r-se', jsonFile: 'PLK-J3020R-SE_E2.json', name: 'JUKI PLK-J3020R-SE' },
  { slug: 'plk-j4040rh', jsonFile: 'PLK-J4040RH_E2.json', name: 'JUKI PLK-J4040RH' },
]

const JUKI_PAGES_DIR = '/home/yerla/projects/juki-rag-project/data/raw/juki/pages'
const MEDIA_DIR = path.join(process.cwd(), 'media')
const TMP_DIR = '/tmp/sewtech-missing-images'

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          file.close()
          if (fs.existsSync(dest)) fs.unlinkSync(dest)
          downloadFile(redirectUrl, dest).then(resolve).catch(reject)
          return
        }
      }
      if (response.statusCode !== 200) {
        file.close()
        if (fs.existsSync(dest)) fs.unlinkSync(dest)
        reject(new Error(`HTTP ${response.statusCode} for ${url}`))
        return
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      reject(err)
    })
  })
}

async function main() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true })

  const pool = new Pool({ connectionString: process.env.DATABASE_URI })
  let fixed = 0

  for (const machine of JUKI_MACHINES) {
    // Find product in DB
    const prodResult = await pool.query(
      'SELECT id, name FROM products WHERE slug = $1',
      [machine.slug],
    )
    if (!prodResult.rows.length) {
      console.log(`SKIP: Product not found: ${machine.slug}`)
      continue
    }
    const product = prodResult.rows[0]

    // Check if already has images
    const imgCheck = await pool.query(
      "SELECT COUNT(*) as cnt FROM products_rels WHERE parent_id = $1 AND path = 'images'",
      [product.id],
    )
    if (parseInt(imgCheck.rows[0].cnt) > 0) {
      console.log(`SKIP: ${product.name} already has images`)
      continue
    }

    // Load JUKI scraped data
    const jsonPath = path.join(JUKI_PAGES_DIR, machine.jsonFile)
    if (!fs.existsSync(jsonPath)) {
      console.log(`SKIP: JSON not found: ${jsonPath}`)
      continue
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    const imageUrls: string[] = data.images || data.image_urls || []
    if (imageUrls.length === 0) {
      console.log(`SKIP: No images in JSON for ${machine.slug}`)
      continue
    }

    // Download first image
    const url = imageUrls[0]
    const tmpFile = path.join(TMP_DIR, `${machine.slug}.jpg`)
    console.log(`Downloading: ${url}`)
    await downloadFile(url, tmpFile)

    // Get image dimensions
    const metadata = await sharp(tmpFile).metadata()
    const fileSize = fs.statSync(tmpFile).size
    const filename = `${machine.slug}.jpg`

    // Copy to media dir
    const mediaPath = path.join(MEDIA_DIR, filename)
    fs.copyFileSync(tmpFile, mediaPath)

    // Generate thumbnail (400x300)
    const thumbDir = path.join(MEDIA_DIR, 'thumbnail')
    if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true })
    await sharp(tmpFile).resize(400, 300, { fit: 'inside' }).toFile(path.join(thumbDir, filename))

    // Generate card size (600x600)
    const cardDir = path.join(MEDIA_DIR, 'card')
    if (!fs.existsSync(cardDir)) fs.mkdirSync(cardDir, { recursive: true })
    await sharp(tmpFile).resize(600, 600, { fit: 'inside' }).toFile(path.join(cardDir, filename))

    // Insert into media table
    const mediaResult = await pool.query(
      `INSERT INTO media (alt, filename, mime_type, filesize, width, height, url, created_at, updated_at)
       VALUES ($1, $2, 'image/jpeg', $3, $4, $5, $6, NOW(), NOW())
       RETURNING id`,
      [
        machine.name,
        filename,
        fileSize,
        metadata.width || 800,
        metadata.height || 600,
        `/media/${filename}`,
      ],
    )
    const mediaId = mediaResult.rows[0].id

    // Update sizes JSON column if it exists
    try {
      await pool.query(
        `UPDATE media SET
          thumbnail_url = $1, thumbnail_width = 400, thumbnail_height = 300, thumbnail_filesize = $3, thumbnail_filename = $4, thumbnail_mime_type = 'image/jpeg',
          card_url = $2, card_width = 600, card_height = 600, card_filesize = $5, card_filename = $4, card_mime_type = 'image/jpeg'
        WHERE id = $6`,
        [
          `/media/thumbnail/${filename}`,
          `/media/card/${filename}`,
          fs.statSync(path.join(thumbDir, filename)).size,
          filename,
          fs.statSync(path.join(cardDir, filename)).size,
          mediaId,
        ],
      )
    } catch {
      // Sizes columns may not exist in this schema — that's OK
    }

    // Link media to product
    const orderResult = await pool.query(
      "SELECT COALESCE(MAX(\"order\"), 0) + 1 as next_order FROM products_rels WHERE parent_id = $1 AND path = 'images'",
      [product.id],
    )

    await pool.query(
      `INSERT INTO products_rels (parent_id, path, media_id, "order")
       VALUES ($1, 'images', $2, $3)`,
      [product.id, mediaId, orderResult.rows[0].next_order],
    )

    console.log(`OK: ${product.name} — media #${mediaId}, file: ${filename}`)
    fixed++
  }

  // Report remaining
  const remaining = await pool.query(`
    SELECT p.name, p.slug FROM products p
    WHERE p.id NOT IN (SELECT DISTINCT parent_id FROM products_rels WHERE path = 'images')
    ORDER BY p.name LIMIT 10
  `)
  const totalMissing = await pool.query(`
    SELECT COUNT(*) as cnt FROM products
    WHERE id NOT IN (SELECT DISTINCT parent_id FROM products_rels WHERE path = 'images')
  `)

  console.log(`\nFixed: ${fixed} JUKI machines`)
  console.log(`Remaining without images: ${totalMissing.rows[0].cnt}`)
  if (remaining.rows.length > 0) {
    console.log('(mostly accessories with no image source available):')
    for (const r of remaining.rows) {
      console.log(`  - ${r.name}`)
    }
  }

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
