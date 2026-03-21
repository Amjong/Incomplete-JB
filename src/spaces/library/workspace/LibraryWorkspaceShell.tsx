import { startTransition, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { KnowledgeIndex } from '../../../knowledge/types'
import { slugifyWorkspaceTitle, useLibraryWorkspaceStore, type WorkspaceDocument } from '../../../store/useLibraryWorkspaceStore'

interface LibraryWorkspaceShellProps {
  index: KnowledgeIndex
  onClose: () => void
}

interface PropertyEntry {
  key: string
  value: string
}

interface ParsedBlock {
  id: string
  blockId: string
  order: number
  docId: string
  docTitle: string
  docSlug: string
  raw: string
  line: string
  properties: PropertyEntry[]
  indent: number
  kind: 'bullet' | 'heading' | 'paragraph' | 'code'
  content: string
}

interface ParsedDoc {
  doc: WorkspaceDocument
  pageProperties: PropertyEntry[]
  blocks: ParsedBlock[]
  excerpt: string
}

interface WorkspaceGraph {
  parsedDocs: ParsedDoc[]
  docById: Map<string, ParsedDoc>
  docByKey: Map<string, ParsedDoc>
  blockById: Map<string, ParsedBlock>
  pageBacklinks: Map<string, ParsedBlock[]>
  blockBacklinks: Map<string, ParsedBlock[]>
}

interface BlockHierarchyMeta {
  childCountById: Map<string, number>
}

const PROPERTY_PATTERN = /^([A-Za-z][A-Za-z0-9_./?+\-]*)::\s*(.*)$/
const PAGE_REFERENCE_PATTERN = /\[\[([^\]]+)\]\]/g
const BLOCK_REFERENCE_PATTERN = /\(\(([^)]+)\)\)/g
const PAGE_EMBED_PATTERN = /^\{\{\s*(?:\[\[embed\]\]\s*:|embed\s+)\[\[([^\]]+)\]\]\s*\}\}$/
const BLOCK_EMBED_PATTERN = /^\{\{\s*(?:\[\[embed\]\]\s*:|embed\s+)\(\(([^)]+)\)\)\s*\}\}$/

function formatDate(value: string) {
  const stamp = Date.parse(value)
  if (Number.isNaN(stamp)) {
    return 'No timestamp'
  }

  return new Date(stamp).toLocaleString()
}

function getIndent(value: string) {
  const leading = value.match(/^[\t ]*/)
  const rawIndent = leading?.[0] ?? ''
  return rawIndent.replace(/\t/g, '  ').length
}

function parsePropertyLine(value: string): PropertyEntry | null {
  const match = value.trim().match(PROPERTY_PATTERN)
  if (!match) {
    return null
  }

  return {
    key: match[1],
    value: match[2],
  }
}

function serializeProperties(properties: PropertyEntry[]) {
  return properties.map((property) => `${property.key}:: ${property.value}`)
}

function getEditableBlockText(block: ParsedBlock) {
  if (block.kind === 'bullet') {
    return block.content
  }

  return block.raw
}

function serializeEditedBlock(block: ParsedBlock, nextText: string) {
  const normalized = nextText.replace(/\r\n/g, '\n').trimEnd()

  if (block.kind === 'bullet') {
    if (!normalized.trim()) {
      return '-'
    }

    const [firstLine, ...rest] = normalized.split('\n')
    return [`- ${firstLine.trimStart()}`, ...rest].join('\n')
  }

  if (!normalized.trim()) {
    return ''
  }

  return normalized
}

function createSiblingBlockRaw(block: ParsedBlock, nextText: string) {
  const serialized = serializeEditedBlock(block, nextText)
  if (serialized) {
    return serialized
  }

  return '-'
}

function isCaretOnFirstLine(textarea: HTMLTextAreaElement) {
  return !textarea.value.slice(0, textarea.selectionStart).includes('\n')
}

function isCaretOnLastLine(textarea: HTMLTextAreaElement) {
  return !textarea.value.slice(textarea.selectionEnd).includes('\n')
}

