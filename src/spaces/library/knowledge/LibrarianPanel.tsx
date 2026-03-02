import { useMemo } from 'react'
import { useKnowledgeStore } from '../../../store/useKnowledgeStore'

export function LibrarianPanel() {
  const index = useKnowledgeStore((state) => state.index)
  const openCategory = useKnowledgeStore((state) => state.openCategory)
  const openDoc = useKnowledgeStore((state) => state.openDoc)
  const setActiveTab = useKnowledgeStore((state) => state.setActiveTab)
  const recategorize = useKnowledgeStore((state) => state.recategorize)
  const getCategoryCounts = useKnowledgeStore((state) => state.getCategoryCounts)
  const categoryCounts = getCategoryCounts()

  const laneCount = index?.layout.lanes.length ?? 0
  const docCount = index?.docs.filter((doc) => doc.status === 'active').length ?? 0

  const sortedCategoryCounts = useMemo(
    () => [...categoryCounts].sort((left, right) => right.count - left.count),
    [categoryCounts],
  )

  return (
    <div className="knowledge-panel-content">
      <div className="knowledge-metrics">
        <div>
          <strong>{docCount}</strong>
          <span>active notes</span>
        </div>
        <div>
          <strong>{laneCount}</strong>
          <span>category lanes</span>
        </div>
      </div>

      <div className="knowledge-panel-actions">
        <button onClick={() => setActiveTab('search')} type="button">
          Open Search
        </button>
        <button onClick={() => setActiveTab('editor')} type="button">
          Add Note
        </button>
        <button onClick={recategorize} type="button">
          Re-categorize
        </button>
      </div>

      <section>
        <h3>Categories</h3>
        <ul className="knowledge-list">
          {sortedCategoryCounts.map(({ category, count }) => (
            <li key={category.id}>
              <button className="knowledge-list-item" onClick={() => openCategory(category.id)} type="button">
                <span>{category.label}</span>
                <strong>{count}</strong>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Recent Changes</h3>
        <ul className="knowledge-list">
          {index?.recentChanges.map((change) => (
            <li key={`${change.docId}-${change.updatedAt}`}>
              <button className="knowledge-list-item" onClick={() => openDoc(change.docId)} type="button">
                <span>{change.title}</span>
                <small>{new Date(change.updatedAt).toLocaleDateString()}</small>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
