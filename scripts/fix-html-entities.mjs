/**
 * Fix HTML entities (&quot; &amp; etc.) in product names and descriptions
 * Connects directly to Neon PostgreSQL and updates affected rows.
 *
 * Usage:
 *   node scripts/fix-html-entities.mjs
 *   NEON_URL="postgresql://..." node scripts/fix-html-entities.mjs
 */

import pg from 'pg'
const { Client } = pg

const NEON_URL = process.env.NEON_URL ||
  'postgresql://neondb_owner:npg_ZRITNKAPy30e@ep-old-sea-al8vemub-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'

// HTML entity decoder
function decodeEntities(str) {
  if (!str) return str
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
}

async function main() {
  const client = new Client({ connectionString: NEON_URL })
  await client.connect()
  console.log('Connected to Neon DB')

  // 1. Fix product names
  const nameRes = await client.query(`
    SELECT id, name FROM products
    WHERE name LIKE '%&quot;%' OR name LIKE '%&amp;%' OR name LIKE '%&lt;%' OR name LIKE '%&gt;%' OR name LIKE '%&#%'
  `)
  console.log(`\nProducts with HTML entities in name: ${nameRes.rows.length}`)
  for (const row of nameRes.rows) {
    const fixed = decodeEntities(row.name)
    console.log(`  [${row.id}] "${row.name}" → "${fixed}"`)
    await client.query('UPDATE products SET name = $1 WHERE id = $2', [fixed, row.id])
  }

  // 2. Fix short_description (Payload CMS converts camelCase to snake_case in Postgres)
  const descRes = await client.query(`
    SELECT id, name, short_description FROM products
    WHERE short_description LIKE '%&quot;%' OR short_description LIKE '%&amp;%' OR short_description LIKE '%&#%'
  `)
  console.log(`\nProducts with HTML entities in short_description: ${descRes.rows.length}`)
  for (const row of descRes.rows) {
    const fixed = decodeEntities(row.short_description)
    console.log(`  [${row.id}] ${row.name}: fixed short_description`)
    await client.query('UPDATE products SET short_description = $1 WHERE id = $2', [fixed, row.id])
  }

  // 3. Fix meta title and description (stored in _products_v_meta table or products table)
  // Payload CMS stores SEO meta as columns on the main table: meta_title, meta_description
  try {
    const metaRes = await client.query(`
      SELECT id, name, meta_title, meta_description FROM products
      WHERE meta_title LIKE '%&quot;%' OR meta_title LIKE '%&amp;%'
         OR meta_description LIKE '%&quot;%' OR meta_description LIKE '%&amp;%'
    `)
    console.log(`\nProducts with HTML entities in meta: ${metaRes.rows.length}`)
    for (const row of metaRes.rows) {
      const fixedTitle = decodeEntities(row.meta_title)
      const fixedDesc = decodeEntities(row.meta_description)
      console.log(`  [${row.id}] ${row.name}: fixed meta`)
      await client.query(
        'UPDATE products SET meta_title = $1, meta_description = $2 WHERE id = $3',
        [fixedTitle, fixedDesc, row.id]
      )
    }
  } catch (e) {
    console.log(`\nMeta columns not found as expected, trying alternate names...`)
    // Try alternate column names
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'products' AND column_name LIKE '%meta%'
    `)
    console.log('  Meta columns:', cols.rows.map(r => r.column_name).join(', '))
  }

  // 4. Fix specifications (stored in a separate table for arrays)
  try {
    const specTableRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name LIKE 'products_spec%' OR table_name LIKE 'products_%spec%'
      ORDER BY table_name
    `)
    console.log(`\nSpec-related tables: ${specTableRes.rows.map(r => r.table_name).join(', ')}`)

    for (const { table_name } of specTableRes.rows) {
      const specCols = await client.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name = $1
      `, [table_name])
      const colNames = specCols.rows.map(r => r.column_name)
      console.log(`  ${table_name} columns: ${colNames.join(', ')}`)

      // Fix value column if it exists
      if (colNames.includes('value')) {
        const specRes = await client.query(`
          SELECT id, name, value FROM "${table_name}"
          WHERE value LIKE '%&quot;%' OR value LIKE '%&amp;%' OR value LIKE '%&#%'
        `)
        console.log(`  Specs with HTML entities: ${specRes.rows.length}`)
        for (const row of specRes.rows) {
          const fixed = decodeEntities(row.value)
          await client.query(`UPDATE "${table_name}" SET value = $1 WHERE id = $2`, [fixed, row.id])
        }
      }
      // Fix name column too
      if (colNames.includes('name')) {
        const nameSpecRes = await client.query(`
          SELECT id, name FROM "${table_name}"
          WHERE name LIKE '%&quot;%' OR name LIKE '%&amp;%' OR name LIKE '%&#%'
        `)
        if (nameSpecRes.rows.length > 0) {
          console.log(`  Spec names with HTML entities: ${nameSpecRes.rows.length}`)
          for (const row of nameSpecRes.rows) {
            const fixed = decodeEntities(row.name)
            await client.query(`UPDATE "${table_name}" SET name = $1 WHERE id = $2`, [fixed, row.id])
          }
        }
      }
    }
  } catch (e) {
    console.log(`  Error with specs: ${e.message}`)
  }

  // 5. Fix FAQ tables
  try {
    const faqTableRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name LIKE 'products_faq%' OR table_name LIKE 'products_%faq%'
      ORDER BY table_name
    `)
    console.log(`\nFAQ-related tables: ${faqTableRes.rows.map(r => r.table_name).join(', ')}`)

    for (const { table_name } of faqTableRes.rows) {
      const faqCols = await client.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name = $1
      `, [table_name])
      const colNames = faqCols.rows.map(r => r.column_name)

      for (const col of ['question', 'answer']) {
        if (colNames.includes(col)) {
          const faqRes = await client.query(`
            SELECT id, "${col}" FROM "${table_name}"
            WHERE "${col}" LIKE '%&quot;%' OR "${col}" LIKE '%&amp;%' OR "${col}" LIKE '%&#%'
          `)
          if (faqRes.rows.length > 0) {
            console.log(`  ${table_name}.${col} with entities: ${faqRes.rows.length}`)
            for (const row of faqRes.rows) {
              const fixed = decodeEntities(row[col])
              await client.query(`UPDATE "${table_name}" SET "${col}" = $1 WHERE id = $2`, [fixed, row.id])
            }
          }
        }
      }
    }
  } catch (e) {
    console.log(`  Error with FAQ: ${e.message}`)
  }

  // Summary
  const total = await client.query('SELECT COUNT(*) as cnt FROM products')
  const remaining = await client.query(`
    SELECT COUNT(*) as cnt FROM products
    WHERE name LIKE '%&quot;%' OR short_description LIKE '%&quot;%'
  `)
  console.log(`\n=== Summary ===`)
  console.log(`Total products: ${total.rows[0].cnt}`)
  console.log(`Remaining with &quot;: ${remaining.rows[0].cnt}`)

  await client.end()
  console.log('\nDone!')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
