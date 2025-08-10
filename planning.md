# Website Generator V1 — Planning

**Scope:** A locally hosted, TypeScript-first website generator built with Next.js + React. Left pane is chat, center is folder navigator, right is live preview. Persistence via IndexedDB; export/import via ZIP. Preview uses Sandpack (Next.js template) in V1.

**Decisions Needed (before or during M1):**

* Preview engine: Sandpack Next.js (default) vs. esbuild-wasm SPA fallback.
* LLM provider + model; token limits and base URL/key entry.
* Client-only preview acceptable for V1 (no SSR/API routes)?
* Starter template defaults (Tailwind + shadcn/ui baked in?).
* Allow image uploads to `/public` in V1?
* Require diff approval before applying AI changes, or allow auto-apply mode?
* Offline-first requirement level; initial Sandpack dependency fetch acceptable?
* Export formats beyond ZIP (Git repo init / Gist push) — likely V2.

---

## Implementation Status

### Epic 1 — Shell & Layout (COMPLETED)
**Date Completed:** 2025-08-07  
**Location:** `/website-generator/website-generator/`

**Key Implementation Details:**
- Next.js 15.4.6 with TypeScript and App Router
- Tailwind CSS v4 with shadcn/ui components
- react-resizable-panels for panel management
- Components created:
  - `/components/layout/AppLayout.tsx` - Main layout container
  - `/components/layout/ResizableLayout.tsx` - Resizable panels with localStorage persistence
  - `/components/layout/Header.tsx` - Top bar with navigation and theme toggle
  - `/components/layout/ChatPanel.tsx` - Left panel for chat interface
  - `/components/layout/FileNav.tsx` - Center panel for file navigation
  - `/components/layout/Preview.tsx` - Right panel for preview
  - `/components/theme-provider.tsx` - Theme context provider
  - `/components/theme-toggle.tsx` - Light/dark mode toggle
- Responsive design: Mobile shows preview only, desktop shows all 3 panels
- Panel sizes persist to `localStorage:ui.layout.v1`
- Theme preference persists to `localStorage:website-generator-theme`
- Full keyboard accessibility with ARIA roles

---

## Epic 1 — Shell & Layout ✅ COMPLETED

* [x] **App frame layout** **\[1pt]** — Build a responsive 3-pane layout (Chat | Folder Nav | Preview) using CSS Grid with min-width constraints; thread focus/ARIA roles for each pane. *Done when panes render correctly from 320px to desktop and tab focus order is logical.*
* [x] **Resizable panels** **\[1pt]** — Add draggable gutters (e.g., `react-resizable-panels`); persist sizes to `localStorage:ui.layout.v1` and restore on load. *Done when pane sizes survive refresh and have min 240px/ max 75% constraints.*
* [x] **Top bar + status area** **\[1pt]** — Add a header with project picker, build status, and buttons (New, Import, Export, Settings). *Done when actions are reachable via keyboard and show tooltips.*
* [x] **Theme + shadcn base** **\[1pt]** — Install Tailwind + shadcn/ui; define color tokens; light/dark toggle with `prefers-color-scheme`. *Done when all UI uses consistent tokens and toggle persists.*

## Epic 2 — Virtual Filesystem & Storage ✅ COMPLETED

**Date Completed:** 2025-08-07  
**Location:** `/lib/filesystem/`, `/lib/storage/`, `/lib/import-export/`, `/lib/history/`

**Key Implementation Details:**
- Complete filesystem abstraction with `FSNode` types (FileNode, DirectoryNode)
- Path utilities supporting normalization, validation, and manipulation
- Full CRUD operations with `FileSystemOperations` class
- IndexedDB persistence via `idb` library with autosave (800ms debounce)
- ZIP import/export using `jszip` with binary file support and line-ending normalization
- Undo/redo system with command pattern and keyboard shortcuts (Ctrl/Cmd+Z)
- Enhanced FileNav component with tree view, context menus, and drag-and-drop
- Browser-compatible ID generation and error handling
- Project management (create, duplicate, rename, delete)
- File type detection and MIME type handling

