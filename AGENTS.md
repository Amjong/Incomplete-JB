# Incomplete JB — AGENTS.md

## Project intent
- "Incomplete JB" is a route-based 3D world (hub room + spaces) that must remain expandable.
- Core concept: start in a room, interact with objects (escape-room style), and transition to distinct “spaces” (each space can have different physics/postprocessing/sound).
- Treat this codebase like a small game engine layered on top of React.

## Tooling rules (IMPORTANT)
- Package manager: **pnpm only**. Do not use npm or yarn.
  - Install: `pnpm i`
  - Add deps: `pnpm add <pkg>` / `pnpm add -D <pkg>`
- Use the Codex Desktop App integrated terminal to validate changes (run commands, check logs).
- Always run verification commands before declaring a task “done”.

## Runtime expectations
- This project should work on modern desktop browsers (Chrome/Edge/Safari) with WebGL.
- Prefer stable, mainstream libraries and minimal custom shader complexity at this stage.

## Tech stack (current baseline)
- Vite + React + TypeScript
- 3D: three, @react-three/fiber, @react-three/drei
- Physics: @react-three/rapier (Rapier)
- Postprocessing: @react-three/postprocessing
- Routing: react-router-dom
- State: zustand
- UI animation/transitions: framer-motion

## Engine architecture (do not break)
- “Space = Route”: URL path selects the active space.
  - `/` => `room`
  - `/library` => `library`
  - `/cosmos` => `cosmos`
- Engine code lives under `src/engine/*`.
- Each space lives under `src/spaces/<spaceId>/*` and exports a SpaceDefinition in `src/spaces/<spaceId>/index.ts`.
- Spaces are registered centrally in `src/engine/spaces/registry.ts`.

## Core contracts (must remain stable)
- SpaceDefinition:
  - `id`, `title`, `profile`, `spawn`, optional `controls`, `Scene`
- WorldProfile:
  - `background`, optional `fog`, `gravity`, optional `postprocessing`
- Interactions:
  - Interactable objects register/unregister into a store.
  - InteractionSystem raycasts from screen center.
  - When focused, show HUD prompt.
  - Press **E** triggers `onInteract()` (no mouse click required).

## “Add a new space” checklist (engine extensibility)
When implementing a new space, follow these steps exactly:
1. Create folder: `src/spaces/<newId>/`
2. Implement `<NewId>Scene.tsx` for 3D content
3. Export a `SpaceDefinition` from `src/spaces/<newId>/index.ts`
4. Register it in `src/engine/spaces/registry.ts`
5. Add a route in `src/app/App.tsx`
6. Confirm navigation works and the new space has a distinct WorldProfile

## “Add a new interactable object” checklist
- Use `<Interactable id label onInteract maxDistance>` wrapper.
- `id` must be unique and stable (namespace like `room.bookshelf`, `library.exit`).
- Provide a short label that reads well in HUD (Korean is OK).
- Keep default interaction distance conservative (3–5m) unless explicitly intended.

## Quality gates (run before finishing)
Run these in the integrated terminal:
- Install deps (if needed): `pnpm i`
- Typecheck/build: `pnpm run build`
- Dev smoke test: `pnpm run dev` and confirm:
  - Room loads at `/`
  - Bookshelf => `/library`
  - Ceiling => `/cosmos`
  - Exit objects return to `/`
  - HUD prompt appears when aiming at interactables
  - `E` triggers interaction

If any command fails, fix the root cause (don’t just silence errors).

## Coding conventions
- TypeScript strictness: do not weaken tsconfig to “make it compile”.
- Keep engine systems small and composable:
  - `src/engine/interaction/*` should not import UI-specific code except store flags/events.
  - `src/engine/world/*` should be declarative and driven by WorldProfile.
- Avoid “magic globals” except for small, documented CustomEvent hooks (e.g., open chat).
- Prefer descriptive IDs, consistent naming, and predictable file layout.

## Performance constraints (early rules)
- Avoid heavy geometry counts in the hub room; keep it simple until instancing is introduced.
- Prefer lazy-loading heavier assets per-space (GLTF, textures).
- Do not add large uncompressed textures without a plan (KTX2/Basis later).

## Accessibility / UX (minimal, but required)
- Provide a visible crosshair and interaction prompt.
- Provide a “how to control” hint somewhere (HUD footer is fine).
- Avoid blocking alerts for core interactions (OK only as temporary placeholder).

## What NOT to do
- Do not introduce a database/backend yet (knowledge library CRUD is later).
- Do not overengineer character controller / collision in this phase unless explicitly asked.
- Do not add new frameworks (Next.js, Redux, etc.) without request.

## Definition of Done (engine skeleton phase)
- The repository boots with pnpm.
- The 3 initial spaces work and are route-driven.
- Interaction system + HUD prompt + E-to-interact works consistently.
- Space-specific WorldProfile differences are visible (background/fog/postprocessing/gravity at minimum).
- Code structure supports adding new spaces and interactables with minimal friction.
