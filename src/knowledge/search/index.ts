import type { KnowledgeDoc } from '../types'

export interface SearchDocument {
  docId: string
  status: KnowledgeDoc['status']
  categoryId: string
  text: string
  tokens: string[]
}

export interface SearchIndex {
  documents: SearchDocument[]
}

export interface SearchOptions {
  query: string
  categoryId?: string | null
  includeArchived?: boolean
}

export interface SearchHit {
  docId: string
  score: number
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function buildSearchIndex(
  docs: KnowledgeDoc[],
  docToCategory: Record<string, string>,
): SearchIndex {
  return {
    documents: docs.map((doc) => {
      const text = [doc.title, doc.summary, doc.tags.join(' '), doc.body].join(' ').toLowerCase()
      return {
        docId: doc.id,
        status: doc.status,
        categoryId: docToCategory[doc.id] ?? 'uncategorized',
        text,
        tokens: tokenize(text),
      }
    }),
  }
}

export function searchKnowledge(index: SearchIndex, options: SearchOptions): SearchHit[] {
  const queryTokens = tokenize(options.query)

  return index.documents
    .filter((doc) => {
      if (!options.includeArchived && doc.status === 'archived') {
        return false
      }

      if (options.categoryId && doc.categoryId !== options.categoryId) {
        return false
      }

      if (queryTokens.length === 0) {
        return true
      }

      return queryTokens.every((token) => doc.text.includes(token))
    })
    .map((doc) => {
      if (queryTokens.length === 0) {
        return { docId: doc.docId, score: 1 }
      }

      const score = queryTokens.reduce((total, token) => {
        const tokenHits = doc.tokens.reduce((hits, current) => hits + (current === token ? 1 : 0), 0)
        return total + tokenHits
      }, 0)

      return {
        docId: doc.docId,
        score,
      }
    })
    .sort((left, right) => right.score - left.score)
}
