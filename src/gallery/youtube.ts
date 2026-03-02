const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

function sanitizeId(id: string | null): string | null {
  if (!id) {
    return null
  }

  const trimmed = id.trim()
  return YOUTUBE_ID_PATTERN.test(trimmed) ? trimmed : null
}

export function parseYouTubeId(urlString: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(urlString)
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0] ?? null
    return sanitizeId(id)
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const v = parsed.searchParams.get('v')
    const byQuery = sanitizeId(v)
    if (byQuery) {
      return byQuery
    }

    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments.length >= 2 && (segments[0] === 'shorts' || segments[0] === 'embed')) {
      return sanitizeId(segments[1])
    }
  }

  return null
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}
