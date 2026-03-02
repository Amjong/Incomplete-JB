import { useEngineStore } from '../../store/useEngineStore'
import { spaceRegistry } from '../spaces/registry'
import { LibraryKnowledgePanels } from '../../spaces/library/knowledge/LibraryKnowledgePanels'

export function SpaceHUD() {
  const spaceId = useEngineStore((state) => state.spaceId)
  const focusedId = useEngineStore((state) => state.focusedId)
  const interactables = useEngineStore((state) => state.interactables)
  const chatOpen = useEngineStore((state) => state.chatOpen)
  const setChatOpen = useEngineStore((state) => state.setChatOpen)
  const audioMuted = useEngineStore((state) => state.audioMuted)
  const setAudioMuted = useEngineStore((state) => state.setAudioMuted)

  const label = focusedId ? interactables.get(focusedId)?.label ?? null : null

  return (
    <div className="hud-root">
      <div className="crosshair" />

      {label ? (
        <div className="interaction-prompt">
          <strong>Press E</strong>
          <span>{label}</span>
        </div>
      ) : null}

      <div className="hud-tips">Click to lock pointer. Mouse look. WASD move. K or Tab opens Knowledge panel in Library.</div>
      <div className="space-label">Incomplete JB — Space: {spaceRegistry[spaceId].title}</div>
      <button
        className="sound-toggle"
        onClick={() => setAudioMuted(!audioMuted)}
        type="button"
      >
        {audioMuted ? 'Sound Off' : 'Sound On'}
      </button>

      {chatOpen ? (
        <div className="chat-overlay">
          <h2>Robot Channel</h2>
          <p>Chat overlay placeholder. Connect your narrative/chat system here.</p>
          <button onClick={() => setChatOpen(false)} type="button">
            Close
          </button>
        </div>
      ) : null}

      <LibraryKnowledgePanels />
    </div>
  )
}
