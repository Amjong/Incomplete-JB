# Library Workspace Architecture

## Decision

`/library` space keeps its 3D exploration mode, but pressing `K` no longer opens the existing panel UI.
Instead, it switches the app into a fullscreen knowledge workspace backed by a server-side database.

This is not a Logseq source-code integration.
It is a server-backed knowledge system with a Logseq-inspired workflow:

- Markdown is the source of truth for document content.
- Tags, wikilinks, backlinks, and search are derived features.
- The workspace is available across desktop and mobile browsers.
- The 3D library remains a navigable space, but not the primary editing surface.

## Goals

- Support one personal knowledge repository across multiple PCs and mobile devices.
- Store documents as Markdown text.
- Allow fast search, tagging, wikilinks, and recent-history browsing.
- Keep the current engine contract stable: `/library` still maps to the library space.
- Make the `K` action feel like entering a dedicated workspace, not opening a side panel.

## Non-Goals

- Full Logseq source embedding.
- Local file graph support.
- Real-time multi-user collaboration in the first iteration.
- Dynamic 3D shelf rendering from every keystroke.

## Product Flow

### World mode

- User enters `/library`.
- 3D space, interactables, and HUD behave as they do now.
- Pressing `K` transitions from world mode to workspace mode.

### Workspace mode

- 3D canvas is hidden.
- A fullscreen responsive workspace replaces it.
- User can browse documents, edit Markdown, search, filter by tags, and inspect backlinks.
- Closing the workspace returns the user to the same `/library` world state.

### URL behavior

Keep the path `/library` and use a search param for the view mode:

- `/library` -> world mode
- `/library?view=workspace` -> workspace mode
- `/library?view=workspace&doc=<slug>` -> workspace mode with a document open

This preserves the existing `Space = Route` contract because the pathname stays `/library`.

## Frontend Architecture

## App-level mode control

The current app always renders the 3D canvas and HUD.
That must change so the library can replace the canvas with the workspace.

### Current boundaries

- `src/app/App.tsx` renders `SpaceCanvas`, `SpaceHUD`, and `TransitionOverlay`.
- `src/spaces/library/knowledge/LibraryKnowledgePanels.tsx` owns the `K` shortcut and panel UI.
- `src/store/useKnowledgeStore.ts` mixes UI state, search state, and local draft state.

### New boundaries

- `SpaceCanvas` should render only when the active library view is `world`.
- `SpaceHUD` should render only world HUD elements when the workspace is closed.
- `LibraryKnowledgePanels` should be removed and replaced with a workspace entry controller.
- Knowledge UI state and remote document data should be split into separate layers.

## Proposed frontend files

- `src/store/useLibraryWorkspaceStore.ts`
  - UI-only store for workspace open state, selected document, filters, draft status, and pending saves.
- `src/app/useLibraryViewMode.ts`
  - Hook that reads and writes the `view=workspace` search param.
- `src/spaces/library/workspace/LibraryWorkspaceShell.tsx`
  - Fullscreen layout container.
- `src/spaces/library/workspace/WorkspaceSidebar.tsx`
  - Search, tags, recent docs, navigation list.
- `src/spaces/library/workspace/WorkspaceEditor.tsx`
  - Markdown editor, save status, title, tags.
- `src/spaces/library/workspace/WorkspacePreview.tsx`
  - Read preview if split view is enabled.
- `src/spaces/library/workspace/WorkspaceBacklinks.tsx`
  - Backlink and linked-doc panel.
- `src/knowledge/api/client.ts`
  - Data access layer for remote knowledge APIs.
- `src/knowledge/api/types.ts`
  - Shared DTOs for the remote layer.

## State split

### `useLibraryWorkspaceStore`

UI state only:

- `isOpen`
- `selectedDocId`
- `selectedDocSlug`
- `query`
- `activeTag`
- `sidebarOpen`
- `editorMode` (`edit` | `preview` | `split`)
- `saveState` (`idle` | `saving` | `saved` | `error`)
- `lastSavedAt`

