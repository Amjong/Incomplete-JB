import { useMemo } from 'react'
import { useGalleryStore } from '../../../store/useGalleryStore'

interface GalleryDetailScreenProps {
  onClose: () => void
}

export function GalleryDetailScreen({ onClose }: GalleryDetailScreenProps) {
  const items = useGalleryStore((state) => state.collection.items)
  const detailItemId = useGalleryStore((state) => state.detailItemId)
  const closeDetail = useGalleryStore((state) => state.closeDetail)

  const item = useMemo(
    () => items.find((candidate) => candidate.id === detailItemId) ?? null,
    [detailItemId, items],
  )

  if (!item) {
    return null
  }

  const closeAll = () => {
    closeDetail()
    onClose()
  }

  return (
    <section className="gallery-detail-screen">
      <div className="gallery-detail-backdrop" />
      <article className="gallery-detail-frame">
        <header className="gallery-detail-toolbar">
          <button
            onClick={() => {
              closeDetail()
            }}
            type="button"
          >
            Back
          </button>
          <strong>Exhibit Viewer</strong>
          <button onClick={closeAll} type="button">
            Close
          </button>
        </header>

        <div className="gallery-detail-paper">
          <h1>{item.title}</h1>
          {item.description ? <p className="gallery-detail-description">{item.description}</p> : null}

          <div className="gallery-detail-media-wrap">
            {item.media.kind === 'image' ? (
              <img alt={item.title} className="gallery-detail-image" src={item.media.src} />
            ) : (
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="gallery-detail-youtube"
                referrerPolicy="strict-origin-when-cross-origin"
                src={`https://www.youtube.com/embed/${item.media.youtubeId}`}
                title={item.title}
              />
            )}
          </div>

          <dl className="gallery-detail-meta">
            <div>
              <dt>Type</dt>
              <dd>{item.media.kind === 'image' ? 'Image' : 'YouTube'}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(item.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{new Date(item.updatedAt).toLocaleString()}</dd>
            </div>
            {item.media.kind === 'image' ? (
              <div>
                <dt>Original Size</dt>
                <dd>
                  {item.media.naturalWidth} x {item.media.naturalHeight}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </article>
    </section>
  )
}
