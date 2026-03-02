import { useState } from 'react'
import { useKnowledgeStore } from '../../../store/useKnowledgeStore'

export function KnowledgeEditorPanel() {
  const addDraft = useKnowledgeStore((state) => state.addDraft)
  const draftExportText = useKnowledgeStore((state) => state.draftExportText)
  const drafts = useKnowledgeStore((state) => state.drafts)
  const clearDrafts = useKnowledgeStore((state) => state.clearDrafts)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [tags, setTags] = useState('')
  const [categoryHint, setCategoryHint] = useState('')
  const [body, setBody] = useState('')

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
    <div className="knowledge-panel-content">
      <form className="knowledge-editor-form" onSubmit={onSubmit}>
        <label>
          Title
          <input onChange={(event) => setTitle(event.target.value)} required value={title} />
        </label>

        <label>
          Summary
          <input onChange={(event) => setSummary(event.target.value)} required value={summary} />
        </label>

        <label>
          Tags (comma-separated)
          <input onChange={(event) => setTags(event.target.value)} value={tags} />
        </label>

        <label>
          Category Hint (optional)
          <input onChange={(event) => setCategoryHint(event.target.value)} value={categoryHint} />
        </label>

        <label>
          Body
          <textarea onChange={(event) => setBody(event.target.value)} required rows={7} value={body} />
        </label>

        <button type="submit">Queue Draft</button>
      </form>

      <section className="knowledge-draft-output">
        <div className="knowledge-draft-header">
          <h3>Draft Queue ({drafts.length})</h3>
          <button disabled={drafts.length === 0} onClick={clearDrafts} type="button">
            Clear
          </button>
        </div>
        <textarea readOnly rows={11} value={draftExportText} />
      </section>
    </div>
  )
}
