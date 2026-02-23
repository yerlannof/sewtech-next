import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || ''
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '12')

  if (!query || query.length < 2) {
    return NextResponse.json({ docs: [], totalDocs: 0, query })
  }

  const payload = await getPayload({ config })

  // Search by name using Payload's built-in like operator
  const results = await payload.find({
    collection: 'products',
    where: {
      or: [
        { name: { like: query } },
        { sku: { like: query } },
      ],
    },
    limit,
    sort: 'name',
    depth: 1,
  })

  return NextResponse.json({
    docs: results.docs.map((doc) => ({
      id: doc.id,
      name: doc.name,
      slug: doc.slug,
      sku: doc.sku,
      price: doc.price,
      priceOnRequest: doc.priceOnRequest,
      inStock: doc.inStock,
      image: (doc.images as any)?.[0]?.sizes?.thumbnail?.url || null,
    })),
    totalDocs: results.totalDocs,
    query,
  })
}
