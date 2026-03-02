export type LibraryModuleKey =
  | 'tower'
  | 'bridge'
  | 'mezzanine'
  | 'stairStep'
  | 'railing'
  | 'floor'
  | 'backWall'
  | 'entryWall'
  | 'windowWall'

export type Vec3 = [number, number, number]

export interface ModuleCalibration {
  offset: Vec3
  rotation: Vec3
  scale: Vec3
}

export type ModuleCalibrationOverride = Partial<ModuleCalibration>
