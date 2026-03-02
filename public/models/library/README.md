# Library GLB Modules

Put production-quality library modules in this folder with these exact names:

- `library-tower.glb`
- `library-bridge.glb`
- `library-mezzanine.glb`
- `library-stair-step.glb`
- `library-railing.glb`
- `library-floor.glb`
- `library-back-wall.glb`
- `library-entry-wall.glb`
- `library-window-wall.glb`

## Placement conventions

- Units: meters
- Up axis: Y-up
- Forward: -Z
- Pivot should be centered at floor contact where possible:
  - `library-tower.glb`: pivot at module center on floor (0,0,0)
  - `library-bridge.glb`: pivot at bridge center
  - `library-mezzanine.glb`: pivot at deck center
  - `library-stair-step.glb`: pivot at single step center
  - `library-railing.glb`: pivot at railing center
  - `library-floor.glb`: pivot at floor center
  - `library-back-wall.glb`: pivot at wall center
  - `library-entry-wall.glb`: pivot at wall center
  - `library-window-wall.glb`: pivot at window panel center

## Current behavior

If a GLB is missing, the scene automatically falls back to procedural block geometry.
This lets level design continue while art assets are being produced.

## Calibration workflow

Runtime calibration is controlled in:

- `/Users/gaamza/dev/Incomplete-JB/src/spaces/library/modules/LibraryModule.tsx`
- `/Users/gaamza/dev/Incomplete-JB/public/models/library/calibration.json`

Tune these tables:

- `MODULE_BASE_CALIBRATION`: module-wide default alignment
- `MODULE_PLACEMENT_CALIBRATION`: per-placement fine tuning (`mezzanine.left`, `tower.1.3`, etc.)
- `calibration.json`: runtime override without code edits (`moduleBase`, `placements`, `preset`)

Preset switching during calibration:

- `?libraryPreset=identity`
- `?libraryPreset=floor-pivot`
- `?libraryPreset=center-pivot`

Custom calibration file:

- `?libraryCalibration=/models/library/calibration.json`
- You can point this to another JSON while tuning variants.

## Recommended replacement order

1. `library-floor.glb` + `library-mezzanine.glb`
2. `library-tower.glb`
3. `library-bridge.glb` + `library-stair-step.glb`
4. `library-railing.glb`
5. `library-back-wall.glb` + `library-window-wall.glb` + `library-entry-wall.glb`