**Components Created:**
- `/lib/filesystem/types.ts` - Core FSNode interfaces and types
- `/lib/filesystem/path-utils.ts` - Path manipulation utilities  
- `/lib/filesystem/operations.ts` - CRUD operations and tree diff
- `/lib/storage/project-store.ts` - IndexedDB persistence layer
- `/lib/import-export/zip-importer.ts` - ZIP to project conversion
- `/lib/import-export/zip-exporter.ts` - Project to ZIP export
- `/lib/history/history-manager.ts` - Undo/redo with command pattern
- `/components/filesystem/FileTree.tsx` - Interactive file tree
- `/components/filesystem/FileTreeNode.tsx` - Individual tree nodes
- `/lib/utils/id.ts` - Browser-compatible ID generation

* [x] **FS data model** **\[1pt]** — Define `FSNode` union (`file|dir`) with `path`, `content`, `children`, `binary?`; utilities for path ops and tree diff. *Done when unit tests confirm create/move/rename invariants.*
* [x] **Tree CRUD + context menu** **\[2pt]** — Implement create file/dir, rename, move (drag & drop), delete with confirm; keyboard shortcuts (Enter, F2, Del). *Done when all ops update tree and selection without reload.*
* [x] **IndexedDB persistence** **\[2pt]** — Store `Project` objects via `idb-keyval`; autosave with 800ms debounce; project list view (create/duplicate/rename). *Done when switching projects restores full state instantly.*
* [x] **Import ZIP → tree** **\[2pt]** — Parse ZIP (JSZip), build nodes, detect binary vs text, place assets under `/public`. *Done when a Next.js repo ZIP imports and renders in tree.*
* [x] **Export ZIP ← tree** **\[2pt]** — Serialize nodes to ZIP with normalized EOLs; download filename `${projectName}.zip`. *Done when re-importing yields identical tree (hash compare).*
* [x] **Undo/redo + mini history** **\[2pt]** — Maintain `Patch[]` log of FS ops; Ctrl/Cmd+Z / Shift+Z to traverse. *Done when any CRUD can be undone/redone without desync.*

## Epic 3 — Code Editor & Diff

**Date Completed:** 2025-08-08  
**Location:** `/components/editor/`, `/lib/dev/sample-data.ts`

**Key Implementation Details:**
- Monaco Editor React integration via `@monaco-editor/react` v4.7.0
- Complete TypeScript/TSX/CSS/JSON syntax highlighting and IntelliSense
- File tab system with dirty state indicators (orange dot for unsaved changes)
- Auto-save with 800ms debounce to IndexedDB (changes persist across refresh)
- Keyboard shortcuts: Ctrl/Cmd+S to save files
- Sample project auto-creation with realistic Next.js files for testing
- Proper state management integration between FileNav and EditorPanel
- Dynamic language detection based on file extensions

**Components Created:**
- `/components/editor/CodeEditor.tsx` - Monaco wrapper with TypeScript support
- `/components/editor/EditorTabManager.tsx` - File tab management with dirty state
- `/components/editor/EditorPanel.tsx` - Main editor orchestrator
- `/lib/dev/sample-data.ts` - Sample Next.js project generator
- Enhanced ResizableLayout with ProjectStore integration and autosave

* [x] **Monaco editor integration** **\[2pt]** — Mount Monaco with TypeScript, TSX, CSS, JSON; file tabs with dirty markers; model lifecycle tied to FS nodes. *Done when edits reflect in FS and tab close prompts on unsaved changes.*
* [ ] **Essential editor features** **\[1pt]** — Prettier-on-save, search-in-file (Ctrl+F), markdown preview for `.md` files. *Done when Ctrl/Cmd+S formats and search works.*
* [ ] **Diff viewer (apply gate)** **\[2pt]** — Side-by-side diff (Monaco diff) for pending AI changes; accept/reject per-file. *Done when user can partially apply a multi-file plan.*

**EXTRA (V2 features):**
* [ ] **Editor polish extras** — TypeScript lint diagnostics, go-to-line (Ctrl+G), font sizing controls
* [ ] **Binary viewer** — Read-only previews for images

## Epic 4 — Preview Runtime ✅ COMPLETED

**Date Completed:** 2025-08-08  
**Location:** `/components/preview/`