### Remote data hooks

Server data should not live in the same mutable store as keyboard/UI state.
Use async hooks for remote data:

- `useKnowledgeDocuments`
- `useKnowledgeDocument`
- `useKnowledgeBacklinks`
- `useKnowledgeRecentDocuments`
- `useSaveKnowledgeDocument`

If a data library is introduced later, these hooks can move behind React Query.
For the first implementation, a thin client plus local component state is enough.

## Workspace UI layout

Desktop:

- Left sidebar: search, recent docs, tags, create button
- Main editor: title + Markdown body
- Right rail: backlinks, outgoing links, metadata

Mobile:

- Fullscreen editor-first layout
- Sidebar becomes a drawer
- Right rail becomes tabs under the editor
- The workspace must avoid iframe-style nesting and own the full viewport

## Recommended editor behavior

Use Markdown as the persisted format.
Start with a document-oriented editor, not a true block database.

### Persisted fields

- `title`
- `slug`
- `contentMarkdown`
- `tags`
- `summary`
- `status`

### Derived features

- `[[wikilinks]]` parsed from Markdown
- `#tags` normalized into the `tags` array
- backlinks derived from outgoing links
- recent changes sorted by `updated_at`

This gets most of the useful Logseq behavior without inheriting Logseq's app/runtime complexity.

## Backend Recommendation

## Stack

Use Supabase as the first backend target:

- Postgres for documents and indexes
- Supabase Auth for cross-device sign-in
- Row Level Security for per-user data isolation
- Optional Edge Functions later for derived indexing and imports

This is the fastest way to get a stable personal repository running across web and mobile browsers.

## Data model

### `knowledge_documents`

