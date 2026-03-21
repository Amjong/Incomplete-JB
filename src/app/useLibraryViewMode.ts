import { useLocation, useNavigate } from 'react-router-dom'

function buildSearch(search: string, updates: Record<string, string | null>) {
  const params = new URLSearchParams(search)

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      params.set(key, value)
      continue
    }

    params.delete(key)
  }

  const next = params.toString()
  return next ? `?${next}` : ''
}

export function useLibraryViewMode() {
  const location = useLocation()
  const navigate = useNavigate()

  const isLibraryPath = location.pathname === '/library'
  const searchParams = new URLSearchParams(location.search)
  const isWorkspaceOpen = isLibraryPath && searchParams.get('view') === 'workspace'
  const selectedDocSlug = isLibraryPath ? searchParams.get('doc') : null

  const openWorkspace = (docSlug?: string | null) => {
    if (!isLibraryPath) {
      return
    }

    navigate({
      pathname: location.pathname,
      search: buildSearch(location.search, {
        view: 'workspace',
        doc: docSlug ?? null,
      }),
    })
  }

  const closeWorkspace = () => {
    if (!isLibraryPath) {
      return
    }

    navigate({
      pathname: location.pathname,
      search: buildSearch(location.search, {
        view: null,
        doc: null,
      }),
    })
  }

  const setWorkspaceDoc = (docSlug: string | null) => {
    if (!isLibraryPath) {
      return
    }

    navigate(
      {
        pathname: location.pathname,
        search: buildSearch(location.search, {
          view: 'workspace',
          doc: docSlug,
        }),
      },
      { replace: true },
    )
  }

  const toggleWorkspace = () => {
    if (isWorkspaceOpen) {
      closeWorkspace()
      return
    }

    openWorkspace(selectedDocSlug)
  }

  return {
    isLibraryPath,
    isWorkspaceOpen,
    selectedDocSlug,
    openWorkspace,
    closeWorkspace,
    setWorkspaceDoc,
    toggleWorkspace,
  }
}