function createWorkspaceBlockId(docId: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${docId}-${crypto.randomUUID()}`
  }

  return `${docId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function getSubtreeInsertionIndex(blocks: ParsedBlock[], blockOrder: number) {
  const currentBlock = blocks[blockOrder]
  if (!currentBlock) {
    return blocks.length
  }

  let cursor = blockOrder + 1
  while (cursor < blocks.length && blocks[cursor]!.indent > currentBlock.indent) {
    cursor += 1
  }

  return cursor
}

function insertBlockAt(parsedDoc: ParsedDoc, insertAt: number, nextRaw: string) {
  const normalized = nextRaw.replace(/\r\n/g, '\n').trimEnd()
  if (normalized === '') {
    return serializeParsedDoc(parsedDoc.pageProperties, parsedDoc.blocks)
  }

  const anchor = parsedDoc.blocks.at(Math.max(0, insertAt - 1)) ?? parsedDoc.blocks[0]
  const blockId = `virtual-insert-${insertAt}`
  const nextBlocks = [...parsedDoc.blocks]

  nextBlocks.splice(insertAt, 0, {
    ...(anchor ?? parsedDoc.blocks[0]!),
    id: `${parsedDoc.doc.id}-${blockId}`,
    blockId,
    order: insertAt,
    raw: normalized,
    line: normalized,
    content: normalized.trim(),
    properties: [],
  })

  return serializeParsedDoc(parsedDoc.pageProperties, nextBlocks)
}

function parseWorkspaceDocument(doc: WorkspaceDocument): ParsedDoc {
  const lines = doc.body.replace(/\r\n/g, '\n').split('\n')
  const pageProperties: PropertyEntry[] = []
  const blocks: ParsedBlock[] = []

  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '') {
      index += 1
      continue
    }

    if (getIndent(line) !== 0) {
      break
    }

    const property = parsePropertyLine(line)
    if (!property) {
      break
    }

    pageProperties.push(property)
    index += 1
  }

  let blockCount = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (trimmed === '') {
      index += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      const codeLines = [line]
      let cursor = index + 1

      while (cursor < lines.length) {
        codeLines.push(lines[cursor])
        if (lines[cursor].trim().startsWith('```')) {
          cursor += 1
          break
        }
        cursor += 1
      }

      const blockId = doc.blockIds[blockCount] ?? `${doc.id}-b${blockCount + 1}`
      blocks.push({
        id: `${doc.id}-${blockId}`,
        blockId,
        order: blockCount,
        docId: doc.id,
        docTitle: doc.title,
        docSlug: doc.slug,
        raw: codeLines.join('\n'),
        line,
        properties: [],
        indent: doc.blockDepths[blockCount] ?? 0,
        kind: 'code',
        content: codeLines.join('\n'),
      })
      blockCount += 1
      index = cursor
      continue
    }

    const indent = getIndent(line)
    const propertyLines: string[] = []
    const properties: PropertyEntry[] = []
    let cursor = index + 1

    while (cursor < lines.length) {
      const nextLine = lines[cursor]
      if (nextLine.trim() === '') {
        break
      }

      const nextProperty = parsePropertyLine(nextLine)
      if (!nextProperty || getIndent(nextLine) <= indent) {
        break
      }

      propertyLines.push(nextLine)
      properties.push(nextProperty)
      cursor += 1
    }

    const trimmedLine = line.trimStart()
    const kind: ParsedBlock['kind'] = /^[-*](\s+|$)/.test(trimmedLine)
      ? 'bullet'
      : /^(#{1,4})\s+/.test(trimmedLine)
        ? 'heading'
        : 'paragraph'

    const content = kind === 'bullet'
      ? trimmedLine.replace(/^[-*]\s*/, '')
      : kind === 'heading'
        ? trimmedLine.replace(/^#{1,4}\s+/, '')
        : trimmedLine

    const propertyBlockId = properties.find((property) => property.key.toLowerCase() === 'id')?.value.trim()
    const blockId = (doc.blockIds[blockCount] ?? propertyBlockId) || `${doc.id}-b${blockCount + 1}`

    blocks.push({
      id: `${doc.id}-${blockId}-${blockCount}`,
      blockId,
      order: blockCount,
      docId: doc.id,
      docTitle: doc.title,
      docSlug: doc.slug,
      raw: [line, ...propertyLines].join('\n'),
      line,
      properties,
      indent: doc.blockDepths[blockCount] ?? indent,
      kind,
      content,
    })

    blockCount += 1
    index = cursor
  }

  const excerpt = blocks.find((block) => block.content.trim().length > 0)?.content ?? 'Empty page'

  return {
    doc,
    pageProperties,
    blocks,
    excerpt,
  }
}

function serializeParsedDoc(pageProperties: PropertyEntry[], blocks: ParsedBlock[]) {
  return [...serializeProperties(pageProperties), ...blocks.map((block) => block.raw)].join('\n')
}

function buildBlockHierarchyMeta(blocks: ParsedBlock[]): BlockHierarchyMeta {
  const childCountById = new Map<string, number>()
  const stack: ParsedBlock[] = []

  for (const block of blocks) {
    const blockIndent = block.indent

    while (stack.length > 0 && stack.at(-1)!.indent >= blockIndent) {
      stack.pop()
    }

    const parent = stack.at(-1)
    if (parent) {
      childCountById.set(parent.blockId, (childCountById.get(parent.blockId) ?? 0) + 1)
    }

    stack.push(block)
  }

  return { childCountById }
}

function getVisibleBlocks(
  blocks: ParsedBlock[],
  collapsedBlocks: Record<string, boolean>,
) {
  const visible: ParsedBlock[] = []
  const stack: Array<{ indent: number; collapsed: boolean }> = []

  for (const block of blocks) {
    while (stack.length > 0 && stack.at(-1)!.indent >= block.indent) {
      stack.pop()
    }

    const hidden = stack.some((entry) => entry.collapsed)
    if (!hidden) {
      visible.push(block)
    }

    stack.push({
      indent: block.indent,
      collapsed: Boolean(collapsedBlocks[block.blockId]),
    })
  }

  return visible
}

function extractPageReferences(text: string) {
  return Array.from(text.matchAll(PAGE_REFERENCE_PATTERN), (match) => match[1].trim()).filter(Boolean)
}

function extractBlockReferences(text: string) {
  return Array.from(text.matchAll(BLOCK_REFERENCE_PATTERN), (match) => match[1].trim()).filter(Boolean)
}

function parsePageEmbed(text: string) {
  return text.trim().match(PAGE_EMBED_PATTERN)?.[1]?.trim() ?? null
}

function parseBlockEmbed(text: string) {
  return text.trim().match(BLOCK_EMBED_PATTERN)?.[1]?.trim() ?? null
}

function buildWorkspaceGraph(docs: WorkspaceDocument[]) {
  const parsedDocs = docs.map(parseWorkspaceDocument)
  const docById = new Map<string, ParsedDoc>()
  const docByKey = new Map<string, ParsedDoc>()
  const blockById = new Map<string, ParsedBlock>()
  const pageBacklinks = new Map<string, ParsedBlock[]>()
  const blockBacklinks = new Map<string, ParsedBlock[]>()

  for (const parsedDoc of parsedDocs) {
    docById.set(parsedDoc.doc.id, parsedDoc)
    docByKey.set(parsedDoc.doc.slug, parsedDoc)
    docByKey.set(slugifyWorkspaceTitle(parsedDoc.doc.title), parsedDoc)

    for (const block of parsedDoc.blocks) {
      blockById.set(block.blockId, block)
    }
  }

  for (const parsedDoc of parsedDocs) {
    for (const block of parsedDoc.blocks) {
      const referenceText = [block.content, ...block.properties.map((property) => property.value)].join(' ')
      const pageRefs = extractPageReferences(referenceText)
      const blockRefs = extractBlockReferences(referenceText)
      const pageEmbed = parsePageEmbed(block.content)
      const blockEmbed = parseBlockEmbed(block.content)

      for (const pageRef of [...pageRefs, ...(pageEmbed ? [pageEmbed] : [])]) {
        const targetDoc = docByKey.get(slugifyWorkspaceTitle(pageRef))
        if (!targetDoc) {
          continue
        }

        const bucket = pageBacklinks.get(targetDoc.doc.id) ?? []
        bucket.push(block)
        pageBacklinks.set(targetDoc.doc.id, bucket)
      }

      for (const blockRef of [...blockRefs, ...(blockEmbed ? [blockEmbed] : [])]) {
        const targetBlock = blockById.get(blockRef)
        if (!targetBlock) {
          continue
        }

        const bucket = blockBacklinks.get(targetBlock.blockId) ?? []
        bucket.push(block)
        blockBacklinks.set(targetBlock.blockId, bucket)
      }
    }
  }

  return {
    parsedDocs,
    docById,
    docByKey,
    blockById,
    pageBacklinks,
    blockBacklinks,
  } satisfies WorkspaceGraph
}

function replaceBlockInDoc(parsedDoc: ParsedDoc, blockId: string, nextRaw: string) {
  const normalized = nextRaw.replace(/\r\n/g, '\n').trimEnd()
  const nextBlocks = parsedDoc.blocks.flatMap((block) => {
    if (block.blockId !== blockId) {
      return [block]
    }

    if (normalized === '') {
      return []
    }

    return [{ ...block, raw: normalized }]
  })

  return serializeParsedDoc(parsedDoc.pageProperties, nextBlocks)
}

function replacePagePropertiesInDoc(parsedDoc: ParsedDoc, nextText: string) {
  const nextProperties = nextText
    .split('\n')
    .map((line) => parsePropertyLine(line))
    .filter((property): property is PropertyEntry => Boolean(property))

  return serializeParsedDoc(nextProperties, parsedDoc.blocks)
}

function formatBlockReference(blockId: string) {
  return `((${blockId}))`
}

function groupBlocksByDoc(blocks: ParsedBlock[]) {
  const map = new Map<string, ParsedBlock[]>()

  for (const block of blocks) {
    const bucket = map.get(block.docId) ?? []
    bucket.push(block)
    map.set(block.docId, bucket)
  }

  return [...map.entries()]
}

function renderBlockPreview(block: ParsedBlock) {
  if (block.kind === 'code') {
    const lines = block.raw.split('\n')
    const codeBody =
      lines[0].trim().startsWith('```') ? lines.slice(1, lines.at(-1)?.trim().startsWith('```') ? -1 : undefined) : lines

    return (
      <pre>
        <code>{codeBody.join('\n')}</code>
      </pre>
    )
  }

  const offset = Math.min(block.indent, 24)
  const style = { marginLeft: `${offset * 0.7}px` }

  if (block.kind === 'heading') {
    const heading = block.line.trimStart().match(/^(#{1,4})\s+(.+)$/)
    const depth = heading?.[1].length ?? 1
    const value = heading?.[2] ?? block.content

    if (depth === 1) {
      return <h1 style={style}>{value}</h1>
    }

    if (depth === 2) {
      return <h2 style={style}>{value}</h2>
    }

    return <h3 style={style}>{value}</h3>
  }

  if (block.kind === 'bullet') {
    return (
      <div className="library-workspace-block-row" style={style}>
        <span className="library-workspace-block-bullet" />
        <p>{block.content}</p>
      </div>
    )
  }

  return <p style={style}>{block.content}</p>
}

function InlineText({
  text,
  graph,
  onSelectDoc,
  onSelectBlock,
}: {
  text: string
  graph: WorkspaceGraph
  onSelectDoc: (docId: string) => void
  onSelectBlock: (blockId: string) => void
}) {
  const nodes: ReactNode[] = []
  const pattern = /(\[\[[^\]]+\]\]|\(\([^)]+\)\)|#[\w-]+)/g
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const value = match[0]
    const start = match.index ?? 0

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start))
    }

    if (value.startsWith('[[')) {
      const pageTitle = value.slice(2, -2).trim()
      const targetDoc = graph.docByKey.get(slugifyWorkspaceTitle(pageTitle))

      nodes.push(
        <button
          className={targetDoc ? 'library-workspace-inline-link' : 'library-workspace-inline-link is-missing'}
          key={`${value}-${start}`}
          onClick={() => {
            if (targetDoc) {
              onSelectDoc(targetDoc.doc.id)
            }
          }}
          title={targetDoc ? targetDoc.excerpt : 'Missing page'}
          type="button"
        >
          {value}
        </button>,
      )
    } else if (value.startsWith('((')) {
      const blockId = value.slice(2, -2).trim()
      const targetBlock = graph.blockById.get(blockId)

      nodes.push(
        <button
          className={targetBlock ? 'library-workspace-inline-link is-block' : 'library-workspace-inline-link is-missing'}
          key={`${value}-${start}`}
          onClick={() => {
            if (targetBlock) {
              onSelectDoc(targetBlock.docId)
              onSelectBlock(targetBlock.blockId)
            }
          }}
          title={targetBlock ? `${targetBlock.docTitle}: ${targetBlock.content}` : 'Missing block'}
          type="button"
        >
          {value}
        </button>,
      )
    } else {
      nodes.push(
        <span className="library-workspace-inline-tag" key={`${value}-${start}`}>
          {value}
        </span>,
      )
    }

    lastIndex = start + value.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return <>{nodes.length > 0 ? nodes : text}</>
}

