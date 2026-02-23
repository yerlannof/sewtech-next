import { NextRequest, NextResponse } from 'next/server'
import { searchProducts } from '@/lib/qdrant'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || ''
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '12')

  if (!query || query.length < 2) {
    return NextResponse.json({ docs: [], totalDocs: 0, query, source: 'none' })
  }

  const result = await searchProducts(query, limit)

  return NextResponse.json({
    docs: result.products.map((doc) => ({
      id: doc.id,
      name: doc.name,
      slug: doc.slug,
      sku: doc.sku,
      price: doc.price,
      priceOnRequest: doc.priceOnRequest,
      inStock: doc.inStock,
      image: (doc.images as any)?.[0]?.sizes?.thumbnail?.url || null,
    })),
    totalDocs: result.products.length,
    query,
    source: result.source,
    chunksFound: result.chunksFound,
    retrievalTimeMs: result.retrievalTimeMs,
  })
}
