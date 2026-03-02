import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const KNOWLEDGE_DIR = path.join(ROOT_DIR, 'content/knowledge')
const CATEGORIES_PATH = path.join(ROOT_DIR, 'content/taxonomy/categories.json')
const OUTPUT_PATH = path.join(ROOT_DIR, 'public/data/knowledge-index.json')

const DEFAULT_LAYOUT_SETTINGS = {
  baseLength: 2,
  bayLength: 1,
  docsPerBay: 12,
  maxVisibleBaysPerLane: 9,
  laneGapX: 4.2,
  laneBaseX: 9.5,
  laneStartZ: 8,
  laneBaySpacingZ: 6,
}

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function parseArrayLiteral(value) {
  const trimmed = value.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return trimmed.split(',').map((item) => item.trim()).filter(Boolean)
  }

  return trimmed
    .slice(1, -1)
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

function parseScalar(value) {
  const trimmed = value.trim()
  if (trimmed.startsWith('[')) {
    return parseArrayLiteral(trimmed)
  }
  return trimmed.replace(/^['"]|['"]$/g, '')
}

function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, '\n')
  if (!normalized.startsWith('---\n')) {
    return { attributes: {}, body: normalized.trim() }
  }

  const closeIndex = normalized.indexOf('\n---\n', 4)
  if (closeIndex < 0) {
    return { attributes: {}, body: normalized.trim() }
  }

  const rawFrontmatter = normalized.slice(4, closeIndex)
  const body = normalized.slice(closeIndex + 5).trim()
  const attributes = {}

  for (const line of rawFrontmatter.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const delimiterIndex = trimmed.indexOf(':')
    if (delimiterIndex < 0) {
      continue
    }

    const key = trimmed.slice(0, delimiterIndex).trim()
    const value = trimmed.slice(delimiterIndex + 1).trim()
    attributes[key] = parseScalar(value)
  }

  return { attributes, body }
}

