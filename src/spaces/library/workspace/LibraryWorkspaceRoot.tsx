import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useLibraryViewMode } from '../../../app/useLibraryViewMode'
import { useLibraryWorkspaceSync } from '../../../features/library-sync/useLibraryWorkspaceSync'
import { getCurrentSession, signInWithPassword, signOutCurrentUser, signUpWithPassword, subscribeToAuthChanges } from '../../../integrations/supabase/auth'
import { isSupabaseConfigured } from '../../../integrations/supabase/client'
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
  const saveState = useLibraryWorkspaceStore((state) => state.saveState)

  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)

  const { isHydrating: isSyncHydrating, syncError } = useLibraryWorkspaceSync({
    enabled: isSupabaseConfigured && Boolean(session?.user.id),
    userId: session?.user.id ?? null,
  })

  useEffect(() => {
    if (!isLibraryPath) {
      return
    }

    ensureLoaded()
  }, [ensureLoaded, isLibraryPath])

  useEffect(() => {
    if (!index || isSupabaseConfigured) {
      return
    }

    hydrateFromKnowledgeDocs(index.docs, index.docByCategory)
  }, [hydrateFromKnowledgeDocs, index])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    let mounted = true
    void getCurrentSession()
      .then((nextSession) => {
        if (!mounted) {
          return
        }

        setSession(nextSession)
        setAuthReady(true)
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return
        }

        setAuthError(error instanceof Error ? error.message : 'Failed to restore Supabase session.')
        setAuthReady(true)
      })

    const { data } = subscribeToAuthChanges((_event, nextSession) => {
      setSession(nextSession)
      setAuthError(null)
      setAuthReady(true)
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

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

  const submitAuth = async () => {
    setAuthBusy(true)
    setAuthError(null)

    try {
      if (authMode === 'sign-in') {
        await signInWithPassword(email, password)
      } else {
        await signUpWithPassword(email, password)
      }
    } catch (error: unknown) {
      setAuthError(error instanceof Error ? error.message : 'Failed to authenticate with Supabase.')
    } finally {
      setAuthBusy(false)
    }
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

  if (isSupabaseConfigured && !authReady) {
    return (
      <div className="library-workspace-loading">
        <div>
          <strong>Checking account</strong>
          <span>Restoring your Supabase session.</span>
        </div>
      </div>
    )
  }

  if (isSupabaseConfigured && !session) {
    return (
      <div className="library-workspace-loading">
        <form
          className="library-workspace-auth-panel"
          onSubmit={(event) => {
            event.preventDefault()
            void submitAuth()
          }}
        >
          <strong>{authMode === 'sign-in' ? 'Sign in to Library Workspace' : 'Create your workspace account'}</strong>
          <span>Supabase sync is enabled for this workspace.</span>
          <label className="library-workspace-search">
            <span>Email</span>
            <input onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
          </label>
          <label className="library-workspace-search">
            <span>Password</span>
            <input onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
          </label>
          {authError ? <p className="library-workspace-auth-error">{authError}</p> : null}
          <button className="library-workspace-primary library-workspace-auth-submit" disabled={authBusy} type="submit">
            {authBusy ? 'Working...' : authMode === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </button>
          <div className="library-workspace-auth-actions">
            <button
              className="library-workspace-secondary"
              onClick={() => setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in')}
              type="button"
            >
              {authMode === 'sign-in' ? 'Need an account?' : 'Have an account?'}
            </button>
            <button className="library-workspace-secondary" onClick={closeWorkspace} type="button">
              Close
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (isSupabaseConfigured && isSyncHydrating && docs.length === 0) {
    return (
      <div className="library-workspace-loading">
        <div>
          <strong>Syncing workspace</strong>
          <span>Loading your documents from Supabase.</span>
        </div>
      </div>
    )
  }

  return (
    <LibraryWorkspaceShell
      index={index}
      onClose={closeWorkspace}
      onSignOut={isSupabaseConfigured ? () => void signOutCurrentUser() : undefined}
      remoteSyncError={syncError ?? (saveState === 'error' ? 'Autosave failed.' : null)}
    />
  )
}
