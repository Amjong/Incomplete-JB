import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { pathToSpaceId } from '../engine/spaces/registry'
import { useEngineStore } from '../store/useEngineStore'

export function SpaceRouterSync() {
  const pathname = useLocation().pathname
  const setSpaceId = useEngineStore((state) => state.setSpaceId)
  const setChatOpen = useEngineStore((state) => state.setChatOpen)

  useEffect(() => {
    setSpaceId(pathToSpaceId(pathname))
    setChatOpen(false)
  }, [pathname, setSpaceId, setChatOpen])

  return null
}