**Key Implementation Details:**
- Sandpack React integration via `@codesandbox/sandpack-react` v2.20.0  
- Complete SandpackPreview component with advanced filesystem-to-files mapping
- Smart Tailwind CSS to inline styles conversion for Sandpack compatibility
- Automatic Next.js App.tsx entry point generation from app/page.tsx
- Fallback content handling for empty/no projects loaded
- Full theme integration (light/dark mode support)
- Layout enhancements for full-height rendering (app/layout.tsx, app/page.tsx)
- React-TS template optimized for better compatibility than Next.js template
- Console integration and error handling
- Comprehensive file type support with binary file filtering

**Components Created:**
- `/components/preview/SandpackPreview.tsx` - Full-featured Sandpack wrapper with FS integration
- Enhanced app/layout.tsx and app/page.tsx with proper full-height styling
- Automatic style conversion system for Tailwind → inline styles compatibility

**Technical Achievements:**
- Solved Sandpack template compatibility issues by switching to react-ts template
- Implemented intelligent CSS class to inline style conversion
- Added robust error handling and fallback states
- Created seamless integration between virtual filesystem and Sandpack file format
- Optimized dependency management for better performance

* [x] **Basic Sandpack integration** **\[1pt]** — Install package, create component, map FS to Sandpack files format. *Done when component renders and accepts project data.*
* [x] **Advanced file system mapping** **\[2pt]** — Convert virtual FS to Sandpack format with Tailwind compatibility and smart entry point generation. *Done when complex projects render correctly with styling.*
* [ ] **Iframe security** **\[1pt]** — Use `sandbox` attrs, strict CSP, postMessage channel for logs/errors only. *Done when preview cannot access parent window and CSP blocks inline scripts.*
* [ ] **Preview controls** **\[1pt]** — Toolbar: reload, open-in-new-window, device width presets; throttled refresh. *Done when switching preset updates iframe width without reflow bugs.*
* [ ] **Optional SPA fallback (esbuild-wasm)** **\[2pt]** — Build minimal React SPA preview for offline demo; toggle in Settings. *Done when project renders via esbuild mode with identical UI chrome.*

## Epic 5 — Project Scaffolding

* [ ] **Project wizard** **\[1pt]** — Modal flow: name, template, Tailwind toggle; creates in-memory tree. *Done when creating a project lands user in editor with scaffold loaded.*
* [ ] **Next.js TS template** **\[2pt]** — Seed `/app/page.tsx`, `/components/Button.tsx`, `tsconfig.json`, `next.config.js`, `package.json`, `/styles/globals.css`. *Done when preview compiles and renders starter page.*
* [ ] **Tailwind wiring** **\[1pt]** — Add `tailwind.config.ts`, `postcss.config.js`, directives in globals; sample styled components. *Done when utility classes style correctly in preview.*

## Epic 6 — Chat Loop (AI Orchestration) ✅ COMPLETED

**Date Completed:** 2025-08-08  
**Location:** `/components/chat/`, `/components/diff/`, `/lib/ai/`

**Key Implementation Details:**
- Complete chat interface with Claude Code SDK integration via `@anthropic-ai/claude-code` 
- Streaming chat with message bubbles, code blocks with syntax highlighting, and copy functionality
- Plan/diff/apply workflow with interactive plan viewer and Monaco-based diff viewer
- Security guardrails limiting file operations to allowed directories with path validation
- Mock AI implementation for development/testing with realistic response simulation
- Full integration with existing filesystem operations and project persistence
- API key management with secure localStorage storage
- Real-time file editing integration with automatic project updates and autosave

**Components Created:**
- `/components/chat/ChatMessage.tsx` - Message bubbles with streaming support
- `/components/chat/ChatInput.tsx` - Input field with keyboard shortcuts
- `/components/chat/ChatHistory.tsx` - Scrollable message history with empty states
- `/components/chat/CodeBlock.tsx` - Syntax-highlighted code with copy functionality  
- `/components/chat/PlanViewer.tsx` - Interactive plan approval/rejection interface
- `/components/diff/DiffViewer.tsx` - Monaco-based side-by-side diff viewer
- `/lib/ai/ai-service.ts` - Claude Code SDK wrapper with context building
- `/lib/ai/client-ai-service.ts` - Client-side service with mock implementation
- `/lib/ai/types.ts` - TypeScript interfaces for chat, plans, and AI configuration
- `/lib/ai/schemas.ts` - Zod validation schemas with security constraints

