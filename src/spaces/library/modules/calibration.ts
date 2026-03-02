import type {
  LibraryModuleKey,
  ModuleCalibration,
  ModuleCalibrationOverride,
} from './moduleTypes'

export type CalibrationPreset = 'identity' | 'floor-pivot' | 'center-pivot'

export interface RuntimeCalibration {
  moduleBase?: Partial<Record<LibraryModuleKey, ModuleCalibrationOverride>>
  placements?: Record<string, ModuleCalibrationOverride>
  preset?: CalibrationPreset
}

const IDENTITY_CALIBRATION: ModuleCalibration = {
  offset: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
}

const PRESET_OVERRIDES: Record<CalibrationPreset, ModuleCalibrationOverride> = {
  identity: {
    offset: [0, 0, 0],
  },
  'floor-pivot': {
    offset: [0, 0, 0],
  },
  'center-pivot': {
    offset: [0, 0, 0],
  },
}

// Default authored-pivot assumptions by module.
export const MODULE_BASE_CALIBRATION: Record<LibraryModuleKey, ModuleCalibrationOverride> = {
  tower: {
    offset: [0, -4, 0],
  },
  bridge: {
    offset: [0, -0.11, 0],
  },
  mezzanine: {
    offset: [0, -0.125, 0],
  },
  stairStep: {
    offset: [0, -0.12, 0],
  },
  railing: {
    offset: [0, -0.85, 0],
  },
  floor: {
    offset: [0, 0, 0],
  },
  backWall: {
    offset: [0, 0, 0],
  },
  entryWall: {
    offset: [0, 0, 0],
  },
  windowWall: {
    offset: [0, 0, 0],
  },
}

// Placement-specific tuning keys used in LibraryScene.
export const MODULE_PLACEMENT_CALIBRATION: Record<string, ModuleCalibrationOverride> = {
  'mezzanine.left': {},
  'mezzanine.right': {},
  'mezzanine.entry': {},
  'floor.main': {},
  'wall.back': {},
  'wall.entry': {},
  'window.backlight': {},
}

function mergeVec3(base: [number, number, number], override?: [number, number, number]) {
  if (!override) {
    return base
  }

  return [override[0], override[1], override[2]] as [number, number, number]
}

export function resolveCalibration(
  moduleKey: LibraryModuleKey,
  placementKey?: string,
  calibration?: ModuleCalibrationOverride,
  preset: CalibrationPreset = 'identity',
  runtime?: RuntimeCalibration | null,
): ModuleCalibration {
  const runtimePreset = runtime?.preset
  const effectivePreset = runtimePreset ?? preset
  const presetOverride = PRESET_OVERRIDES[effectivePreset]
  const moduleOverride = runtime?.moduleBase?.[moduleKey] ?? MODULE_BASE_CALIBRATION[moduleKey]
  const placementOverride = placementKey
    ? runtime?.placements?.[placementKey] ?? MODULE_PLACEMENT_CALIBRATION[placementKey]
    : undefined

  return {
    offset: mergeVec3(
      IDENTITY_CALIBRATION.offset,
      calibration?.offset ?? placementOverride?.offset ?? moduleOverride?.offset ?? presetOverride.offset,
    ),
    rotation: mergeVec3(
      IDENTITY_CALIBRATION.rotation,
      calibration?.rotation ?? placementOverride?.rotation ?? moduleOverride?.rotation ?? presetOverride.rotation,
    ),
    scale: mergeVec3(
      IDENTITY_CALIBRATION.scale,
      calibration?.scale ?? placementOverride?.scale ?? moduleOverride?.scale ?? presetOverride.scale,
    ),
  }
}
