import { BrowserRouter } from 'react-router-dom'
import { SpaceCanvas } from '../engine/SpaceCanvas'
import { SpaceHUD } from '../engine/hud/SpaceHUD'
import { TransitionOverlay } from '../engine/hud/TransitionOverlay'
import { SpaceRouterSync } from './SpaceRouterSync'

export function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <SpaceRouterSync />
        <SpaceCanvas />
        <SpaceHUD />
        <TransitionOverlay />
      </div>
    </BrowserRouter>
  )
}
