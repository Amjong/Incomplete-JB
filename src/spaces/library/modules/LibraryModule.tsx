import type { ThreeElements } from '@react-three/fiber'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Group, type Material, type Mesh, type Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  resolveCalibration,
  type CalibrationPreset,
  type RuntimeCalibration,
} from './calibration'
import type { LibraryModuleKey, ModuleCalibrationOverride } from './moduleTypes'

const MODULE_URLS: Record<LibraryModuleKey, string> = {
  tower: '/models/library/library-tower.glb',
  bridge: '/models/library/library-bridge.glb',
  mezzanine: '/models/library/library-mezzanine.glb',
  stairStep: '/models/library/library-stair-step.glb',
  railing: '/models/library/library-railing.glb',
  floor: '/models/library/library-floor.glb',
  backWall: '/models/library/library-back-wall.glb',
  entryWall: '/models/library/library-entry-wall.glb',
  windowWall: '/models/library/library-window-wall.glb',
}

const resolvedCache = new Map<string, Group | null>()
const pendingCache = new Map<string, Promise<Group | null>>()
const warnedMissing = new Set<string>()
let runtimeCalibrationCache: RuntimeCalibration | null | undefined
let runtimeCalibrationRequest: Promise<RuntimeCalibration | null> | null = null

function forEachMaterial(material: Material | Material[], callback: (mat: Material) => void) {
  if (Array.isArray(material)) {
    material.forEach(callback)
    return
  }

  callback(material)
}

function prepareImportedMesh(root: Object3D) {
  root.traverse((node) => {
    const mesh = node as Mesh
    if (!mesh.isMesh) {
      return
    }

    mesh.castShadow = true
    mesh.receiveShadow = true

    if (!mesh.material) {
      return
    }

    forEachMaterial(mesh.material, (material) => {
      if ('needsUpdate' in material) {
        material.needsUpdate = true
      }
    })
  })
}

function loadModule(url: string): Promise<Group | null> {
  const cached = resolvedCache.get(url)
  if (cached !== undefined) {
    return Promise.resolve(cached)
  }

  const pending = pendingCache.get(url)
  if (pending) {
    return pending
  }

  const loader = new GLTFLoader()
  const request = new Promise<Group | null>((resolve) => {
    loader.load(
      url,
      (gltf) => {
        prepareImportedMesh(gltf.scene)
        resolvedCache.set(url, gltf.scene)
        pendingCache.delete(url)
        resolve(gltf.scene)
      },
      undefined,
      () => {
        resolvedCache.set(url, null)
        pendingCache.delete(url)
        if (!warnedMissing.has(url)) {
          warnedMissing.add(url)
          // eslint-disable-next-line no-console
          console.warn(`[LibraryModule] Missing GLB: ${url}. Using procedural fallback.`)
        }
        resolve(null)
      },
    )
  })

  pendingCache.set(url, request)
  return request
}

function useLibraryModule(moduleKey: LibraryModuleKey) {
  const url = MODULE_URLS[moduleKey]
  const [baseScene, setBaseScene] = useState<Group | null>(() => resolvedCache.get(url) ?? null)

  useEffect(() => {
    let alive = true

    void loadModule(url).then((scene) => {
      if (!alive) {
        return
      }
      setBaseScene(scene)
    })

    return () => {
      alive = false
    }
  }, [url])

  return useMemo(() => (baseScene ? baseScene.clone(true) : null), [baseScene])
}

function readCalibrationPath() {
  if (typeof window === 'undefined') {
    return '/models/library/calibration.json'
  }

  const queryValue = new URLSearchParams(window.location.search).get('libraryCalibration')
  if (!queryValue) {
    return '/models/library/calibration.json'
  }

  return queryValue
}

function fetchRuntimeCalibration(path: string): Promise<RuntimeCalibration | null> {
  if (runtimeCalibrationCache !== undefined) {
    return Promise.resolve(runtimeCalibrationCache)
  }

  if (runtimeCalibrationRequest) {
    return runtimeCalibrationRequest
  }

  runtimeCalibrationRequest = fetch(path)
    .then(async (response) => {
      if (!response.ok) {
        return null
      }

      const payload = (await response.json()) as RuntimeCalibration
      runtimeCalibrationCache = payload
      return payload
    })
    .catch(() => null)
    .finally(() => {
      runtimeCalibrationRequest = null
    })

  return runtimeCalibrationRequest
}

function useRuntimeCalibration() {
  const [runtimeCalibration, setRuntimeCalibration] = useState<RuntimeCalibration | null>(
    runtimeCalibrationCache ?? null,
  )

  const calibrationPath = useMemo(() => readCalibrationPath(), [])

  useEffect(() => {
    let alive = true
    void fetchRuntimeCalibration(calibrationPath).then((payload) => {
      if (!alive) {
        return
      }
      setRuntimeCalibration(payload)
    })

    return () => {
      alive = false
    }
  }, [calibrationPath])

  return runtimeCalibration
}

function readCalibrationPreset(): CalibrationPreset {
  if (typeof window === 'undefined') {
    return 'identity'
  }

  const preset = new URLSearchParams(window.location.search).get('libraryPreset')
  if (preset === 'floor-pivot' || preset === 'center-pivot' || preset === 'identity') {
    return preset
  }

  return 'identity'
}

type GroupProps = Omit<ThreeElements['group'], 'children'>

interface LibraryModuleProps extends GroupProps {
  moduleKey: LibraryModuleKey
  placementKey?: string
  calibration?: ModuleCalibrationOverride
  fallback?: ReactNode
}

export function LibraryModule({
  moduleKey,
  placementKey,
  calibration,
  fallback = null,
  ...props
}: LibraryModuleProps) {
  const scene = useLibraryModule(moduleKey)
  const preset = useMemo(() => readCalibrationPreset(), [])
  const runtimeCalibration = useRuntimeCalibration()

  const finalCalibration = useMemo(
    () => resolveCalibration(moduleKey, placementKey, calibration, preset, runtimeCalibration),
    [moduleKey, placementKey, calibration, preset, runtimeCalibration],
  )

  return (
    <group {...props}>
      {scene ? (
        <group
          position={finalCalibration.offset}
          rotation={finalCalibration.rotation}
          scale={finalCalibration.scale}
        >
          <primitive object={scene} />
        </group>
      ) : (
        fallback
      )}
    </group>
  )
}
