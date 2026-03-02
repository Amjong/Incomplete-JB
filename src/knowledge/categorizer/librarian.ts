import { buildLibraryLayout, type LibraryLayoutOptions } from '../layout/libraryLayout'
import type {
  CategorizationResult,
  KnowledgeCategory,
  KnowledgeDoc,
  KnowledgeIndex,
  KnowledgeRecentChange,
} from '../types'
import { rankCategoriesByRules } from './rules'

interface CategorizationBundle {
  results: Record<string, CategorizationResult>
  docByCategory: Record<string, string[]>
}

function toRecentChanges(
  docs: KnowledgeDoc[],
  results: Record<string, CategorizationResult>,
): KnowledgeRecentChange[] {
  return [...docs]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, 16)
    .map((doc) => ({
      docId: doc.id,
      title: doc.title,
      categoryId: results[doc.id]?.primaryCategoryId ?? 'uncategorized',
      updatedAt: doc.updatedAt,
      status: doc.status,
    }))
}

export function categorizeKnowledgeDocs(
  docs: KnowledgeDoc[],
  categories: KnowledgeCategory[],
): CategorizationBundle {
  const results: Record<string, CategorizationResult> = {}
  const docByCategory: Record<string, string[]> = {}

  for (const category of categories) {
    docByCategory[category.id] = []
  }
  if (!docByCategory.uncategorized) {
    docByCategory.uncategorized = []
  }

  const fallbackCategory = categories.find((category) => category.id === 'uncategorized')

  for (const doc of docs) {
    const ranked = rankCategoriesByRules(doc, categories)
    const top = ranked[0]

    const hasSignal = top && top.score > 0
    const primaryCategoryId = hasSignal
      ? top.categoryId
      : fallbackCategory?.id ?? 'uncategorized'

    const secondaryCategoryIds = ranked
      .filter((score) => score.categoryId !== primaryCategoryId && score.score > 0)
      .slice(0, 3)
      .map((score) => score.categoryId)

    results[doc.id] = {
      primaryCategoryId,
      secondaryCategoryIds,
      confidence: hasSignal ? Math.min(1, top.score / 100) : 0.05,
      reasons: hasSignal ? top.reasons : ['fallback to uncategorized'],
    }

    if (doc.status === 'active') {
      if (!docByCategory[primaryCategoryId]) {
        docByCategory[primaryCategoryId] = []
      }
      docByCategory[primaryCategoryId].push(doc.id)
    }
  }

  return { results, docByCategory }
}

export function rebuildKnowledgeIndex(
  index: KnowledgeIndex,
  options?: LibraryLayoutOptions,
): KnowledgeIndex {
  const categorized = categorizeKnowledgeDocs(index.docs, index.categories)

  return {
    ...index,
    categorizationResults: categorized.results,
    docByCategory: categorized.docByCategory,
    recentChanges: toRecentChanges(index.docs, categorized.results),
    layout: buildLibraryLayout(index.categories, categorized.docByCategory, options),
  }
}
