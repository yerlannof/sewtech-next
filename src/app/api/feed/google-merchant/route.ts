import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function GET() {
  const payload = await getPayload({ config })

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

  const items = products.docs.map((p) => {
    const image = (p.images as any)?.[0]
    const imageUrl = image?.sizes?.card?.url || image?.url || ''
    const brand = (p.brand as any)?.name || 'JUKI'
    const availability = p.inStock ? 'in_stock' : 'preorder'

    return `
    <item>
      <g:id>${p.sku}</g:id>
      <title>${escapeXml(p.name)}</title>
      <link>${BASE_URL}/product/${p.slug}</link>
      <g:price>${p.price} KZT</g:price>
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>
      ${imageUrl ? `<g:image_link>${BASE_URL}${imageUrl}</g:image_link>` : ''}
      <g:mpn>${p.sku}</g:mpn>
    </item>`
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>SEWTECH — Промышленные швейные машины</title>
    <link>${BASE_URL}</link>
    <description>Промышленные швейные машины JUKI. Официальный дилер в Казахстане.</description>
    ${items.join('\n')}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
