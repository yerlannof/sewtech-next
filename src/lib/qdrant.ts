import { QdrantClient } from '@qdrant/js-client-rest'

const client = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
})

const COLLECTION = process.env.QDRANT_COLLECTION || 'sewing_machines'

export interface SearchResult {
  model: string
  text: string
  score: number
  section: string
  category: string
  manufacturer: string
}

export async function searchProducts(query: string, limit = 10): Promise<SearchResult[]> {
  try {
    // Use scroll with filter to find by text match since we don't have an embedding model in JS
    // Fallback: search Qdrant by scroll with text filter
    const results = await client.scroll(COLLECTION, {
      filter: {
        should: [
          {
            key: 'model',
            match: { text: query.toUpperCase() },
          },
        ],
      },
      limit,
      with_payload: true,
    })

    return results.points.map((point) => ({
      model: (point.payload?.model as string) || '',
      text: (point.payload?.text as string) || '',
      score: 1.0,
      section: (point.payload?.section as string) || '',
      category: (point.payload?.category as string) || '',
      manufacturer: (point.payload?.manufacturer as string) || '',
    }))
  } catch (error) {
    console.error('Qdrant search error:', error)
    return []
  }
}

// Simple text search fallback using Payload CMS
export async function searchPayload(query: string, limit = 24) {
  // This will be called from the search page as a Payload query
  return { query, limit }
}
