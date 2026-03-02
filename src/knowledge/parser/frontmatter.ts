import type { KnowledgeDoc, KnowledgeDraftInput } from '../types'

interface ParsedFrontmatter {
  attributes: Record<string, string | string[]>
  body: string
}

function parseArrayLiteral(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return trimmed
    .slice(1, -1)
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

function parseScalar(value: string): string | string[] {
  const trimmed = value.trim()
  if (trimmed.startsWith('[')) {
    return parseArrayLiteral(trimmed)
  }

  return trimmed.replace(/^['"]|['"]$/g, '')
}

function parseFrontmatter(markdown: string): ParsedFrontmatter {
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

  const attributes: Record<string, string | string[]> = {}
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

function ensureString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid frontmatter field: ${field}`)
  }
  return value.trim()
}

function ensureArray(value: unknown, field: string): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => ensureString(item, field))
  }

  if (typeof value === 'string') {
    return parseArrayLiteral(value)
  }

  throw new Error(`Invalid frontmatter field: ${field}`)
}

function ensureIsoDate(value: unknown, field: string): string {
  const iso = ensureString(value, field)
  if (Number.isNaN(Date.parse(iso))) {
    throw new Error(`Invalid ISO date in field: ${field}`)
  }
  return iso
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function parseKnowledgeMarkdown(markdown: string, fallbackId = ''): KnowledgeDoc {
  const parsed = parseFrontmatter(markdown)
  const attributes = parsed.attributes

  const title = ensureString(attributes.title, 'title')
  const idSource = (attributes.id as string | undefined) ?? fallbackId ?? title
  const id = slugify(ensureString(idSource, 'id'))

  return {
    id,
    title,
    summary: ensureString(attributes.summary, 'summary'),
    tags: ensureArray(attributes.tags ?? [], 'tags'),
    categoryHint:
      typeof attributes.categoryHint === 'string' && attributes.categoryHint.trim()
        ? attributes.categoryHint.trim()
        : undefined,
    createdAt: ensureIsoDate(attributes.createdAt, 'createdAt'),
    updatedAt: ensureIsoDate(attributes.updatedAt, 'updatedAt'),
    body: parsed.body,
    status: attributes.status === 'archived' ? 'archived' : 'active',
  }
}

export function serializeKnowledgeDraftToMarkdown(input: KnowledgeDraftInput, id: string): string {
  const tagsLiteral = `[${input.tags.map((tag) => tag.trim()).filter(Boolean).join(', ')}]`
  const nowIso = new Date().toISOString()
  const categoryHintLine = input.categoryHint ? `categoryHint: ${input.categoryHint}\n` : ''

  return `---\nid: ${id}\ntitle: ${input.title}\nsummary: ${input.summary}\ntags: ${tagsLiteral}\n${categoryHintLine}createdAt: ${nowIso}\nupdatedAt: ${nowIso}\n---\n${input.body.trim()}\n`
}
