import { AnimatePresence, motion } from 'framer-motion'
import { useEngineStore } from '../../store/useEngineStore'

export function TransitionOverlay() {
  const phase = useEngineStore((state) => state.transition.phase)

  const isActive = phase !== 'idle'
  const isZoomIn = phase === 'zoom-in' || phase === 'navigate'

  return (
    <AnimatePresence>
      {isActive ? (
        <motion.div
          key={phase}
          animate={{ opacity: isZoomIn ? 0.92 : 0 }}
          className="transition-overlay"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: isZoomIn ? 0.24 : 0.38, ease: 'easeInOut' }}
        >
          <motion.div
            animate={{ opacity: isZoomIn ? 0.9 : 0, scale: isZoomIn ? 1 : 1.5 }}
            className="transition-portal"
            initial={{ opacity: 0.2, scale: 2.4 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