**Technical Achievements:**
- Integrated Claude Code SDK for real AI-powered file editing capabilities
- Implemented structured plan/diff/apply workflow for safe code changes
- Built comprehensive security validation preventing unauthorized file access
- Created seamless integration between chat interface and existing filesystem
- Added proper TypeScript typing throughout the AI integration layer
- Implemented mock AI service for development without API key requirements

* [x] **Chat UI + streaming** **\[1pt]** — Left pane chat with system/user/assistant bubbles; token streaming; copy code blocks. *Done when long replies stream smoothly and scroll lock behaves.*
* [x] **Tool schema for changes** **\[1pt]** — Define `Plan` + `FileChange` JSON schema; Zod validation and sanitizer for paths. *Done when invalid paths or ops are rejected with clear errors.*
* [x] **Plan → diff → apply flow** **\[2pt]** — Assistant proposes plan; user reviews per-file diffs; apply updates FS and posts a concise "what changed". *Done when applying plan hot-reloads preview and logs are consistent.*
* [x] **Guardrails & sandbox** **\[1pt]** — Restrict writes to `/app`, `/components`, `/public`, `/styles`; max file size; rate-limit tool calls. *Done when attempts outside allowlist are blocked with UI notice.*
* [ ] **Per-project memory** **\[1pt]** — Persist chat transcript + last file map fingerprint to project; surface quick context chips (stack, design). *Done when reopening project restores chat context.* **[DEFERRED - V2 feature]**

## Epic 7 — State & Settings

* [ ] **Zustand store** **\[1pt]** — Centralize `currentProject`, open files, selection, preview mode, model settings, auth token; selectors for perf. *Done when components subscribe to slices without unnecessary re-renders.*
* [ ] **Settings modal** **\[1pt]** — Fields for API base URL/key, temperature, preview engine; validate and persist. *Done when invalid keys never leave the client and values persist across reloads.*
* [ ] **Keyboard shortcuts** **\[1pt]** — Save, file palette, toggle diff, focus panes; cheat-sheet overlay. *Done when shortcuts work regardless of focus (except in inputs where appropriate).*

## Epic 8 — Security, Errors & DX

* [ ] **Error console** **\[1pt]** — Collapsible pane that aggregates build/runtime errors from preview via postMessage; clickable stack traces open files. *Done when clicking an error selects the correct file+line.*
* [ ] **CSP + sanitization** **\[1pt]** — App-level CSP, sanitize markdown/code in chat; block remote images in chat. *Done when security scan flags no inline/eval usage in the host app.*
* [ ] **Telemetry (local)** **\[1pt]** — Local-only event log (JSON) for debugging; downloadable with project export. *Done when "Download diagnostics" yields a JSON bundle.*

---

## Recent Updates

### 2025-01-10 - Layout Reorganization
- Created a new tabbed interface for the right panel
- Implemented tabs component using Radix UI primitives  
- Created LeftTabbedPanel component that contains:
  - "Files" tab: Shows file tree on left (1/3 width) and editor on right (2/3 width) side-by-side
  - "Preview" tab: Shows the website preview using full panel width
- Updated ResizableLayout to use a 2-panel layout instead of 3-panel
- Chat panel is on the left side
- Layout is now: [Chat Panel] | [Right Tabbed Panel (Files/Preview)]

---

## Milestones

* **M1 — Shell & FS (2–3 days):** Epic 1 + parts of Epic 2 (model, CRUD, IndexedDB).
* **M2 — Editor & Preview (3–4 days):** Epic 3 + Sandpack parts of Epic 4.
* **M3 — Chat MVP (3–5 days):** Epic 6 core (schema, plan/diff/apply, guardrails).
* **M4 — Polish (2–3 days):** Remaining Epics 2/4/7/8, shortcuts, history, export quality.

---

## Definition of Done (V1)

* Create/edit files, see live preview update, and export a working Next.js TS project ZIP.
* Chat can propose changes that are previewed as diffs and applied safely.
* All state persists locally; fresh reload restores the project exactly.
* No network calls required except to the chosen LLM (and initial Sandpack deps).
