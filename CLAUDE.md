# Website Generator

## Overview
A Next.js-based website generator with a virtual filesystem, Monaco code editor integration, and project management capabilities. The application provides a complete IDE-like experience in the browser with file management, code editing, and project persistence through IndexedDB.

## Architecture
The application follows a modular architecture with clear separation of concerns:

### Core Components
- **Virtual Filesystem**: Complete filesystem abstraction with CRUD operations
- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting
- **Project Management**: Persistent project storage with autosave capabilities
- **Resizable Layout**: Flexible UI with file tree, editor, and preview panels

### Key Technologies
- **Next.js 15** with App Router
- **React 19** with modern hooks and patterns
- **Monaco Editor** for code editing
- **IndexedDB** (via idb) for client-side persistence  
- **Tailwind CSS** with Radix UI components
- **TypeScript** for type safety

## Setup & Installation

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build & Deploy
```bash
npm run build
npm start
```

## Development Workflow

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure
```
website-generator/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── editor/           # Code editor components
│   │   ├── CodeEditor.tsx        # Monaco editor wrapper
│   │   ├── EditorPanel.tsx       # Editor panel with tabs
│   │   └── EditorTabManager.tsx  # Tab management
│   ├── filesystem/       # File system UI
│   │   ├── FileTree.tsx          # File tree component
│   │   └── FileTreeNode.tsx      # Individual tree nodes
│   ├── layout/           # Layout components
│   │   ├── AppLayout.tsx         # Main app layout
│   │   ├── Header.tsx           # App header
│   │   └── ResizableLayout.tsx  # Resizable panels
│   └── ui/              # Reusable UI components
├── lib/                 # Core libraries
│   ├── filesystem/      # Virtual filesystem
│   │   ├── types.ts            # Type definitions
│   │   ├── operations.ts       # CRUD operations
│   │   └── path-utils.ts       # Path utilities
│   ├── storage/         # Data persistence
│   │   └── project-store.ts    # IndexedDB project storage
│   ├── history/         # Version control
│   │   └── history-manager.ts  # Change tracking
│   └── import-export/   # File operations
│       ├── zip-exporter.ts     # Project export
│       └── zip-importer.ts     # Project import
```

## Key Features

### Virtual Filesystem
- Complete file and directory operations (create, read, update, delete)
- Path-based navigation with utility functions
- Type-safe file system nodes with metadata
- Change tracking and history management

### Code Editor
- Monaco Editor integration with syntax highlighting
- Support for 15+ programming languages
- Theme integration (light/dark mode)
- Auto-save functionality
- Tab-based file editing

### Project Management
- Persistent project storage using IndexedDB
- Autosave with 800ms debounce
- Project metadata tracking
- Import/Export via ZIP files

### UI Components
- Resizable panels for optimal workspace usage
- File tree with expand/collapse functionality
- Theme toggle with next-themes
- Responsive design with Tailwind CSS

## API & Data Layer

### ProjectStore Class
Main interface for project persistence:
- `initialize()` - Setup IndexedDB connection
- `saveProject()` - Persist project data
- `loadProject()` - Retrieve project data
- `deleteProject()` - Remove project
- `listProjects()` - Get all projects

### Filesystem Operations
Core filesystem functions in `lib/filesystem/operations.ts`:
- Node creation, deletion, and modification
- Path resolution and validation
- Content management for files
- Directory structure operations

## Recent Updates (Updated: 2025-01-08)

### Epic 3: Code Editor & Diff Integration
- Implemented Monaco Editor with full language support
- Added tabbed editor interface with file switching
- Integrated syntax highlighting for 15+ languages
- Created resizable layout with editor panel
- Added theme synchronization with code editor

### Epic 2: Virtual Filesystem & Storage  
- Built complete virtual filesystem with CRUD operations
- Implemented IndexedDB persistence layer
- Added file tree UI with expand/collapse functionality
- Created ZIP import/export functionality
- Integrated history tracking for file changes

### Initial Setup
- Bootstrapped Next.js 15 application
- Configured TypeScript and Tailwind CSS
- Set up project structure and build tools

## Important Notes

### Development Guidelines
- Update `planning.md` after completing each task
- Make git commits after completing each task
- Follow existing code patterns and conventions
- Maintain type safety with TypeScript

### Data Persistence
- Projects are stored locally in IndexedDB
- Autosave triggers every 800ms after changes
- No server-side persistence - purely client-side storage

### Browser Support
- Requires modern browsers with IndexedDB support
- Monaco Editor requires ES6+ support
- Responsive design works on desktop and tablet devices

### Performance Considerations  
- Virtual filesystem operations are optimized for client-side use
- Monaco Editor lazy-loads language definitions
- File content is stored as strings in IndexedDB
- Large files may impact performance due to browser storage limits