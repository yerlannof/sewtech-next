/**
 * Client for Python RAG API (juki-rag-project FastAPI on localhost:8000).
 *
 * Provides semantic search over 18,742 Qdrant chunks using BGE-M3 embeddings,
 * hybrid dense+sparse search, reranking, and query routing.
 */

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000'
const RAG_TIMEOUT_MS = 5000

export interface RAGSource {
  model: string
  section: string
  source_type: string
  language: string
  score: number
  text_preview: string
}

export interface RAGSearchResult {
  question: string
  summary: string
  context: string
  sources: RAGSource[]
  retrieval_time_ms: number
  chunks_found: number
}

/**
 * Call Python RAG API /api/search endpoint.
 * Returns null on any error (timeout, connection refused, etc.) — caller should fallback.
 */
export async function searchRAG(
  query: string,
  topK = 10,
): Promise<RAGSearchResult | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), RAG_TIMEOUT_MS)

    const res = await fetch(`${RAG_API_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: query, top_k: topK }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      console.error(`RAG API error: ${res.status} ${res.statusText}`)
      return null
    }

    return (await res.json()) as RAGSearchResult
  } catch (error) {
    // Connection refused, timeout, network error — all silently return null
    console.warn('RAG API unavailable:', (error as Error).message)
    return null
  }
}

/**
 * Extract unique model names from RAG sources, ordered by best score.
 */
export function extractUniqueModels(sources: RAGSource[]): string[] {
  const seen = new Set<string>()
  const models: string[] = []

  for (const s of sources) {
    const model = s.model?.trim()
    if (model && !seen.has(model)) {
      seen.add(model)
      models.push(model)
    }
  }

  return models
}