function ensureString(value, field, fileName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid ${field} in ${fileName}`)
  }
  return value.trim()
}

function ensureIsoDate(value, field, fileName) {
  const iso = ensureString(value, field, fileName)
  if (Number.isNaN(Date.parse(iso))) {
    throw new Error(`Invalid ISO date in ${field} for ${fileName}`)
  }
  return iso
}

function tokenize(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function scoreCategory(doc, category) {
  if (doc.categoryHint && doc.categoryHint === category.id) {
    return {
      categoryId: category.id,
      score: 10_000,
      reasons: ['categoryHint exact match'],
    }
  }

  const tagSet = new Set(doc.tags.map((tag) => tag.toLowerCase()))
  const aliasHits = category.tagAliases.filter((alias) => tagSet.has(alias.toLowerCase())).length

  const words = tokenize(`${doc.title} ${doc.summary} ${doc.body}`)
  const keywordSet = new Set(category.keywords.map((keyword) => keyword.toLowerCase()))
  const keywordHits = words.reduce((hits, word) => hits + (keywordSet.has(word) ? 1 : 0), 0)

  const reasons = []
  if (aliasHits > 0) {
    reasons.push(`tag alias hits: ${aliasHits}`)
  }
  if (keywordHits > 0) {
    reasons.push(`keyword hits: ${keywordHits}`)
  }

  return {
    categoryId: category.id,
    score: aliasHits * 28 + keywordHits * 6,
    reasons,
  }
}

function categorizeDocs(docs, categories) {
  const results = {}
  const docByCategory = {}

  for (const category of categories) {
    docByCategory[category.id] = []
  }

  for (const doc of docs) {
    const ranked = categories
      .map((category) => scoreCategory(doc, category))
      .sort((a, b) => b.score - a.score)

    const top = ranked[0]
    const hasSignal = top && top.score > 0
    const primaryCategoryId = hasSignal ? top.categoryId : 'uncategorized'

    results[doc.id] = {
      primaryCategoryId,
      secondaryCategoryIds: ranked
        .filter((candidate) => candidate.categoryId !== primaryCategoryId && candidate.score > 0)
        .slice(0, 3)
        .map((candidate) => candidate.categoryId),
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

function createLayout(categories, docByCategory) {
  const lanes = categories
    .filter((category) => category.id === 'uncategorized' || (docByCategory[category.id]?.length ?? 0) > 0)
    .map((category, laneIndex) => {
      const side = laneIndex % 2 === 0 ? 'left' : 'right'
      const sideIndex = Math.floor(laneIndex / 2)
      const docIds = docByCategory[category.id] ?? []
      const bayCount =
        DEFAULT_LAYOUT_SETTINGS.baseLength +
        DEFAULT_LAYOUT_SETTINGS.bayLength * Math.ceil(docIds.length / DEFAULT_LAYOUT_SETTINGS.docsPerBay)
      const visibleBayCount = Math.min(bayCount, DEFAULT_LAYOUT_SETTINGS.maxVisibleBaysPerLane)

      return {
        id: `lane.${category.id}`,
        categoryId: category.id,
        label: category.label,
        side,
        x:
          (side === 'left' ? -1 : 1) *
          (DEFAULT_LAYOUT_SETTINGS.laneBaseX + sideIndex * DEFAULT_LAYOUT_SETTINGS.laneGapX),
        zStart: DEFAULT_LAYOUT_SETTINGS.laneStartZ,
        bayCount,
        visibleBayCount,
        docCount: docIds.length,
        compressedDocCount: Math.max(0, docIds.length - visibleBayCount * DEFAULT_LAYOUT_SETTINGS.docsPerBay),
        docIds,
      }
    })

  const docAnchors = []
  for (const lane of lanes) {
    lane.docIds.slice(0, 6).forEach((docId, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const xOffset = lane.side === 'left' ? 1.45 : -1.45
      const zOffset = -1.2 * column
      const y = 1.4 + row * 0.18

      docAnchors.push({
        id: `anchor.${lane.categoryId}.${docId}`,
        docId,
        categoryId: lane.categoryId,
        position: [lane.x + xOffset, y, lane.zStart + 0.7 + zOffset],
      })
    })
  }

  const interactables = [
    {
      id: 'library.librarianDesk',
      kind: 'librarian',
      label: 'Librarian Console',
      position: [0, 1.2, 12.6],
    },
    ...lanes.map((lane) => ({
      id: `library.category.${lane.categoryId}`,
      kind: 'category',
      label: `Category: ${lane.label}`,
      targetId: lane.categoryId,
      position: [lane.x + (lane.side === 'left' ? 1.7 : -1.7), 2.15, lane.zStart + 1.5],
    })),
    ...docAnchors.map((anchor) => ({
      id: `library.doc.${anchor.docId}`,
      kind: 'doc',
      label: 'Open note',
      targetId: anchor.docId,
      position: anchor.position,
    })),
  ]

  return {
    settings: DEFAULT_LAYOUT_SETTINGS,
    lanes,
    docAnchors,
    interactables,
  }
}

async function parseKnowledgeDoc(filePath, fileName) {
  const markdown = await fs.readFile(filePath, 'utf8')
  const { attributes, body } = parseFrontmatter(markdown)

  const title = ensureString(attributes.title, 'title', fileName)
  const id = slugify(attributes.id ? ensureString(attributes.id, 'id', fileName) : title)

  return {
    id,
    title,
    summary: ensureString(attributes.summary, 'summary', fileName),
    tags: Array.isArray(attributes.tags) ? attributes.tags : parseArrayLiteral(String(attributes.tags ?? '')),
    categoryHint:
      typeof attributes.categoryHint === 'string' && attributes.categoryHint.trim()
        ? attributes.categoryHint.trim()
        : undefined,
    createdAt: ensureIsoDate(attributes.createdAt, 'createdAt', fileName),
    updatedAt: ensureIsoDate(attributes.updatedAt, 'updatedAt', fileName),
    body,
    status: attributes.status === 'archived' ? 'archived' : 'active',
  }
}

async function main() {
  const categories = JSON.parse(await fs.readFile(CATEGORIES_PATH, 'utf8'))
  const dirEntries = await fs.readdir(KNOWLEDGE_DIR, { withFileTypes: true })
  const markdownFiles = dirEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort()

  const docs = []
  for (const fileName of markdownFiles) {
    const filePath = path.join(KNOWLEDGE_DIR, fileName)
    const doc = await parseKnowledgeDoc(filePath, fileName)
    docs.push(doc)
  }

  const categorized = categorizeDocs(docs, categories)
  const recentChanges = [...docs]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, 16)
    .map((doc) => ({
      docId: doc.id,
      title: doc.title,
      categoryId: categorized.results[doc.id]?.primaryCategoryId ?? 'uncategorized',
      updatedAt: doc.updatedAt,
      status: doc.status,
    }))

  const payload = {
    generatedAt: new Date().toISOString(),
    categories,
    docs,
    categorizationResults: categorized.results,
    docByCategory: categorized.docByCategory,
    recentChanges,
    layout: createLayout(categories, categorized.docByCategory),
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  console.log(`Knowledge index generated at ${OUTPUT_PATH}`)
  console.log(`Categories: ${categories.length}, docs: ${docs.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
