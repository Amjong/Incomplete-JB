import { useMemo, useState, type ReactNode } from 'react'
import type { KnowledgeDoc } from '../../../knowledge/types'
import { useKnowledgeStore } from '../../../store/useKnowledgeStore'

interface KnowledgeBookScreenProps {
  mode: 'reader' | 'editor'
  onClose: () => void
}

function parseMarkdown(text: string): ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const nodes: ReactNode[] = []

  let paragraph: string[] = []
  let listItems: string[] = []
  let codeLines: string[] = []
  let inCode = false

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    nodes.push(
      <p key={`p-${nodes.length}`}>
        {paragraph.join(' ')}
      </p>,
    )
    paragraph = []
  }

  const flushList = () => {
    if (listItems.length === 0) return
    nodes.push(
      <ul key={`ul-${nodes.length}`}>
        {listItems.map((item, index) => (
          <li key={`li-${nodes.length}-${index}`}>{item}</li>
        ))}
      </ul>,
    )
    listItems = []
  }

  const flushCode = () => {
    if (codeLines.length === 0) return
    nodes.push(
      <pre key={`pre-${nodes.length}`}>
        <code>{codeLines.join('\n')}</code>
      </pre>,
    )
    codeLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (line.startsWith('```')) {
      flushParagraph()
      flushList()
      if (inCode) {
        flushCode()
        inCode = false
      } else {
        inCode = true
      }
      continue
    }

    if (inCode) {
      codeLines.push(rawLine)
      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      const depth = heading[1].length
      const value = heading[2]

      if (depth === 1) nodes.push(<h1 key={`h1-${nodes.length}`}>{value}</h1>)
      else if (depth === 2) nodes.push(<h2 key={`h2-${nodes.length}`}>{value}</h2>)
      else if (depth === 3) nodes.push(<h3 key={`h3-${nodes.length}`}>{value}</h3>)
      else nodes.push(<h4 key={`h4-${nodes.length}`}>{value}</h4>)

      continue
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/)
    if (listMatch) {
      flushParagraph()
      listItems.push(listMatch[1])
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  flushCode()

  if (nodes.length === 0) {
    return [<p key="empty">No content.</p>]
  }

  return nodes
}

function dateLabel(value: string) {
  const stamp = Date.parse(value)
  if (Number.isNaN(stamp)) {
    return '-'
  }
  return new Date(stamp).toLocaleDateString()
}

function ReaderPage({ doc }: { doc: KnowledgeDoc | null }) {
  if (!doc) {
    return (
      <article className="knowledge-book-paper">
        <h1>No Document Selected</h1>
        <p>Select a note from Search to open it in book view.</p>
      </article>
    )
  }

  return (
    <article className="knowledge-book-paper">
      <header className="knowledge-book-meta">
        <h1>{doc.title}</h1>
        <p>{doc.summary}</p>
        <div className="knowledge-book-chip-row">
          <span>Updated {dateLabel(doc.updatedAt)}</span>
          {doc.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </header>

      <section className="knowledge-book-markdown">{parseMarkdown(doc.body)}</section>
    </article>
  )
}

function EditorPage() {
  const addDraft = useKnowledgeStore((state) => state.addDraft)
  const draftExportText = useKnowledgeStore((state) => state.draftExportText)
  const drafts = useKnowledgeStore((state) => state.drafts)
  const clearDrafts = useKnowledgeStore((state) => state.clearDrafts)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [tags, setTags] = useState('')
  const [categoryHint, setCategoryHint] = useState('')
  const [body, setBody] = useState('')

  const previewNodes = useMemo(() => parseMarkdown(body), [body])

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    addDraft({
      title: title.trim(),
      summary: summary.trim(),
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      categoryHint: categoryHint.trim() || undefined,
      body: body.trim(),
    })

    setTitle('')
    setSummary('')
    setTags('')
    setCategoryHint('')
    setBody('')
  }

  return (
    <article className="knowledge-book-paper">
      <h1>Markdown Editor</h1>

      <form className="knowledge-book-editor-form" onSubmit={onSubmit}>
        <div className="knowledge-book-grid-2">
          <label>
            Title
            <input onChange={(event) => setTitle(event.target.value)} required value={title} />
          </label>
          <label>
            Category Hint
            <input onChange={(event) => setCategoryHint(event.target.value)} value={categoryHint} />
          </label>
        </div>

        <label>
          Summary
          <input onChange={(event) => setSummary(event.target.value)} required value={summary} />
        </label>

        <label>
          Tags (comma-separated)
          <input onChange={(event) => setTags(event.target.value)} placeholder="engine, doc, ux" value={tags} />
        </label>

        <div className="knowledge-book-editor-split">
          <label>
            Markdown
            <textarea onChange={(event) => setBody(event.target.value)} required rows={16} value={body} />
          </label>

          <section>
            <h2>Preview</h2>
            <div className="knowledge-book-preview">{previewNodes}</div>
          </section>
        </div>

        <div className="knowledge-book-editor-actions">
          <button type="submit">Queue Draft</button>
          <button disabled={drafts.length === 0} onClick={clearDrafts} type="button">
            Clear Queue
          </button>
        </div>
      </form>

      <section>
        <h2>Draft Export ({drafts.length})</h2>
        <textarea className="knowledge-book-export" readOnly rows={10} value={draftExportText} />
      </section>
    </article>
  )
}

export function KnowledgeBookScreen({ mode, onClose }: KnowledgeBookScreenProps) {
  const index = useKnowledgeStore((state) => state.index)
  const selectedDocId = useKnowledgeStore((state) => state.selectedDocId)
  const setActiveTab = useKnowledgeStore((state) => state.setActiveTab)

  const doc = useMemo(
    () => (selectedDocId ? index?.docs.find((item) => item.id === selectedDocId) ?? null : null),
    [index, selectedDocId],
  )

  const goBack = () => {
    if (mode === 'reader') {
      setActiveTab('search')
      return
    }
    setActiveTab('librarian')
  }

  return (
    <section className="knowledge-book-screen">
      <div className="knowledge-book-backdrop" />
      <div className="knowledge-book-frame">
        <header className="knowledge-book-toolbar">
          <button onClick={goBack} type="button">
            Back
          </button>
          <strong>{mode === 'reader' ? 'Reading Room' : 'Writing Desk'}</strong>
          <button onClick={onClose} type="button">
            Close
          </button>
        </header>

        {mode === 'reader' ? <ReaderPage doc={doc} /> : <EditorPage />}
      </div>
    </section>
  )
}
