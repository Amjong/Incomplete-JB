import { useKnowledgeStore } from '../../../store/useKnowledgeStore'

function dateLabel(value: string) {
  const stamp = Date.parse(value)
  if (Number.isNaN(stamp)) {
    return '-'
  }

  return new Date(stamp).toLocaleDateString()
}

export function KnowledgeSearchPanel() {
  const index = useKnowledgeStore((state) => state.index)
  const query = useKnowledgeStore((state) => state.query)
  const selectedCategoryId = useKnowledgeStore((state) => state.selectedCategoryId)
  const getSearchPage = useKnowledgeStore((state) => state.getSearchPage)
  const pageData = getSearchPage()

  const setQuery = useKnowledgeStore((state) => state.setQuery)
  const setSelectedCategoryId = useKnowledgeStore((state) => state.setSelectedCategoryId)
  const openDoc = useKnowledgeStore((state) => state.openDoc)
  const setPage = useKnowledgeStore((state) => state.setPage)
  const archiveDoc = useKnowledgeStore((state) => state.archiveDoc)

  const categories = index?.categories ?? []

  return (
    <div className="knowledge-panel-content">
      <div className="knowledge-search-controls">
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, summary, tags, body"
          type="search"
          value={query}
        />

        <select
          onChange={(event) => setSelectedCategoryId(event.target.value || null)}
          value={selectedCategoryId ?? ''}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      <div className="knowledge-search-meta">
        <span>{pageData.total} results</span>
        <span>
          Page {pageData.page} / {pageData.totalPages}
        </span>
      </div>

      <ul className="knowledge-list">
        {pageData.items.map((doc) => (
          <li key={doc.id}>
            <article className="knowledge-result-card">
              <button className="knowledge-result-open" onClick={() => openDoc(doc.id)} type="button">
                <strong>{doc.title}</strong>
                <p>{doc.summary}</p>
              </button>
              <div className="knowledge-result-footer">
                <small>{dateLabel(doc.updatedAt)}</small>
                <button onClick={() => archiveDoc(doc.id)} type="button">
                  Archive
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>

      <div className="knowledge-pagination">
        <button disabled={pageData.page <= 1} onClick={() => setPage(pageData.page - 1)} type="button">
          Prev
        </button>
        <button
          disabled={pageData.page >= pageData.totalPages}
          onClick={() => setPage(pageData.page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  )
}