- `id uuid primary key`
- `owner_id uuid not null`
- `slug text not null`
- `title text not null`
- `summary text not null default ''`
- `content_markdown text not null`
- `tags text[] not null default '{}'`
- `status text not null default 'active'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `archived_at timestamptz null`
- `last_opened_at timestamptz null`
- `version integer not null default 1`

Constraints:

- unique `(owner_id, slug)`
- check `status in ('active', 'archived')`

### `knowledge_document_links`

- `id uuid primary key`
- `owner_id uuid not null`
- `source_document_id uuid not null`
- `target_slug text not null`
- `target_document_id uuid null`
- `created_at timestamptz not null default now()`

Purpose:

- store parsed outgoing wikilinks
- resolve backlinks cheaply
- allow unresolved links before the target doc exists

### `knowledge_document_revisions`

- `id uuid primary key`
- `owner_id uuid not null`
- `document_id uuid not null`
- `version integer not null`
- `title text not null`
- `summary text not null`
- `content_markdown text not null`
- `tags text[] not null`
- `created_at timestamptz not null default now()`

Purpose:

- lightweight history
- safe rollback
- future diff UI

## Search strategy

Do not keep the current in-memory search as the primary search path once the backend is live.

Recommended:

- Postgres full-text search over `title`, `summary`, and `content_markdown`
- exact or partial filtering on `tags`
- sort by `updated_at` or relevance

For MVP, this is enough:

- search by keyword
- filter by tag
- include/exclude archived docs

Semantic search can wait.

## API Contract

The frontend should talk to a narrow knowledge API layer, even if the first implementation uses the Supabase client directly.
This keeps the app portable if a custom backend is added later.

### Read APIs

- `GET /knowledge/documents?query=&tag=&status=&cursor=`
- `GET /knowledge/documents/:id`
- `GET /knowledge/documents/by-slug/:slug`
- `GET /knowledge/documents/:id/backlinks`
- `GET /knowledge/recent`

### Write APIs

- `POST /knowledge/documents`
- `PATCH /knowledge/documents/:id`
- `POST /knowledge/documents/:id/archive`
- `POST /knowledge/documents/:id/restore`

### Derived sync

Whenever a document is created or saved:

1. persist the markdown source
2. parse tags and wikilinks
3. update `knowledge_document_links`
4. create a revision row
5. bump the document version

This can happen in one server action or in a thin edge function.

## 3D Library Integration

The current library scene depends on a generated `knowledge-index.json`.
That is too static for a cross-device repository, but the 3D scene still needs compact data.

The solution is to separate the editing source from the 3D index snapshot.

### Source of truth

- `knowledge_documents` in Postgres

### Derived 3D snapshot

- `GET /knowledge/index`
- returns a compact payload for the 3D library:
  - categories
  - document summaries
  - recent changes
  - layout blueprint

This endpoint replaces the current static JSON for runtime reads.

### Refresh behavior

- entering `/library` world mode fetches the latest index snapshot
- saving a document invalidates the local snapshot cache
- when the user exits workspace mode, the world can refetch if needed

This keeps the 3D view responsive and avoids regenerating the whole world layout during every keystroke.

## Taxonomy Strategy

Keep taxonomy static in the first iteration.

Current taxonomy sources:

- `content/taxonomy/*`
- categorization logic in `src/knowledge/categorizer/*`

Recommended first step:

- categories remain code/content driven
- documents live in the database
- the backend index builder categorizes documents into the existing taxonomy

Later, taxonomy can move into the database if editing categories becomes a product requirement.

## Authentication

Even for a single personal repository, use auth from the start.

Recommended:

- email magic link or social sign-in via Supabase Auth
- one workspace per user
- RLS policy: `owner_id = auth.uid()`

This makes multi-device access straightforward and prevents coupling document ownership to local browser storage.

## Migration From Current Code

## Phase 1: UI mode split

- remove the current panel UI path from `LibraryKnowledgePanels`
- add `view=workspace` mode for `/library`
- hide `SpaceCanvas` when workspace mode is active
- render a temporary fullscreen workspace shell

Outcome:

- `K` becomes "enter workspace"
- no backend required yet

## Phase 2: Remote document foundation

- add Supabase client setup
- create `knowledge_documents` and `knowledge_document_revisions`
- implement list, read, create, update, archive
- load workspace documents from the backend

Outcome:

- multi-device repository starts working

## Phase 3: Derived knowledge features

- parse `[[wikilinks]]`
- persist link graph
- add backlinks
- replace current local search with remote search

Outcome:

- Logseq-style navigation without Logseq integration

## Phase 4: 3D index replacement

- add `/knowledge/index` backend endpoint
- replace `fetch('/data/knowledge-index.json')` with remote snapshot loading
- rebuild 3D layout from database-driven snapshot

Outcome:

- world mode reflects the server-backed repository

## What Should Be Removed

The following concepts should not survive as primary architecture:

- local draft queue as the source of truth
- `draftExportText`
- panel tabs for librarian/search/editor
- static `knowledge-index.json` as the permanent runtime store

They can remain temporarily during migration, but the end state should be database-first.

## Implementation Notes For This Repo

### Keep

- `src/knowledge/types.ts` as the domain layer seed
- markdown parsing and categorization logic where reusable
- existing library world assets and interactables

### Replace or split

- `src/store/useKnowledgeStore.ts`
  - split into UI state and remote data access
- `src/spaces/library/knowledge/LibraryKnowledgePanels.tsx`
  - replace with workspace entry logic
- `public/data/knowledge-index.json`
  - replace with a remote snapshot source later

## MVP Definition

The first database-backed milestone is done when all of the following are true:

- `/library` loads in 3D world mode
- pressing `K` opens a fullscreen workspace instead of the old panel
- a signed-in user can create, edit, search, and archive Markdown documents
- the same documents are visible on another browser session after sign-in
- mobile browsers can use the workspace as a normal full-page editor

## Recommended Next Implementation Order

1. Build the fullscreen workspace shell and remove the old panel interaction.
2. Add auth plus `knowledge_documents` CRUD.
3. Wire the editor to remote saves with optimistic save state.
4. Add backlinks and remote search.
5. Replace the static 3D knowledge index with a backend snapshot.
