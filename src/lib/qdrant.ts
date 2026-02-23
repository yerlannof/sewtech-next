/**
 * Search layer: RAG semantic search + Payload CMS product mapping.
 *
 * Flow: query → Python RAG API (BGE-M3 embeddings + Qdrant hybrid search)
 *       → extract model names → find matching products in Payload CMS.
 *
 * Falls back to Payload LIKE search if RAG API is unavailable.
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import type { Product } from '@/payload-types'
import type { Where } from 'payload'
import { searchRAG, extractUniqueModels, type RAGSource } from './rag-api'

export interface SearchResult {
  products: Product[]
  ragSources: RAGSource[]
  chunksFound: number
  retrievalTimeMs: number
  source: 'rag' | 'payload'
}

/**
 * Main search function: RAG first, Payload fallback.
 */
export async function searchProducts(
  query: string,
  limit = 24,
): Promise<SearchResult> {
  // Try RAG semantic search
  const ragResult = await searchRAG(query, Math.min(limit, 20))

  if (ragResult && ragResult.sources.length > 0) {
    const models = extractUniqueModels(ragResult.sources)
    const products = await mapModelsToPayloadProducts(models, limit)

    return {
      products,
      ragSources: ragResult.sources,
      chunksFound: ragResult.chunks_found,
      retrievalTimeMs: ragResult.retrieval_time_ms,
      source: 'rag',
    }
  }

  // Fallback: Payload CMS text search
  const products = await searchPayloadLike(query, limit)

  return {
    products,
    ragSources: [],
    chunksFound: 0,
    retrievalTimeMs: 0,
    source: 'payload',
  }
}

/**
 * Find Payload products matching model names from RAG results.
 * Searches by name (like) and sku (equals), deduplicates.
 */
async function mapModelsToPayloadProducts(
  models: string[],
  limit: number,
): Promise<Product[]> {
  if (models.length === 0) return []

  const payload = await getPayload({ config })
  const seen = new Set<number>()
  const products: Product[] = []

  // Build OR conditions: name like each model OR sku equals each model
  const conditions: Where[] = []
  for (const model of models) {
    conditions.push({ name: { like: model } })
    conditions.push({ sku: { equals: model } })
  }

  const result = await payload.find({
    collection: 'products',
    where: { or: conditions },
    limit,
    sort: 'name',
    depth: 1,
  })

  for (const doc of result.docs) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id)
      products.push(doc)
    }
  }

  return products
}

/**
 * Fallback: Payload CMS search on name, sku, shortDescription, machineType,
 * plus category-aware search (e.g. "оверлок" → find category "Оверлок" → show all products).
 */
async function searchPayloadLike(
  query: string,
  limit: number,
): Promise<Product[]> {
  const payload = await getPayload({ config })
  const seen = new Set<number>()
  const products: Product[] = []

  // 1. Direct field search: name, sku, shortDescription
  const directResult = await payload.find({
    collection: 'products',
    where: {
      or: [
        { name: { like: query } },
        { sku: { like: query } },
        { shortDescription: { like: query } },
      ],
    },
    limit,
    sort: 'name',
    depth: 1,
  })

  for (const doc of directResult.docs) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id)
      products.push(doc)
    }
  }

  // 2. Category-aware search: find categories matching the query, then fetch their products
  if (products.length < limit) {
    const categoryResult = await payload.find({
      collection: 'categories',
      where: { name: { like: query } },
      limit: 5,
    })

    if (categoryResult.docs.length > 0) {
      const catIds = categoryResult.docs.map((c) => c.id)
      const remaining = limit - products.length

      const catProducts = await payload.find({
        collection: 'products',
        where: {
          or: [
            { category: { in: catIds } },
            { subcategory: { in: catIds } },
          ],
        },
        limit: remaining,
        sort: 'name',
        depth: 1,
      })

      for (const doc of catProducts.docs) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id)
          products.push(doc)
        }
      }
    }
  }

  return products
}