function BlockEmbedCard({
  targetBlock,
}: {
  targetBlock: ParsedBlock | null
}) {
  if (!targetBlock) {
    return <div className="library-workspace-embed-card is-missing">Missing block embed target.</div>
  }

  return (
    <div className="library-workspace-embed-card">
      <div className="library-workspace-embed-header">
        <span>Block Embed</span>
        <small>{targetBlock.docTitle}</small>
      </div>
      <div className="library-workspace-embed-body">{renderBlockPreview(targetBlock)}</div>
    </div>
  )
}

function PageEmbedCard({
  targetDoc,
}: {
  targetDoc: ParsedDoc | null
}) {
  if (!targetDoc) {
    return <div className="library-workspace-embed-card is-missing">Missing page embed target.</div>
  }

  return (
    <div className="library-workspace-embed-card">
      <div className="library-workspace-embed-header">
        <span>Page Embed</span>
        <small>{targetDoc.doc.title}</small>
      </div>
      <div className="library-workspace-embed-body">
        {targetDoc.blocks.slice(0, 4).map((block) => (
          <div className="library-workspace-embed-block" key={block.id}>
            {renderBlockPreview(block)}
          </div>
        ))}
      </div>
    </div>
  )
}

function getBlockDepth(effectiveIndent: number) {
  return Math.max(0, effectiveIndent)
}

