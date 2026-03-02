import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useEngineStore } from '../../../store/useEngineStore'
import { useGalleryStore, type GalleryPanelTab } from '../../../store/useGalleryStore'
import { GalleryDetailScreen } from './GalleryDetailScreen'

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
    <button className={active ? 'gallery-tab is-active' : 'gallery-tab'} onClick={onClick} type="button">
      {label}
    </button>
  )
}

export function GalleryPanels() {
  const spaceId = useEngineStore((state) => state.spaceId)
  const setOverlayHudOpen = useEngineStore((state) => state.setOverlayHudOpen)

  const loadSeed = useGalleryStore((state) => state.loadSeed)
  const panelOpen = useGalleryStore((state) => state.panelOpen)
  const activeTab = useGalleryStore((state) => state.activeTab)
  const detailItemId = useGalleryStore((state) => state.detailItemId)
  const loadState = useGalleryStore((state) => state.loadState)
  const error = useGalleryStore((state) => state.error)
  const openPanel = useGalleryStore((state) => state.openPanel)
  const closePanel = useGalleryStore((state) => state.closePanel)
  const togglePanel = useGalleryStore((state) => state.togglePanel)
  const setActiveTab = useGalleryStore((state) => state.setActiveTab)
  const closeDetail = useGalleryStore((state) => state.closeDetail)

  useEffect(() => {
    if (spaceId === 'gallery') {
      void loadSeed()
    }
  }, [loadSeed, spaceId])

  useEffect(() => {
    if (spaceId !== 'gallery') {
      closePanel()
      closeDetail()
    }
  }, [closeDetail, closePanel, spaceId])

  const hasOverlay = spaceId === 'gallery' && (panelOpen || Boolean(detailItemId))
  useEffect(() => {
    setOverlayHudOpen(hasOverlay)
  }, [hasOverlay, setOverlayHudOpen])

  useEffect(() => {
    if (spaceId !== 'gallery') {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Tab' || event.code === 'KeyK') {
        event.preventDefault()
        if (detailItemId) {
          closeDetail()
          return
        }
        togglePanel()
        return
      }

      if (event.code === 'Escape') {
        if (detailItemId) {
          closeDetail()
          return
        }

        closePanel()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeDetail, closePanel, detailItemId, spaceId, togglePanel])

  useEffect(() => {
    if (hasOverlay && document.pointerLockElement) {
      void document.exitPointerLock()
    }
  }, [hasOverlay])

  if (spaceId !== 'gallery') {
    return null
  }

  return (
    <>
      <button className="gallery-toggle" onClick={openPanel} type="button">
        Gallery [K]
      </button>

      {detailItemId ? <GalleryDetailScreen onClose={closePanel} /> : null}

      {panelOpen && !detailItemId ? (
        <section className="gallery-shell">
          <header className="gallery-shell-header">
            <strong>Gallery Curator</strong>
            <div className="gallery-tab-row">
              <TabButton active={activeTab === 'collection'} label="Collection" onClick={() => setActiveTab('collection')} />
              <TabButton active={activeTab === 'add'} label="Add" onClick={() => setActiveTab('add')} />
              <TabButton active={activeTab === 'data'} label="Data" onClick={() => setActiveTab('data')} />
            </div>
            <button onClick={closePanel} type="button">
              Close
            </button>
          </header>

          {loadState === 'loading' || loadState === 'idle' ? <p className="gallery-state">Loading gallery seed...</p> : null}
          {loadState === 'error' ? <p className="gallery-state">{error ?? 'Failed to load gallery seed.'}</p> : null}
          {loadState === 'ready' ? <GalleryTabContent tab={activeTab} /> : null}
        </section>
      ) : null}
    </>
  )
}

function GalleryTabContent({ tab }: { tab: GalleryPanelTab }) {
  if (tab === 'add') {
    return <AddTab />
  }

  if (tab === 'data') {
    return <DataTab />
  }

  return <CollectionTab />
}

function CollectionTab() {
  const items = useGalleryStore((state) => state.collection.items)
  const openDetail = useGalleryStore((state) => state.openDetail)
  const removeItem = useGalleryStore((state) => state.removeItem)
  const overflowCount = useGalleryStore((state) => state.layout.overflowItemIds.length)

  const ordered = useMemo(
    () => [...items].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
    [items],
  )

  return (
    <div className="gallery-panel-content">
      <div className="gallery-metrics">
        <div>
          <strong>{items.length}</strong>
          <span>items</span>
        </div>
        <div>
          <strong>{overflowCount}</strong>
          <span>overflow</span>
        </div>
      </div>

      <ul className="gallery-list">
        {ordered.map((item) => (
          <li key={item.id}>
            <article className="gallery-item-card">
              <button className="gallery-item-open" onClick={() => openDetail(item.id)} type="button">
                <strong>{item.title}</strong>
                <span>{item.media.kind === 'image' ? 'Image' : 'YouTube'}</span>
              </button>
              <button className="gallery-item-delete" onClick={() => removeItem(item.id)} type="button">
                Delete
              </button>
            </article>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AddTab() {
  const addImageByUrl = useGalleryStore((state) => state.addImageByUrl)
  const addImageByFile = useGalleryStore((state) => state.addImageByFile)
  const addYouTubeUrl = useGalleryStore((state) => state.addYouTubeUrl)

  const [imageTitle, setImageTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageDescription, setImageDescription] = useState('')

  const [youtubeTitle, setYoutubeTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeDescription, setYoutubeDescription] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onAddImageUrl = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      await addImageByUrl({
        title: imageTitle.trim() || 'Untitled image',
        url: imageUrl.trim(),
        description: imageDescription.trim() || undefined,
      })
      setImageTitle('')
      setImageUrl('')
      setImageDescription('')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to add image URL.')
    } finally {
      setBusy(false)
    }
  }

  const onImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setBusy(true)
    setError(null)

    try {
      await addImageByFile(file)
      event.target.value = ''
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to add image file.')
    } finally {
      setBusy(false)
    }
  }

  const onAddYouTube = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      await addYouTubeUrl({
        title: youtubeTitle.trim() || 'Untitled video',
        url: youtubeUrl.trim(),
        description: youtubeDescription.trim() || undefined,
      })
      setYoutubeTitle('')
      setYoutubeUrl('')
      setYoutubeDescription('')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to add YouTube URL.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gallery-panel-content">
      <form className="gallery-form" onSubmit={onAddImageUrl}>
        <h3>Add Image by URL</h3>
        <label>
          Title
          <input onChange={(event) => setImageTitle(event.target.value)} required value={imageTitle} />
        </label>
        <label>
          Image URL (https://)
          <input onChange={(event) => setImageUrl(event.target.value)} required value={imageUrl} />
        </label>
        <label>
          Description
          <textarea onChange={(event) => setImageDescription(event.target.value)} rows={3} value={imageDescription} />
        </label>
        <button disabled={busy} type="submit">
          Add Image URL
        </button>
      </form>

      <section className="gallery-form">
        <h3>Add Image File</h3>
        <input accept="image/*" onChange={onImageFileChange} type="file" />
      </section>

      <form className="gallery-form" onSubmit={onAddYouTube}>
        <h3>Add YouTube URL</h3>
        <label>
          Title
          <input onChange={(event) => setYoutubeTitle(event.target.value)} required value={youtubeTitle} />
        </label>
        <label>
          YouTube URL (https://)
          <input onChange={(event) => setYoutubeUrl(event.target.value)} required value={youtubeUrl} />
        </label>
        <label>
          Description
          <textarea onChange={(event) => setYoutubeDescription(event.target.value)} rows={3} value={youtubeDescription} />
        </label>
        <button disabled={busy} type="submit">
          Add YouTube
        </button>
      </form>

      {error ? <p className="gallery-form-error">{error}</p> : null}
    </div>
  )
}

function DataTab() {
  const exportCollectionAsJson = useGalleryStore((state) => state.exportCollectionAsJson)
  const importCollectionFromJson = useGalleryStore((state) => state.importCollectionFromJson)

  const [lastExport, setLastExport] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onExport = () => {
    setError(null)
    setLastExport(exportCollectionAsJson())
  }

  const onImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setError(null)
    try {
      await importCollectionFromJson(file)
      event.target.value = ''
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Import failed.')
    }
  }

  return (
    <div className="gallery-panel-content">
      <section className="gallery-form">
        <h3>Export</h3>
        <button onClick={onExport} type="button">
          Download JSON
        </button>
      </section>

      <section className="gallery-form">
        <h3>Import</h3>
        <input accept="application/json" onChange={onImportFile} type="file" />
      </section>

      {error ? <p className="gallery-form-error">{error}</p> : null}

      <section className="gallery-form">
        <h3>Last Export Payload</h3>
        <textarea readOnly rows={12} value={lastExport} />
      </section>
    </div>
  )
}
