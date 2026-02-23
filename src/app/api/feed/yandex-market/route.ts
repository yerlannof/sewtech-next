import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrencySettings, convertToKZT } from '@/lib/price'
import type { Category } from '@/payload-types'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function GET() {
  const payload = await getPayload({ config })
  const { exchangeRate } = await getCurrencySettings()

  // Fetch categories for the catalog section
  const categories = await payload.find({
    collection: 'categories',
    limit: 200,
    depth: 1,
  })

  const products = await payload.find({
    collection: 'products',
    where: {
      and: [
        { price: { greater_than: 0 } },
        { priceOnRequest: { not_equals: true } },
      ],
    },
    limit: 1000,
    depth: 1,
  })

  // Build categories XML
  const categoriesXml = categories.docs
    .map((cat) => {
      const parentId =
        typeof cat.parent === 'object' && cat.parent !== null
          ? (cat.parent as Category).id
          : undefined
      return `      <category id="${cat.id}"${parentId ? ` parentId="${parentId}"` : ''}>${escapeXml(cat.name)}</category>`
    })
    .join('\n')

  // Build offers XML
  const offersXml = products.docs
    .map((p) => {
      const image = (p.images as any)?.[0]
      const imageUrl = image?.sizes?.card?.url || image?.url || ''
      const brand = (p.brand as any)?.name || ''
      const available = p.inStock ? 'true' : 'false'
      const priceKZT = convertToKZT(p.price!, exchangeRate)
      const categoryId =
        typeof p.subcategory === 'number'
          ? p.subcategory
          : (p.subcategory as any)?.id ||
            (typeof p.category === 'number' ? p.category : (p.category as any)?.id || 1)

      return `      <offer id="${p.id}" available="${available}">
        <url>${BASE_URL}/product/${p.slug}</url>
        <price>${priceKZT}</price>
        <currencyId>KZT</currencyId>
        <categoryId>${categoryId}</categoryId>
        <name>${escapeXml(p.name)}</name>
        ${brand ? `<vendor>${escapeXml(brand)}</vendor>` : ''}
        ${imageUrl ? `<picture>${BASE_URL}${imageUrl}</picture>` : ''}
        <description>${escapeXml(p.shortDescription || p.name)}</description>
        <delivery>true</delivery>
        <delivery-options>
          <option cost="0" days="1-3" order-before="18"/>
        </delivery-options>
      </offer>`
    })
    .join('\n')

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const yml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE yml_catalog SYSTEM "shops.dtd">
<yml_catalog date="${now}">
  <shop>
    <name>SEWTECH</name>
    <company>SEWTECH</company>
    <url>${BASE_URL}</url>
    <currencies>
      <currency id="KZT" rate="1"/>
    </currencies>
    <categories>
${categoriesXml}
    </categories>
    <delivery-options>
      <option cost="0" days="1-3" order-before="18"/>
    </delivery-options>
    <offers>
${offersXml}
    </offers>
  </shop>
</yml_catalog>`

  return new NextResponse(yml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
