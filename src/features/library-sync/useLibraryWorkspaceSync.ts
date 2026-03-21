import { useEffect, useMemo, useRef, useState } from 'react'
import { insertLibraryDocument, listLibraryDocuments, updateLibraryDocument } from '../../integrations/supabase/libraryDocuments'
import { useLibraryWorkspaceStore, type WorkspaceDocument } from '../../store/useLibraryWorkspaceStore'

interface UseLibraryWorkspaceSyncOptions {
  enabled: boolean
  userId: string | null
}

function toComparableSnapshot(doc: WorkspaceDocument) {
  return JSON.stringify({
    title: doc.title,
    body: doc.body,
    blockDepths: doc.blockDepths,
    blockIds: doc.blockIds,
  })
}

function getCurrentDoc(docId: string) {
  return useLibraryWorkspaceStore.getState().docs.find((doc) => doc.id === docId) ?? null
}

export function useLibraryWorkspaceSync({ enabled, userId }: UseLibraryWorkspaceSyncOptions) {
  const docs = useLibraryWorkspaceStore((state) => state.docs)
  const selectedDocId = useLibraryWorkspaceStore((state) => state.selectedDocId)
  const saveRequestToken = useLibraryWorkspaceStore((state) => state.saveRequestToken)
  const requestedSaveDocId = useLibraryWorkspaceStore((state) => state.requestedSaveDocId)
  const hydrateFromRemoteDocs = useLibraryWorkspaceStore((state) => state.hydrateFromRemoteDocs)
  const replaceDocument = useLibraryWorkspaceStore((state) => state.replaceDocument)
  const setSaveState = useLibraryWorkspaceStore((state) => state.setSaveState)

  const [isHydrating, setIsHydrating] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const selectedDoc = useMemo(
    () => docs.find((doc) => doc.id === selectedDocId) ?? null,
    [docs, selectedDocId],
  )

  const debounceTimerRef = useRef<number | null>(null)
  const inFlightRef = useRef(false)
  const queuedDocIdRef = useRef<string | null>(null)
  const lastSavedSnapshotRef = useRef(new Map<string, string>())

  useEffect(() => {
    if (!enabled || !userId) {
      setIsHydrating(false)
      return
    }

    let cancelled = false
    setIsHydrating(true)
    setSyncError(null)

    void listLibraryDocuments(userId)
      .then((remoteDocs) => {
        if (cancelled) {
          return
        }

        hydrateFromRemoteDocs(remoteDocs)
        lastSavedSnapshotRef.current = new Map(
          remoteDocs.map((doc) => [doc.id, toComparableSnapshot(doc)]),
        )
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setSyncError(error instanceof Error ? error.message : 'Failed to load workspace from Supabase.')
        setSaveState('error')
      })
      .finally(() => {
        if (!cancelled) {
          setIsHydrating(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [enabled, hydrateFromRemoteDocs, setSaveState, userId])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  async function flushSave(targetDocId: string) {
    if (!enabled || !userId) {
      return
    }

    const latest = getCurrentDoc(targetDocId)
    if (!latest) {
      return
    }

    if (inFlightRef.current) {
      queuedDocIdRef.current = targetDocId
      return
    }

    const latestSnapshot = toComparableSnapshot(latest)
    const savedSnapshot = lastSavedSnapshotRef.current.get(targetDocId)
    if (!latest.isLocalOnly && savedSnapshot === latestSnapshot) {
      setSaveState('saved', latest.updatedAt)
      return
    }

    inFlightRef.current = true
    setSaveState('saving')
    setSyncError(null)

    try {
      if (latest.isLocalOnly) {
        const persisted = await insertLibraryDocument(latest, userId)
        const currentLocalDoc = getCurrentDoc(latest.id) ?? latest
        const mergedPersistedDoc: WorkspaceDocument = {
          ...currentLocalDoc,
          id: persisted.id,
          isLocalOnly: false,
          updatedAt: persisted.updatedAt,
        }

        replaceDocument(latest.id, mergedPersistedDoc)
        lastSavedSnapshotRef.current.delete(latest.id)
        lastSavedSnapshotRef.current.set(persisted.id, latestSnapshot)
        setSaveState('saved', persisted.updatedAt)

        const currentPersistedDoc = getCurrentDoc(persisted.id) ?? mergedPersistedDoc
        if (toComparableSnapshot(currentPersistedDoc) !== latestSnapshot) {
          queuedDocIdRef.current = persisted.id
        }
      } else {
        const persisted = await updateLibraryDocument(latest, userId)
        const currentDoc = getCurrentDoc(latest.id)

        if (currentDoc) {
          replaceDocument(latest.id, {
            ...currentDoc,
            isLocalOnly: false,
            updatedAt: persisted.updatedAt,
          })
        }

        lastSavedSnapshotRef.current.set(latest.id, latestSnapshot)
        setSaveState('saved', persisted.updatedAt)

        const currentSnapshot = currentDoc ? toComparableSnapshot(currentDoc) : latestSnapshot
        if (currentSnapshot !== latestSnapshot) {
          queuedDocIdRef.current = latest.id
        }
      }
    } catch (error: unknown) {
      setSyncError(error instanceof Error ? error.message : 'Failed to save workspace changes.')
      setSaveState('error')
    } finally {
      inFlightRef.current = false

      if (queuedDocIdRef.current) {
        const queuedDocId = queuedDocIdRef.current
        queuedDocIdRef.current = null
        void flushSave(queuedDocId)
      }
    }
  }

  useEffect(() => {
    if (!enabled || isHydrating || !selectedDoc) {
      return
    }

    const currentSnapshot = toComparableSnapshot(selectedDoc)
    const lastSavedSnapshot = lastSavedSnapshotRef.current.get(selectedDoc.id)
    if (!selectedDoc.isLocalOnly && currentSnapshot === lastSavedSnapshot) {
      return
    }

    setSaveState('saving')

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = window.setTimeout(() => {
      void flushSave(selectedDoc.id)
    }, 700)

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
    }
  }, [enabled, isHydrating, selectedDoc, setSaveState])

  useEffect(() => {
    if (!enabled || isHydrating || !requestedSaveDocId || saveRequestToken === 0) {
      return
    }

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
    }

    void flushSave(requestedSaveDocId)
  }, [enabled, isHydrating, requestedSaveDocId, saveRequestToken])

  return {
    isHydrating,
    syncError,
  }
}
