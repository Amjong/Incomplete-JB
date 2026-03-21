import { useEffect } from 'react'
import { useLibraryViewMode } from '../../../app/useLibraryViewMode'
import { useKnowledgeStore } from '../../../store/useKnowledgeStore'
import { useLibraryWorkspaceStore } from '../../../store/useLibraryWorkspaceStore'
import { useEngineStore } from '../../../store/useEngineStore'
import { LibraryWorkspaceShell } from './LibraryWorkspaceShell'

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

export function LibraryWorkspaceRoot() {
  const { isLibraryPath, isWorkspaceOpen, selectedDocSlug, openWorkspace, closeWorkspace, setWorkspaceDoc } =
    useLibraryViewMode()

  const ensureLoaded = useKnowledgeStore((state) => state.ensureLoaded)
  const loadState = useKnowledgeStore((state) => state.loadState)
  const index = useKnowledgeStore((state) => state.index)

  const docs = useLibraryWorkspaceStore((state) => state.docs)
  const selectedDocId = useLibraryWorkspaceStore((state) => state.selectedDocId)
  const hydrateFromKnowledgeDocs = useLibraryWorkspaceStore((state) => state.hydrateFromKnowledgeDocs)
  const selectDoc = useLibraryWorkspaceStore((state) => state.selectDoc)
  const setPointerLockGuard = useEngineStore((state) => state.setPointerLockGuard)

  useEffect(() => {
    if (!isLibraryPath) {
      return
    }

    ensureLoaded()
  }, [ensureLoaded, isLibraryPath])

  useEffect(() => {
    if (!index) {
      return
    }

    hydrateFromKnowledgeDocs(index.docs, index.docByCategory)
  }, [hydrateFromKnowledgeDocs, index])

  useEffect(() => {
    setPointerLockGuard('library', isWorkspaceOpen)

    if (isWorkspaceOpen && document.pointerLockElement) {
      void document.exitPointerLock()
    }
  }, [isWorkspaceOpen, setPointerLockGuard])

  useEffect(() => {
    if (!isLibraryPath) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return
      }

      if (event.code === 'KeyK' || (!isWorkspaceOpen && event.code === 'Tab')) {
        event.preventDefault()

        if (isWorkspaceOpen) {
          closeWorkspace()
        } else {
          openWorkspace()
        }
        return
      }

      if (event.code === 'Escape' && isWorkspaceOpen) {
        event.preventDefault()
        closeWorkspace()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeWorkspace, isLibraryPath, isWorkspaceOpen, openWorkspace])

  useEffect(() => {
    if (!selectedDocSlug || docs.length === 0) {
      return
    }

    const matchingDoc = docs.find((doc) => doc.slug === selectedDocSlug)
    if (matchingDoc && matchingDoc.id !== selectedDocId) {
      selectDoc(matchingDoc.id)
    }
  }, [docs, selectedDocId, selectedDocSlug, selectDoc])

  useEffect(() => {
    if (!isWorkspaceOpen) {
      return
    }

    const selectedDoc = docs.find((doc) => doc.id === selectedDocId) ?? null
    const nextSlug = selectedDoc?.slug ?? null

    if (nextSlug !== selectedDocSlug) {
      setWorkspaceDoc(nextSlug)
    }
  }, [docs, isWorkspaceOpen, selectedDocId, selectedDocSlug, setWorkspaceDoc])

  useEffect(() => {
    if (!isWorkspaceOpen || selectedDocId || docs.length === 0) {
      return
    }

    selectDoc(docs[0].id)
  }, [docs, isWorkspaceOpen, selectedDocId, selectDoc])

  if (!isLibraryPath) {
    return null
  }

  if (loadState === 'loading' || loadState === 'idle' || !index) {
    return isWorkspaceOpen ? (
      <div className="library-workspace-loading">
        <div>
          <strong>Preparing workspace</strong>
          <span>Loading the latest library index.</span>
        </div>
      </div>
    ) : (
      <button className="knowledge-workspace-toggle" onClick={() => openWorkspace()} type="button">
        Knowledge Workspace [K]
      </button>
    )
  }

  if (!isWorkspaceOpen) {
    return (
      <button className="knowledge-workspace-toggle" onClick={() => openWorkspace()} type="button">
        Knowledge Workspace [K]
      </button>
    )
  }

  return <LibraryWorkspaceShell index={index} onClose={closeWorkspace} />
}
