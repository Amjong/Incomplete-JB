import type { KnowledgeCategory, KnowledgeDoc } from '../types'

interface CategoryScore {
  categoryId: string
  score: number
  reasons: string[]
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function hitCount(words: string[], targets: string[]): number {
  if (words.length === 0 || targets.length === 0) {
    return 0
  }

  const targetSet = new Set(targets.map((item) => item.toLowerCase()))
  return words.reduce((count, word) => count + (targetSet.has(word) ? 1 : 0), 0)
}

function scoreCategory(doc: KnowledgeDoc, category: KnowledgeCategory): CategoryScore {
  const reasons: string[] = []

  if (doc.categoryHint && doc.categoryHint === category.id) {
    reasons.push('categoryHint exact match')
    return { categoryId: category.id, score: 10_000, reasons }
  }

  const normalizedTags = doc.tags.map((tag) => tag.toLowerCase())
  const aliasHits = category.tagAliases.filter((alias) => normalizedTags.includes(alias.toLowerCase())).length

  const searchableText = `${doc.title} ${doc.summary} ${doc.body}`
  const words = tokenize(searchableText)
  const keywordHits = hitCount(words, category.keywords)

  const score = aliasHits * 28 + keywordHits * 6

  if (aliasHits > 0) {
    reasons.push(`tag alias hits: ${aliasHits}`)
  }
  if (keywordHits > 0) {
    reasons.push(`keyword hits: ${keywordHits}`)
  }

  return {
    categoryId: category.id,
    score,
    reasons,
  }
}

export function rankCategoriesByRules(doc: KnowledgeDoc, categories: KnowledgeCategory[]): CategoryScore[] {
  return categories
    .map((category) => scoreCategory(doc, category))
    .sort((left, right) => right.score - left.score)
}
