# Incomplete JB — 3D Engine Skeleton Specification

## 1. Project Philosophy

Project name: **Incomplete JB**

Meaning:
- JB = personal identity
- Incomplete = always evolving, never finished
- The website is not a static page but an expandable 3D world

Core Concept:
- Start in a 3D room (hub)
- Interact with objects (escape-room style)
- Each object leads to a different “Space”
- Each Space can feel like a completely different world
  - Different lighting
  - Different physics
  - Different postprocessing
  - Different sound (future phase)

The architecture must prioritize **extensibility**.

---

## 2. Technical Stack (Current Phase)

Package manager: **pnpm only**

Framework:
- Vite
- React
- TypeScript

3D:
- three
- @react-three/fiber
- @react-three/drei

Physics:
- @react-three/rapier

Postprocessing:
- @react-three/postprocessing

State:
- zustand

Routing:
- react-router-dom

Animation:
- framer-motion

---

## 3. Architectural Principles

### 3.1 Space = Route

URL path determines active space.

Routes:
- `/` → room
- `/library` → library
- `/cosmos` → cosmos

Routing must:
- Control which SpaceDefinition is active
- Trigger Physics remount
- Apply new WorldProfile
- Reset spawn position

---

### 3.2 Folder Structure

src/
app/
App.tsx
SpaceRouterSync.tsx

engine/
SpaceCanvas.tsx
SpaceManager.tsx

spaces/
  registry.ts
  types.ts

world/
  World.tsx
  WorldProfile.ts

interaction/
  Interactable.tsx
  InteractionSystem.tsx

hud/
  SpaceHUD.tsx
  TransitionOverlay.tsx

spaces/
room/
index.ts
RoomScene.tsx
library/
index.ts
LibraryScene.tsx
cosmos/
index.ts
CosmosScene.tsx

store/
useEngineStore.ts

main.tsx
styles.css



Engine logic MUST remain inside `src/engine`.

Spaces MUST remain inside `src/spaces`.

---

## 4. Core Contracts

### 4.1 SpaceDefinition

Each space exports:

{
id: SpaceId
title: string
profile: WorldProfile
spawn: { position: [x,y,z] }
controls?: { speed?: number }
Scene: React.FC
}


---

### 4.2 WorldProfile

Defines how a space feels.

{
background: string
fog?: { color, near, far }
gravity: [x,y,z]
postprocessing?: {
bloom?
vignette?
noise?
}
}


WorldProfile MUST:
- Change visible atmosphere
- Remount physics
- Apply background + fog
- Apply postprocessing

---

### 4.3 Interaction System

Rules:
- Raycast from screen center
- If intersecting an Interactable within maxDistance:
  - Set focusedId
  - Show HUD prompt
- Press **E** triggers `onInteract`

No mouse click required.

Interactable component must:
- Register object into store
- Unregister on unmount
- Use unique id (e.g. room.bookshelf)

---

## 5. Required Features (Engine Skeleton Phase)

### 5.1 Movement

- PointerLockControls
- WASD movement
- Movement restricted to XZ plane
- No collision required yet (future phase)

---

### 5.2 HUD

Must include:
- Crosshair at screen center
- Interaction prompt:
  - “Press E”
  - Object label
- Space label footer:
  - “Incomplete JB — Space: <title>”

---

### 5.3 Room Space

Must contain:

1. Floor
2. Back wall
3. Bookshelf → navigate('/library')
4. Papers → placeholder action
5. Robot → open chat overlay
6. Ceiling circle → navigate('/cosmos')

Interaction distance:
- 3–5 meters typical

---

### 5.4 Library Space

Must contain:
- Long aisle floor
- Repeating shelf geometry
- Exit object → navigate('/')

Profile must visually differ from room:
- Darker blue tone
- Bloom enabled
- Fog present
- Slightly reduced gravity

---

### 5.5 Cosmos Space

Must contain:
- Starfield
- Floating object
- Exit portal → navigate('/')

Profile must:
- Gravity = [0,0,0]
- Strong bloom
- Very dark background
- Minimal fog

Movement speed slightly faster than room.

---

## 6. State Management (Zustand)

Store must manage:

- spaceId
- interactables (Map)
- focusedId
- chatOpen

Engine systems must NOT directly mutate global variables.
Everything flows through the store.

---

## 7. Space Transition

On route change:
- Update spaceId
- Remount Physics
- Apply new WorldProfile
- Move camera to spawn position
- Trigger fade transition overlay

---

## 8. Quality Checklist

The following must work:

[ ] `/` loads Room
[ ] `/library` loads Library
[ ] `/cosmos` loads Cosmos
[ ] HUD shows crosshair
[ ] Aiming at object shows prompt
[ ] Press E triggers interaction
[ ] Exit returns to `/`
[ ] Physics remounts per space
[ ] WorldProfile visibly changes environment

---

## 9. Non-Goals (Current Phase)

Do NOT:
- Add backend
- Add database
- Implement real markdown editor
- Add complex character collider
- Add custom shader systems
- Introduce new frameworks

This phase is ONLY about engine skeleton.

---

## 10. Definition of Done

The engine skeleton is complete when:

- The project runs with pnpm
- All 3 spaces are route-driven
- Interaction system works reliably
- WorldProfile visibly differentiates spaces
- New space can be added with:
  - New folder
  - registry entry
  - route entry

Minimal friction extensibility achieved.

---

END OF SPEC
