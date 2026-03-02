import { Html } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import { SRGBColorSpace, Texture, TextureLoader } from 'three'
import { Interactable } from '../../engine/interaction/Interactable'
import type { GalleryItem } from '../../gallery/types'
import { useGalleryStore } from '../../store/useGalleryStore'

function useTextureMap(src: string) {
  const [texture, setTexture] = useState<Texture | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setFailed(false)
    const loader = new TextureLoader()
    loader.setCrossOrigin('anonymous')

    loader.load(
      src,
      (nextTexture) => {
        if (!alive) {
          nextTexture.dispose()
          return
        }
        nextTexture.colorSpace = SRGBColorSpace
        setTexture(nextTexture)
        setFailed(false)
      },
      undefined,
      () => {
        if (alive) {
          setTexture(null)
          setFailed(true)
        }
      },
    )

    return () => {
      alive = false
      setTexture((current) => {
        current?.dispose()
        return null
      })
    }
  }, [src])

  return { texture, failed }
}

function GalleryImagePlane({ item, width, height }: { item: GalleryItem; width: number; height: number }) {
  const imageSrc = item.media.kind === 'image' ? item.media.src : item.media.thumbUrl
  const { texture, failed } = useTextureMap(imageSrc)
  const [fallbackLoadFailed, setFallbackLoadFailed] = useState(false)

  useEffect(() => {
    setFallbackLoadFailed(false)
  }, [imageSrc])

  return (
    <>
      {texture ? (
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      ) : (
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial color="#d7dde4" roughness={0.92} />
        </mesh>
      )}

      {failed && !fallbackLoadFailed ? (
        <Html
          center
          occlude
          position={[0, 0, 0.004]}
          transform
        >
          <img
            alt={item.title}
            onError={() => setFallbackLoadFailed(true)}
            src={imageSrc}
            style={{
              background: '#d7dde4',
              display: 'block',
              height: `${Math.max(80, Math.round(height * 320))}px`,
              objectFit: 'cover',
              pointerEvents: 'none',
              userSelect: 'none',
              width: `${Math.max(80, Math.round(width * 320))}px`,
            }}
          />
        </Html>
      ) : null}

      {item.media.kind === 'youtube' ? (
        <group position={[0, 0, 0.018]}>
          <mesh>
            <circleGeometry args={[0.22, 40]} />
            <meshStandardMaterial color="#ffffff" opacity={0.9} transparent />
          </mesh>
          <mesh position={[0.02, 0, 0.002]}>
            <coneGeometry args={[0.085, 0.15, 3]} />
            <meshStandardMaterial color="#1e1f23" />
          </mesh>
        </group>
      ) : null}
    </>
  )
}

function FrameBars({
  width,
  height,
  border,
  depth,
  z,
  color,
  metalness,
  roughness,
}: {
  width: number
  height: number
  border: number
  depth: number
  z: number
  color: string
  metalness: number
  roughness: number
}) {
  const halfW = width * 0.5
  const halfH = height * 0.5

  return (
    <>
      <mesh position={[0, halfH + border * 0.5, z]}>
        <boxGeometry args={[width + border * 2, border, depth]} />
        <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
      </mesh>
      <mesh position={[0, -halfH - border * 0.5, z]}>
        <boxGeometry args={[width + border * 2, border, depth]} />
        <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
      </mesh>
      <mesh position={[-halfW - border * 0.5, 0, z]}>
        <boxGeometry args={[border, height, depth]} />
        <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
      </mesh>
      <mesh position={[halfW + border * 0.5, 0, z]}>
        <boxGeometry args={[border, height, depth]} />
        <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
      </mesh>
    </>
  )
}

export function GalleryExhibitLayer() {
  const items = useGalleryStore((state) => state.collection.items)
  const placements = useGalleryStore((state) => state.layout.placements)
  const overflowItemIds = useGalleryStore((state) => state.layout.overflowItemIds)
  const openDetail = useGalleryStore((state) => state.openDetail)

  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])

  return (
    <>
      {placements.map((placement) => {
        const item = itemMap.get(placement.itemId)
        if (!item) {
          return null
        }

        return (
          <Interactable
            id={`gallery.item.${item.id}`}
            key={placement.id}
            label={item.title}
            onInteract={() => openDetail(item.id)}
            position={placement.position}
            rotation={placement.rotation}
          >
            <group>
              <FrameBars
                border={0.11}
                color="#5f4633"
                depth={0.14}
                height={placement.height + 0.16}
                metalness={0.1}
                roughness={0.62}
                width={placement.width + 0.16}
                z={-0.055}
              />

              <FrameBars
                border={0.04}
                color="#f3efe6"
                depth={0.04}
                height={placement.height + 0.02}
                metalness={0.02}
                roughness={0.94}
                width={placement.width + 0.02}
                z={-0.014}
              />

              <GalleryImagePlane height={placement.height} item={item} width={placement.width} />
            </group>
          </Interactable>
        )
      })}

      {overflowItemIds.map((itemId, index) => {
        const item = itemMap.get(itemId)
        if (!item) {
          return null
        }

        const yOffset = 2.8 - index * 0.5
        return (
          <Interactable
            id={`gallery.overflow.${item.id}`}
            key={`overflow-${item.id}`}
            label={`Open ${item.title}`}
            onInteract={() => openDetail(item.id)}
            position={[0, yOffset, 13.3]}
          >
            <mesh>
              <boxGeometry args={[3.2, 0.32, 0.1]} />
              <meshStandardMaterial color="#f0ece4" emissive="#8d8b84" emissiveIntensity={0.22} />
            </mesh>
          </Interactable>
        )
      })}
    </>
  )
}
