import { useEffect } from 'react'
import { useEngineStore } from '../../../store/useEngineStore'
import { useKnowledgeStore } from '../../../store/useKnowledgeStore'
import type { KnowledgePanelTab } from '../../../store/useKnowledgeStore'
import { KnowledgeBookScreen } from './KnowledgeBookScreen'
import { KnowledgeSearchPanel } from './KnowledgeSearchPanel'
import { LibrarianPanel } from './LibrarianPanel'

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button className={active ? 'knowledge-tab is-active' : 'knowledge-tab'} onClick={onClick} type="button">
      {label}
    </button>
  )
}

export function LibraryKnowledgePanels() {
  const spaceId = useEngineStore((state) => state.spaceId)
  const setKnowledgeHudOpen = useEngineStore((state) => state.setKnowledgeHudOpen)

  const panelOpen = useKnowledgeStore((state) => state.panelOpen)
  const activeTab = useKnowledgeStore((state) => state.activeTab)
  const loadState = useKnowledgeStore((state) => state.loadState)
  const error = useKnowledgeStore((state) => state.error)

  const ensureLoaded = useKnowledgeStore((state) => state.ensureLoaded)
  const setPanelOpen = useKnowledgeStore((state) => state.setPanelOpen)
  const togglePanel = useKnowledgeStore((state) => state.togglePanel)
  const setActiveTab = useKnowledgeStore((state) => state.setActiveTab)

  useEffect(() => {
    if (spaceId === 'library') {
      ensureLoaded()
    }
  }, [ensureLoaded, spaceId])

  useEffect(() => {
    if (spaceId !== 'library') {
      setPanelOpen(false)
    }
  }, [setPanelOpen, spaceId])

  useEffect(() => {
    setKnowledgeHudOpen(spaceId === 'library' && panelOpen)
  }, [panelOpen, setKnowledgeHudOpen, spaceId])

  useEffect(() => {
    if (spaceId !== 'library') {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Tab' || event.code === 'KeyK') {
        event.preventDefault()
        togglePanel()
        return
      }

      if (event.code === 'Escape') {
        setPanelOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [setPanelOpen, spaceId, togglePanel])

  useEffect(() => {
    if (panelOpen && document.pointerLockElement) {
      void document.exitPointerLock()
    }
  }, [panelOpen])

  if (spaceId !== 'library') {
    return null
  }

  return (
    <>
      <button className="knowledge-toggle" onClick={togglePanel} type="button">
        Knowledge [K]
      </button>

      {panelOpen && (activeTab === 'reader' || activeTab === 'editor') ? (
        <KnowledgeBookScreen mode={activeTab === 'reader' ? 'reader' : 'editor'} onClose={() => setPanelOpen(false)} />
      ) : null}

      {panelOpen && activeTab !== 'reader' && activeTab !== 'editor' ? (
        <section className="knowledge-shell">
          <header className="knowledge-shell-header">
            <strong>Library Knowledge Engine</strong>
            <div className="knowledge-tab-row">
              <TabButton
                active={activeTab === 'librarian'}
                label="Librarian"
                onClick={() => setActiveTab('librarian')}
              />
              <TabButton active={activeTab === 'search'} label="Search" onClick={() => setActiveTab('search')} />
              <TabButton active={false} label="Editor" onClick={() => setActiveTab('editor')} />
            </div>
            <button onClick={() => setPanelOpen(false)} type="button">
              Close
            </button>
          </header>

          {loadState === 'loading' || loadState === 'idle' ? (
            <p className="knowledge-state">Loading knowledge index...</p>
          ) : null}

          {loadState === 'error' ? <p className="knowledge-state">{error ?? 'Knowledge index failed to load.'}</p> : null}

          {loadState === 'ready' ? <PanelByTab tab={activeTab} /> : null}
        </section>
      ) : null}
    </>
  )
}

function PanelByTab({ tab }: { tab: KnowledgePanelTab }) {
  if (tab === 'search') {
    return <KnowledgeSearchPanel />
  }

  return <LibrarianPanel />
}
