import { BrowserRouter } from 'react-router-dom'
import { useLibraryViewMode } from './useLibraryViewMode'
import { SpaceCanvas } from '../engine/SpaceCanvas'
import { SpaceHUD } from '../engine/hud/SpaceHUD'
import { TransitionOverlay } from '../engine/hud/TransitionOverlay'
import { SpaceRouterSync } from './SpaceRouterSync'
import { LibraryWorkspaceRoot } from '../spaces/library/workspace/LibraryWorkspaceRoot'

function AppFrame() {
  const { isWorkspaceOpen } = useLibraryViewMode()

  return (
    <div className="app-root">
      <SpaceRouterSync />
      {!isWorkspaceOpen ? <SpaceCanvas /> : null}
      {!isWorkspaceOpen ? <SpaceHUD /> : null}
      {!isWorkspaceOpen ? <TransitionOverlay /> : null}
      <LibraryWorkspaceRoot />
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AppFrame />
    </BrowserRouter>
  )
}
