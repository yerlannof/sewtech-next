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

  const offers = products.docs.map((p) => {
    const image = (p.images as any)?.[0]
    const imageUrl = image?.sizes?.card?.url || image?.url || ''
    const brand = (p.brand as any)?.name || 'JUKI'
    const available = p.inStock ? 'true' : 'false'

    return `
      <offer id="${p.id}" available="${available}">
        <url>${BASE_URL}/product/${p.slug}</url>
        <price>${p.price}</price>
        <currencyId>KZT</currencyId>
        <categoryId>${typeof p.subcategory === 'number' ? p.subcategory : (p.subcategory as any)?.id || 1}</categoryId>
        <name>${escapeXml(p.name)}</name>
        <vendor>${escapeXml(brand)}</vendor>
        ${imageUrl ? `<picture>${BASE_URL}${imageUrl}</picture>` : ''}
        <description>${escapeXml(p.shortDescription || p.name)}</description>
      </offer>`
  })

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
    <offers>
      ${offers.join('\n')}
    </offers>
  </shop>
</yml_catalog>`

  return new NextResponse(yml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