function BlockTreeFrame({
  depth,
  hasChildren,
  collapsed,
  onToggleCollapse,
  children,
}: {
  depth: number
  hasChildren: boolean
  collapsed: boolean
  onToggleCollapse: () => void
  children: ReactNode
}) {
  return (
    <div className="library-workspace-tree-row">
      <div className="library-workspace-tree-gutter">
        {Array.from({ length: depth }, (_, index) => (
          <span className="library-workspace-tree-guide" key={`guide-${index}`} />
        ))}

        <button
          className={hasChildren ? 'library-workspace-block-bullet-button is-parent' : 'library-workspace-block-bullet-button'}
          onClick={(event) => {
            event.stopPropagation()
            if (hasChildren) {
              onToggleCollapse()
            }
          }}
          title={hasChildren ? (collapsed ? 'Expand children' : 'Collapse children') : 'Block marker'}
          type="button"
        >
          <span
            className={
              hasChildren
                ? collapsed
                  ? 'library-workspace-block-caret is-collapsed'
                  : 'library-workspace-block-caret'
                : 'library-workspace-block-caret is-leaf'
            }
          />
        </button>
      </div>

      <div className="library-workspace-tree-content">{children}</div>
    </div>
  )
}

function BlockBody({
  block,
  graph,
  effectiveIndent,
  hasChildren,
  collapsed,
  onToggleCollapse,
  onSelectDoc,
  onSelectBlock,
}: {
  block: ParsedBlock
  graph: WorkspaceGraph
  effectiveIndent: number
  hasChildren: boolean
  collapsed: boolean
  onToggleCollapse: () => void
  onSelectDoc: (docId: string) => void
  onSelectBlock: (blockId: string) => void
}) {
  const pageEmbed = parsePageEmbed(block.content)
  const blockEmbed = parseBlockEmbed(block.content)
  const depth = getBlockDepth(effectiveIndent)

  let body: ReactNode

  if (pageEmbed) {
    body = <PageEmbedCard targetDoc={graph.docByKey.get(slugifyWorkspaceTitle(pageEmbed)) ?? null} />
  } else if (blockEmbed) {
    body = <BlockEmbedCard targetBlock={graph.blockById.get(blockEmbed) ?? null} />
  } else if (block.kind === 'code') {
    const lines = block.raw.split('\n')
    const codeBody =
      lines[0].trim().startsWith('```') ? lines.slice(1, lines.at(-1)?.trim().startsWith('```') ? -1 : undefined) : lines

    body = (
      <pre>
        <code>{codeBody.join('\n')}</code>
      </pre>
    )
  } else if (block.kind === 'heading') {
    const heading = block.line.trimStart().match(/^(#{1,4})\s+(.+)$/)
    const headingDepth = heading?.[1].length ?? 1
    const value = heading?.[2] ?? block.content

    if (headingDepth === 1) {
      body = (
        <h1>
          <InlineText graph={graph} onSelectBlock={onSelectBlock} onSelectDoc={onSelectDoc} text={value} />
        </h1>
      )
    } else if (headingDepth === 2) {
      body = (
        <h2>
          <InlineText graph={graph} onSelectBlock={onSelectBlock} onSelectDoc={onSelectDoc} text={value} />
        </h2>
      )
    } else {
      body = (
        <h3>
          <InlineText graph={graph} onSelectBlock={onSelectBlock} onSelectDoc={onSelectDoc} text={value} />
        </h3>
      )
    }
  } else {
    body = (
      <p>
        <InlineText graph={graph} onSelectBlock={onSelectBlock} onSelectDoc={onSelectDoc} text={block.content} />
      </p>
    )
  }

  return (
    <BlockTreeFrame collapsed={collapsed} depth={depth} hasChildren={hasChildren} onToggleCollapse={onToggleCollapse}>
      {body}
    </BlockTreeFrame>
  )
}

function PagePropertiesLayer({
  parsedDoc,
}: {
  parsedDoc: ParsedDoc
}) {
  const updateDocument = useLibraryWorkspaceStore((state) => state.updateDocument)
  const [isEditing, setIsEditing] = useState(false)
  const [draftText, setDraftText] = useState(serializeProperties(parsedDoc.pageProperties).join('\n'))

  useEffect(() => {
    setDraftText(serializeProperties(parsedDoc.pageProperties).join('\n'))
    setIsEditing(false)
  }, [parsedDoc.doc.id, parsedDoc.pageProperties])

  const commit = () => {
    updateDocument(parsedDoc.doc.id, {
      body: replacePagePropertiesInDoc(parsedDoc, draftText),
    })
    setIsEditing(false)
  }

  return (
    <div className="library-workspace-page-layer">
      <div className="library-workspace-page-label-row">
        <span className="library-workspace-page-label">Page Properties</span>
        <button className="library-workspace-secondary" onClick={() => setIsEditing(!isEditing)} type="button">
          {isEditing ? 'Collapse' : parsedDoc.pageProperties.length > 0 ? 'Edit' : 'Add'}
        </button>
      </div>

      {isEditing ? (
        <textarea
          className="library-workspace-property-editor"
          onBlur={commit}
          onChange={(event) => setDraftText(event.target.value)}
          placeholder="type:: [[Feature]]&#10;alias:: my-page"
          rows={Math.max(3, draftText.split('\n').length + 1)}
          value={draftText}
        />
      ) : parsedDoc.pageProperties.length > 0 ? (
        <div className="library-workspace-property-list">
          {parsedDoc.pageProperties.map((property) => (
            <div className="library-workspace-property-item" key={`${property.key}-${property.value}`}>
              <span>{property.key}</span>
              <strong>{property.value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="library-workspace-property-empty">No page properties.</p>
      )}
    </div>
  )
}

function PageTitleLayer({ doc }: { doc: WorkspaceDocument }) {
  const updateDocument = useLibraryWorkspaceStore((state) => state.updateDocument)
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(doc.title)

  useEffect(() => {
    setDraftTitle(doc.title)
    setIsEditing(false)
  }, [doc.id, doc.title])

  const commit = () => {
    const nextTitle = draftTitle.trim() || 'Untitled page'
    updateDocument(doc.id, { title: nextTitle })
    setDraftTitle(nextTitle)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="library-workspace-page-layer is-title">
        <span className="library-workspace-page-label">Page</span>
        <textarea
          autoFocus
          className="library-workspace-title-editor"
          onBlur={commit}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault()
              commit()
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              setDraftTitle(doc.title)
              setIsEditing(false)
            }
          }}
          rows={1}
          value={draftTitle}
        />
      </div>
    )
  }

  return (
    <button className="library-workspace-page-layer is-title" onClick={() => setIsEditing(true)} type="button">
      <span className="library-workspace-page-label">Page</span>
      <h1>{doc.title}</h1>
    </button>
  )
}

function HybridBodyLayer({
  parsedDoc,
  graph,
  focusedBlockId,
  onSelectDoc,
  onSelectBlock,
}: {
  parsedDoc: ParsedDoc
  graph: WorkspaceGraph
  focusedBlockId: string | null
  onSelectDoc: (docId: string) => void
  onSelectBlock: (blockId: string) => void
}) {
  const updateDocument = useLibraryWorkspaceStore((state) => state.updateDocument)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [activeDraft, setActiveDraft] = useState('')
  const [expandedBacklinks, setExpandedBacklinks] = useState<Record<string, boolean>>({})
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({})
  const [pendingFocusOrder, setPendingFocusOrder] = useState<number | null>(null)

  useEffect(() => {
    setActiveBlockId(null)
    setActiveDraft('')
    setExpandedBacklinks({})
    setCollapsedBlocks({})
    setPendingFocusOrder(null)
  }, [parsedDoc.doc.id])

  useEffect(() => {
    if (!focusedBlockId) {
      return
    }

    const target = document.getElementById(`library-block-${focusedBlockId}`)
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusedBlockId])

  useEffect(() => {
    if (pendingFocusOrder === null) {
      return
    }

    const targetBlock = parsedDoc.blocks[pendingFocusOrder]
    if (!targetBlock) {
      setPendingFocusOrder(null)
      return
    }

    setActiveBlockId(targetBlock.blockId)
    setActiveDraft(getEditableBlockText(targetBlock))
    setPendingFocusOrder(null)
  }, [parsedDoc.blocks, pendingFocusOrder])

  const hierarchy = useMemo(
    () => buildBlockHierarchyMeta(parsedDoc.blocks),
    [parsedDoc.blocks],
  )
  const visibleBlocks = useMemo(
    () => getVisibleBlocks(parsedDoc.blocks, collapsedBlocks),
    [collapsedBlocks, parsedDoc.blocks],
  )

  return (
    <div className="library-workspace-page-layer">
      <div className="library-workspace-page-label-row">
        <span className="library-workspace-page-label">Contents</span>
        <small>References, embeds, properties, and linked references are active.</small>
      </div>

      <div className="library-workspace-hybrid-flow">
        {visibleBlocks.map((block) => {
          const isActive = activeBlockId === block.blockId
          const inboundRefs = graph.blockBacklinks.get(block.blockId) ?? []
          const showBacklinks = expandedBacklinks[block.blockId]
          const isFocused = focusedBlockId === block.blockId
          const hasChildren = (hierarchy.childCountById.get(block.blockId) ?? 0) > 0
          const isCollapsed = Boolean(collapsedBlocks[block.blockId])
          const effectiveIndent = block.indent
          const depth = getBlockDepth(block.indent)

          if (isActive) {
            return (
              <div className="library-workspace-hybrid-block is-active" id={`library-block-${block.blockId}`} key={block.id}>
                <div className="library-workspace-block-shell">
                  <BlockTreeFrame
                    collapsed={isCollapsed}
                    depth={depth}
                    hasChildren={hasChildren}
                    onToggleCollapse={() =>
                      setCollapsedBlocks((state) => ({
                        ...state,
                        [block.blockId]: !state[block.blockId],
                      }))
                    }
                  >
                    <textarea
                      autoFocus
                      className="library-workspace-hybrid-editor"
                      onFocus={(event) => {
                        const target = event.currentTarget
                        const position = target.value.length
                        requestAnimationFrame(() => {
                          target.setSelectionRange(position, position)
                        })
                      }}
                      onBlur={() => {
                        const committedRaw = serializeEditedBlock(block, activeDraft)
                        updateDocument(parsedDoc.doc.id, {
                          body: replaceBlockInDoc(parsedDoc, block.blockId, committedRaw),
                          blockIds: parsedDoc.blocks.map((entry) => entry.blockId),
                        })
                        setActiveBlockId(null)
                        setActiveDraft('')
                      }}
                      onChange={(event) => setActiveDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Tab') {
                          event.preventDefault()
                          const nextBlockDepths = [...parsedDoc.doc.blockDepths]
                          nextBlockDepths[block.order] = Math.max(0, block.indent + (event.shiftKey ? -1 : 1))
                          updateDocument(parsedDoc.doc.id, {
                            blockDepths: nextBlockDepths,
                          })
                          return
                        }

                        if (event.key === 'Backspace') {
                          const textarea = event.currentTarget
                          const isCollapsedSelection = textarea.selectionStart === textarea.selectionEnd
                          const isAtBlockStart = textarea.selectionStart === 0
                          const isEmptyBlock = activeDraft.trim().length === 0

                          if (isCollapsedSelection && isAtBlockStart && isEmptyBlock) {
                            event.preventDefault()
                            const currentIndex = visibleBlocks.findIndex((entry) => entry.blockId === block.blockId)
                            const previousBlock = currentIndex > 0 ? visibleBlocks[currentIndex - 1] : null
                            const nextBlock = currentIndex >= 0 ? visibleBlocks[currentIndex + 1] ?? null : null

                            updateDocument(parsedDoc.doc.id, {
                              body: replaceBlockInDoc(parsedDoc, block.blockId, ''),
                              blockDepths: parsedDoc.doc.blockDepths.filter((_, index) => index !== block.order),
                              blockIds: parsedDoc.blocks.filter((entry) => entry.order !== block.order).map((entry) => entry.blockId),
                            })
                            setCollapsedBlocks((state) => {
                              const nextState = { ...state }
                              delete nextState[block.blockId]
                              return nextState
                            })
                            setExpandedBacklinks((state) => {
                              const nextState = { ...state }
                              delete nextState[block.blockId]
                              return nextState
                            })
                            setActiveBlockId(null)
                            setActiveDraft('')
                            setPendingFocusOrder(previousBlock?.order ?? nextBlock?.order ?? null)
                            return
                          }
                        }

                        if (
                          event.key === 'ArrowUp' ||
                          event.key === 'ArrowDown' ||
                          event.key === 'ArrowLeft' ||
                          event.key === 'ArrowRight'
                        ) {
                          const textarea = event.currentTarget
                          const isCollapsedSelection = textarea.selectionStart === textarea.selectionEnd

                          if (isCollapsedSelection) {
                            const currentIndex = visibleBlocks.findIndex((entry) => entry.blockId === block.blockId)
                            const previousBlock = currentIndex > 0 ? visibleBlocks[currentIndex - 1] : null
                            const nextBlock = currentIndex >= 0 ? visibleBlocks[currentIndex + 1] ?? null : null
                            const shouldGoPrevious =
                              (event.key === 'ArrowUp' && isCaretOnFirstLine(textarea)) ||
                              (event.key === 'ArrowLeft' && textarea.selectionStart === 0)
                            const shouldGoNext =
                              (event.key === 'ArrowDown' && isCaretOnLastLine(textarea)) ||
                              (event.key === 'ArrowRight' && textarea.selectionEnd === textarea.value.length)
                            const targetBlockOrder = shouldGoPrevious ? previousBlock?.order : shouldGoNext ? nextBlock?.order : null

                            if (targetBlockOrder !== null && targetBlockOrder !== undefined) {
                              event.preventDefault()
                              const committedRaw = serializeEditedBlock(block, activeDraft)
                              updateDocument(parsedDoc.doc.id, {
                                body: replaceBlockInDoc(parsedDoc, block.blockId, committedRaw),
                                blockIds: parsedDoc.blocks.map((entry) => entry.blockId),
                              })
                              setActiveBlockId(null)
                              setActiveDraft('')
                              setPendingFocusOrder(targetBlockOrder)
                              return
                            }
                          }
                        }

                        if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
                          event.preventDefault()
                          const textarea = event.currentTarget
                          const headText = activeDraft.slice(0, textarea.selectionStart)
                          const tailText = activeDraft.slice(textarea.selectionEnd)
                          const currentBlockRaw = createSiblingBlockRaw(block, headText)
                          const nextBody = replaceBlockInDoc(parsedDoc, block.blockId, currentBlockRaw)
                          const freshParsedDoc = parseWorkspaceDocument({ ...parsedDoc.doc, body: nextBody })
                          const nextBlockRaw = createSiblingBlockRaw(block, tailText)
                          const insertAt = getSubtreeInsertionIndex(freshParsedDoc.blocks, block.order)
                          const nextBlockAfterSubtree = freshParsedDoc.blocks[insertAt] ?? null
                          const nextBlockDepths = [...parsedDoc.doc.blockDepths]
                          const nextBlockIds = parsedDoc.blocks.map((entry) => entry.blockId)
                          const nextBlockDepth = nextBlockAfterSubtree ? nextBlockAfterSubtree.indent : 0
                          nextBlockIds.splice(insertAt, 0, createWorkspaceBlockId(parsedDoc.doc.id))
                          nextBlockDepths.splice(insertAt, 0, nextBlockDepth)
                          updateDocument(parsedDoc.doc.id, {
                            body: insertBlockAt(freshParsedDoc, insertAt, nextBlockRaw),
                            blockDepths: nextBlockDepths,
                            blockIds: nextBlockIds,
                          })
                          setActiveBlockId(null)
                          setActiveDraft('')
                          setPendingFocusOrder(insertAt)
                          return
                        }

                        if (event.key === 'Escape') {
                          event.preventDefault()
                          setActiveBlockId(null)
                          setActiveDraft('')
                        }
                      }}
                      rows={Math.max(1, activeDraft.split('\n').length)}
                      value={activeDraft}
                    />
                  </BlockTreeFrame>

                  <div className="library-workspace-block-toolbar">
                    <button
                      className="library-workspace-block-token"
                      onClick={() => {
                        void navigator.clipboard?.writeText(formatBlockReference(block.blockId))
                      }}
                      title="Copy block reference"
                      type="button"
                    >
                      {formatBlockReference(block.blockId)}
                    </button>

                    {inboundRefs.length > 0 ? (
                      <button
                        className="library-workspace-block-counter"
                        onClick={() =>
                          setExpandedBacklinks((state) => ({
                            ...state,
                            [block.blockId]: !state[block.blockId],
                          }))
                        }
                        title="Toggle linked references"
                        type="button"
                      >
                        {inboundRefs.length}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div
              className={
                isFocused ? 'library-workspace-hybrid-block is-focused' : 'library-workspace-hybrid-block'
              }
              id={`library-block-${block.blockId}`}
              key={block.id}
            >
              <div className="library-workspace-block-shell">
                <div
                  className="library-workspace-hybrid-block-surface"
                  onClick={() => {
                    setActiveBlockId(block.blockId)
                    setActiveDraft(getEditableBlockText(block))
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setActiveBlockId(block.blockId)
                      setActiveDraft(getEditableBlockText(block))
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <BlockBody
                    block={block}
                    collapsed={isCollapsed}
                    effectiveIndent={effectiveIndent}
                    graph={graph}
                    hasChildren={hasChildren}
                    onSelectBlock={onSelectBlock}
                    onSelectDoc={onSelectDoc}
                    onToggleCollapse={() =>
                      setCollapsedBlocks((state) => ({
                        ...state,
                        [block.blockId]: !state[block.blockId],
                      }))
                    }
                  />
                </div>

                <div className="library-workspace-block-toolbar">
                  <button
                    className="library-workspace-block-token"
                    onClick={() => {
                      void navigator.clipboard?.writeText(formatBlockReference(block.blockId))
                    }}
                    title="Copy block reference"
                    type="button"
                  >
                    {formatBlockReference(block.blockId)}
                  </button>

                  {inboundRefs.length > 0 ? (
                    <button
                      className="library-workspace-block-counter"
                      onClick={() =>
                        setExpandedBacklinks((state) => ({
                          ...state,
                          [block.blockId]: !state[block.blockId],
                        }))
                      }
                      title="Toggle linked references"
                      type="button"
                    >
                      {inboundRefs.length}
                    </button>
                  ) : null}
                </div>
              </div>

              {block.properties.length > 0 ? (
                <div className="library-workspace-block-properties">
                  {block.properties
                    .filter((property) => property.key.toLowerCase() !== 'id')
                    .map((property) => (
                      <div className="library-workspace-property-item" key={`${block.blockId}-${property.key}-${property.value}`}>
                        <span>{property.key}</span>
                        <strong>
                          <InlineText
                            graph={graph}
                            onSelectBlock={onSelectBlock}
                            onSelectDoc={onSelectDoc}
                            text={property.value}
                          />
                        </strong>
                      </div>
                    ))}
                </div>
              ) : null}

              {showBacklinks && inboundRefs.length > 0 ? (
                <div className="library-workspace-linked-references">
                  <div className="library-workspace-linked-references-header">Linked References</div>
                  {groupBlocksByDoc(inboundRefs).map(([docId, refs]) => (
                    <div className="library-workspace-linked-reference-group" key={`${block.blockId}-${docId}`}>
                      <button className="library-workspace-linked-reference-title" onClick={() => onSelectDoc(docId)} type="button">
                        {refs[0]?.docTitle}
                      </button>
                      {refs.map((ref) => (
                        <button
                          className="library-workspace-linked-reference-item"
                          key={`${block.blockId}-${ref.id}`}
                          onClick={() => {
                            onSelectDoc(ref.docId)
                            onSelectBlock(ref.blockId)
                          }}
                          type="button"
                        >
                          {renderBlockPreview(ref)}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SidebarCategoryList({ index }: { index: KnowledgeIndex }) {
  const activeCategoryId = useLibraryWorkspaceStore((state) => state.activeCategoryId)
  const setActiveCategoryId = useLibraryWorkspaceStore((state) => state.setActiveCategoryId)

  return (
    <section className="library-workspace-section">
      <div className="library-workspace-section-header">
        <span>Stacks</span>
        <button onClick={() => setActiveCategoryId(null)} type="button">
          All
        </button>
      </div>
      <div className="library-workspace-chip-list">
        {index.categories.map((category) => (
          <button
            className={activeCategoryId === category.id ? 'library-workspace-chip is-active' : 'library-workspace-chip'}
            key={category.id}
            onClick={() => setActiveCategoryId(activeCategoryId === category.id ? null : category.id)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function DocumentList({
  docs,
  selectedDocId,
}: {
  docs: WorkspaceDocument[]
  selectedDocId: string | null
}) {
  const selectDoc = useLibraryWorkspaceStore((state) => state.selectDoc)
  const setSidebarOpen = useLibraryWorkspaceStore((state) => state.setSidebarOpen)

  if (docs.length === 0) {
    return (
      <div className="library-workspace-empty">
        <strong>No pages found</strong>
        <span>Try another query or create a new page.</span>
      </div>
    )
  }

  return (
    <div className="library-workspace-document-list">
      {docs.map((doc) => (
        <button
          className={selectedDocId === doc.id ? 'library-workspace-document is-active' : 'library-workspace-document'}
          key={doc.id}
          onClick={() =>
            startTransition(() => {
              selectDoc(doc.id)
              setSidebarOpen(false)
            })
          }
          type="button"
        >
          <div className="library-workspace-document-title-row">
            <strong>{doc.title}</strong>
            {doc.isLocalOnly ? <span className="library-workspace-document-badge">Local</span> : null}
          </div>
          <p>{doc.body.split('\n').map((line) => line.trim()).find(Boolean) ?? 'Empty page'}</p>
          <small>{formatDate(doc.updatedAt)}</small>
        </button>
      ))}
    </div>
  )
}

export function LibraryWorkspaceShell({ index, onClose }: LibraryWorkspaceShellProps) {
  const docs = useLibraryWorkspaceStore((state) => state.docs)
  const selectedDocId = useLibraryWorkspaceStore((state) => state.selectedDocId)
  const query = useLibraryWorkspaceStore((state) => state.query)
  const activeCategoryId = useLibraryWorkspaceStore((state) => state.activeCategoryId)
  const sidebarOpen = useLibraryWorkspaceStore((state) => state.sidebarOpen)
  const saveState = useLibraryWorkspaceStore((state) => state.saveState)
  const lastSavedAt = useLibraryWorkspaceStore((state) => state.lastSavedAt)

  const setQuery = useLibraryWorkspaceStore((state) => state.setQuery)
  const setSidebarOpen = useLibraryWorkspaceStore((state) => state.setSidebarOpen)
  const createDocument = useLibraryWorkspaceStore((state) => state.createDocument)
  const selectDoc = useLibraryWorkspaceStore((state) => state.selectDoc)
  const saveDocument = useLibraryWorkspaceStore((state) => state.saveDocument)

  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)

  const graph = useMemo(() => buildWorkspaceGraph(docs), [docs])
  const deferredQuery = useDeferredValue(query)
  const normalizedQuery = deferredQuery.trim().toLowerCase()

  const filteredDocs = docs.filter((doc) => {
    if (activeCategoryId && doc.categoryId !== activeCategoryId) {
      return false
    }

    if (normalizedQuery.length === 0) {
      return true
    }

    const haystack = [doc.title, doc.body].join(' ').toLowerCase()
    return haystack.includes(normalizedQuery)
  })

  const selectedDoc = docs.find((doc) => doc.id === selectedDocId) ?? filteredDocs[0] ?? docs[0] ?? null
  const selectedParsedDoc = selectedDoc ? graph.docById.get(selectedDoc.id) ?? null : null
  const selectedPageBacklinks = selectedDoc ? graph.pageBacklinks.get(selectedDoc.id) ?? [] : []
  const outgoingPageRefs = selectedParsedDoc
    ? Array.from(
        new Set(
          selectedParsedDoc.blocks.flatMap((block) => {
            const embed = parsePageEmbed(block.content)
            return [...extractPageReferences([block.content, ...block.properties.map((property) => property.value)].join(' ')), ...(embed ? [embed] : [])]
          }),
        ),
      )
    : []
  const outgoingBlockRefs = selectedParsedDoc
    ? Array.from(
        new Set(
          selectedParsedDoc.blocks.flatMap((block) => {
            const embed = parseBlockEmbed(block.content)
            return [...extractBlockReferences([block.content, ...block.properties.map((property) => property.value)].join(' ')), ...(embed ? [embed] : [])]
          }),
        ),
      )
    : []

  useEffect(() => {
    setFocusedBlockId(null)
  }, [selectedDocId])

  const navigateToDoc = (docId: string) => {
    startTransition(() => {
      selectDoc(docId)
      setFocusedBlockId(null)
    })
  }

  const navigateToBlock = (blockId: string) => {
    const target = graph.blockById.get(blockId)
    if (!target) {
      return
    }

    startTransition(() => {
      selectDoc(target.docId)
      setFocusedBlockId(blockId)
    })
  }

  return (
    <div className="library-workspace">
      <div className="library-workspace-backdrop" onClick={() => setSidebarOpen(false)} />

      <div className="library-workspace-shell">
        <header className="library-workspace-toolbar">
          <div className="library-workspace-brand">
            <span className="library-workspace-kicker">Knowledge Workspace</span>
            <strong>Library Graph</strong>
            <small>Backlinks, references, embeds, and properties now use a shared document graph.</small>
          </div>

          <div className="library-workspace-toolbar-actions">
            <button className="library-workspace-secondary" onClick={() => setSidebarOpen(!sidebarOpen)} type="button">
              Pages
            </button>
            <button className="library-workspace-secondary" onClick={createDocument} type="button">
              New Page
            </button>
            <button className="library-workspace-primary" onClick={onClose} type="button">
              Return to World
            </button>
          </div>
        </header>

        <div className="library-workspace-status-bar">
          <span>{docs.length} pages loaded</span>
          <span>{"Page refs `[[Page]]`, block refs `((id))`, embeds `{{embed ...}}`, and properties `key:: value` are active."}</span>
          <span>{saveState === 'saved' && lastSavedAt ? `Saved to session ${formatDate(lastSavedAt)}` : 'Drafting locally'}</span>
        </div>

        <div className="library-workspace-body">
          <aside className={sidebarOpen ? 'library-workspace-sidebar is-open' : 'library-workspace-sidebar'}>
            <section className="library-workspace-section">
              <label className="library-workspace-search">
                <span>Search</span>
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter title and content"
                  type="search"
                  value={query}
                />
              </label>
            </section>

            <SidebarCategoryList index={index} />

            <section className="library-workspace-section">
              <div className="library-workspace-section-header">
                <span>Pages</span>
                <small>{filteredDocs.length} visible</small>
              </div>
              <DocumentList docs={filteredDocs} selectedDocId={selectedDoc?.id ?? null} />
            </section>
          </aside>

          <main className="library-workspace-main">
            {selectedDoc && selectedParsedDoc ? (
              <>
                <div className="library-workspace-main-header">
                  <div>
                    <span className="library-workspace-kicker">Page Node</span>
                    <strong>{selectedDoc.slug}</strong>
                  </div>
                  <div className="library-workspace-toolbar-actions">
                    <button className="library-workspace-primary" onClick={() => saveDocument(selectedDoc.id)} type="button">
                      Save Draft
                    </button>
                  </div>
                </div>

                <PageTitleLayer doc={selectedDoc} />
                <PagePropertiesLayer parsedDoc={selectedParsedDoc} />
                <HybridBodyLayer
                  focusedBlockId={focusedBlockId}
                  graph={graph}
                  onSelectBlock={navigateToBlock}
                  onSelectDoc={navigateToDoc}
                  parsedDoc={selectedParsedDoc}
                />
              </>
            ) : (
              <div className="library-workspace-empty is-main">
                <strong>No page selected</strong>
                <span>Open a page from the sidebar or create a new one.</span>
              </div>
            )}
          </main>

          <aside className="library-workspace-inspector">
            {selectedDoc && selectedParsedDoc ? (
              <>
                <section className="library-workspace-section">
                  <div className="library-workspace-section-header">
                    <span>Metadata</span>
                  </div>
                  <dl className="library-workspace-meta-grid">
                    <div>
                      <dt>Status</dt>
                      <dd>{selectedDoc.isLocalOnly ? 'Local draft' : 'Imported snapshot'}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{formatDate(selectedDoc.updatedAt)}</dd>
                    </div>
                    <div>
                      <dt>Category</dt>
                      <dd>{selectedDoc.categoryId ?? 'uncategorized'}</dd>
                    </div>
                  </dl>
                </section>

                <section className="library-workspace-section">
                  <div className="library-workspace-section-header">
                    <span>Outgoing Page Refs</span>
                    <small>{outgoingPageRefs.length}</small>
                  </div>
                  <div className="library-workspace-link-list">
                    {outgoingPageRefs.length > 0 ? (
                      outgoingPageRefs.map((reference) => {
                        const targetDoc = graph.docByKey.get(slugifyWorkspaceTitle(reference))
                        return (
                          <button
                            className="library-workspace-link-pill"
                            key={reference}
                            onClick={() => {
                              if (targetDoc) {
                                navigateToDoc(targetDoc.doc.id)
                              }
                            }}
                            type="button"
                          >
                            [[{reference}]]
                          </button>
                        )
                      })
                    ) : (
                      <p>No page references yet.</p>
                    )}
                  </div>
                </section>

                <section className="library-workspace-section">
                  <div className="library-workspace-section-header">
                    <span>Outgoing Block Refs</span>
                    <small>{outgoingBlockRefs.length}</small>
                  </div>
                  <div className="library-workspace-link-list">
                    {outgoingBlockRefs.length > 0 ? (
                      outgoingBlockRefs.map((reference) => (
                        <button
                          className="library-workspace-link-pill"
                          key={reference}
                          onClick={() => navigateToBlock(reference)}
                          type="button"
                        >
                          {formatBlockReference(reference)}
                        </button>
                      ))
                    ) : (
                      <p>No block references yet.</p>
                    )}
                  </div>
                </section>

                <section className="library-workspace-section">
                  <div className="library-workspace-section-header">
                    <span>Backlinks</span>
                    <small>{selectedPageBacklinks.length}</small>
                  </div>
                  <div className="library-workspace-linked-references">
                    {selectedPageBacklinks.length > 0 ? (
                      groupBlocksByDoc(selectedPageBacklinks).map(([docId, refs]) => (
                        <div className="library-workspace-linked-reference-group" key={`${selectedDoc.id}-${docId}`}>
                          <button className="library-workspace-linked-reference-title" onClick={() => navigateToDoc(docId)} type="button">
                            {refs[0]?.docTitle}
                          </button>
                          {refs.map((ref) => (
                            <button
                              className="library-workspace-linked-reference-item"
                              key={`${selectedDoc.id}-${ref.id}`}
                              onClick={() => {
                                navigateToDoc(ref.docId)
                                navigateToBlock(ref.blockId)
                              }}
                              type="button"
                            >
                              {renderBlockPreview(ref)}
                            </button>
                          ))}
                        </div>
                      ))
                    ) : (
                      <p>No backlinks yet.</p>
                    )}
                  </div>
                </section>

                <section className="library-workspace-section">
                  <div className="library-workspace-section-header">
                    <span>Recent in World Index</span>
                  </div>
                  <div className="library-workspace-recent-list">
                    {index.recentChanges.slice(0, 5).map((change) => (
                      <div key={`${change.docId}-${change.updatedAt}`}>
                        <strong>{change.title}</strong>
                        <small>{formatDate(change.updatedAt)}</small>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  )
}
