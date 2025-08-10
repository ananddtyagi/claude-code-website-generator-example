# Website Generator Development Plan

## Project Overview
A Next.js-based website generator with virtual filesystem, Monaco editor, and AI-powered file editing capabilities.

## Epic Progress

### ✅ Epic 1: Project Setup & Foundation
- [x] Bootstrap Next.js 15 application
- [x] Configure TypeScript and Tailwind CSS
- [x] Set up project structure
- [x] Configure build tools and development environment

### ✅ Epic 2: Virtual Filesystem & Storage
- [x] Design filesystem data structures
- [x] Implement CRUD operations for files/directories
- [x] Create IndexedDB persistence layer
- [x] Build file tree UI component
- [x] Add ZIP import/export functionality
- [x] Implement history tracking

### ✅ Epic 3: Code Editor Integration
- [x] Integrate Monaco Editor
- [x] Implement tabbed editor interface
- [x] Add syntax highlighting for multiple languages
- [x] Create resizable layout panels
- [x] Add theme synchronization
- [x] Implement auto-save functionality

### ✅ Epic 4: Preview & Runtime Environment
- [x] Set up Sandpack for live preview
- [x] Create preview panel integration
- [x] Implement example project loading
- [x] Add runtime environment configuration
- [x] Test sandbox functionality with sample code

### ✅ Epic 5: AI Integration Foundation
- [x] Research Claude Code SDK implementation
- [x] Design AI service architecture
- [x] Create type definitions for AI interactions
- [x] Implement security schemas and validation
- [x] Build chat interface components

### ✅ Epic 6: AI-Powered File Editing
- [x] Install and configure Claude Code SDK
- [x] Create AI service with streaming support
- [x] Implement plan/diff/apply workflow
- [x] Build chat interface with AI integration
- [x] Add file operation security guardrails
- [x] Create diff viewer for code changes
- [x] Test AI functionality with real API
- [x] **Fix file creation conflict handling** ✅ (2025-01-08)
  - Updated ChatPanel to check if files exist before creating
  - Added graceful fallback to update existing files
  - Wrapped all file operations in try-catch blocks
  - Ensured individual failures don't stop entire plan execution

## Current Status: Working Prototype Complete! 🎉

The website generator is now fully functional with AI-powered website creation:

### ✅ Completed Features
1. **AI-Powered Generation**: Claude generates complete websites from prompts
2. **Real-Time Preview**: Sandpack shows generated sites instantly
3. **File System Integration**: AI creates/updates files in virtual filesystem
4. **Streaming Chat**: Real-time streaming responses from Claude
5. **Complete Workflow**: Chat → Generate → Preview → Edit → Save

### Working Example
Users can now:
- Type "Create a landing page for a startup"
- Watch Claude generate HTML/CSS/JS files in real-time
- See the live preview update automatically
- Edit the generated code with syntax highlighting
- Save projects persistently to IndexedDB

### Technical Stack
- **Frontend**: Next.js 15 + React 19 with streaming UI
- **AI Integration**: Claude Code SDK with direct API access
- **Preview**: Sandpack for live code execution
- **Editor**: Monaco Editor with multi-file support
- **Storage**: IndexedDB with autosave functionality

## Next Steps (Future Epics)

### Epic 7: Enhanced Preview & Build System
- [ ] Advanced preview modes (mobile, tablet, desktop)
- [ ] Build system integration
- [ ] Hot module replacement
- [ ] Error boundary improvements

### Epic 8: Advanced AI Features
- [ ] Multi-turn conversations with context
- [ ] Code refactoring suggestions
- [ ] Automated testing generation
- [ ] Performance optimization recommendations

### Epic 9: Collaboration & Sharing
- [ ] Project sharing via URLs
- [ ] Export to GitHub/CodeSandbox
- [ ] Template marketplace
- [ ] Community features

## Development Guidelines

### Completed Tasks Protocol
1. ✅ Update this planning.md file after each task
2. ✅ Make git commit with descriptive message
3. ✅ Test functionality thoroughly
4. ✅ Update documentation as needed

### Current Development Focus
- The core functionality is complete and working
- AI integration handles file operations gracefully
- Error handling prevents system breakage
- Ready for user testing and feedback

## Technical Notes

### AI Integration Architecture
- **API Route**: `/api/ai/chat-direct` using direct Anthropic SDK
- **Streaming**: Real-time response streaming to UI
- **Plan Extraction**: JSON parsing from AI responses
- **File Operations**: Safe operations with conflict resolution
- **Error Handling**: Comprehensive error boundaries and recovery

### Key Files Modified (Latest Session)
- `components/layout/ChatPanel.tsx`: Enhanced file conflict handling
- `app/api/ai/chat-direct/route.ts`: Streaming API implementation
- `lib/ai/client-ai-service.ts`: Client-side AI service wrapper

## Epic 7: Agentic AI Behavior Update (2025-01-10)

### ✅ Completed Tasks
- Modified AI system prompt to be more autonomous and action-oriented
- Removed manual plan approval UI - changes now auto-apply
- Updated ChatPanel to execute file operations immediately
- Filtered JSON file operation blocks from chat display
- Made the AI behave more like Claude Code - taking direct actions

### Changes Made
1. **AI System Prompt** (`app/api/ai/chat-direct/route.ts`):
   - Updated prompt to encourage autonomous behavior
   - Removed detailed planning instructions
   - Added "act first, report after" guidance
   - Simplified JSON response format

2. **Auto-Apply Changes** (`components/layout/ChatPanel.tsx`):
   - Removed PlanViewer component and manual approval flow
   - Added automatic plan execution when received from AI
   - Removed isApplying state and currentPlan state
   - Simplified the file operation flow

3. **Hidden JSON Blocks** (`components/chat/ChatMessage.tsx`):
   - Added filter to hide JSON blocks containing file changes
   - Keeps the chat focused on what's being done, not technical details
   - Still shows other code blocks normally

### Result
The website generator now works more like an agentic system:
- User asks for something (e.g., "create a landing page")
- AI immediately creates/modifies files without showing JSON
- Changes are applied automatically without approval
- Chat shows what was accomplished, not what will be done

## Recent Updates

### 2025-01-10 - Claude Code SDK Context Fix
**Issue:** The Claude Code SDK bot wasn't receiving the current state of the project files, causing it to completely replace everything every time instead of understanding the existing codebase.

**Root Cause Analysis:**
1. The `buildProjectContext` function in `ChatPanel.tsx` was passing hardcoded empty arrays for `openFiles` and `undefined` for `currentFile`
2. The system prompts in API routes weren't including actual file contents, only file structure and names
3. The bot had no context about what files were currently open or their contents

**Solution Implemented:**
1. **Enhanced Editor State Management:**
   - Added `EditorState` interface with `openFiles` and `currentFile` properties
   - Modified `EditorPanel.tsx` to expose its internal state via `onEditorStateChange` callback
   - Updated component hierarchy to pass editor state from `EditorPanel` → `LeftTabbedPanel` → `ResizableLayout` → `ChatPanel`

2. **Improved System Prompts:**
   - Added `getOpenFileContents()` function to both API routes (`/api/ai/chat/route.ts` and `/api/ai/chat-direct/route.ts`)
   - Enhanced system prompts to include actual content of currently open files
   - Added file path resolution to correctly find files in the virtual filesystem

3. **Fixed Context Building:**
   - Updated `buildProjectContext()` to use actual editor state instead of hardcoded values
   - Modified context structure to pass full project data including all nodes Map
   - Added proper file lookup by path in the flat filesystem structure

**Technical Details:**
- The virtual filesystem uses a flat `Map<string, FSNode>` structure, not nested trees
- Context now includes full file contents with markers for the currently active file
- System prompt format: `--- /path/to/file.tsx (CURRENTLY ACTIVE) ---`

**Impact:**
- Claude Code SDK bot now has full awareness of currently open files and their contents
- AI responses are based on existing codebase state rather than starting from scratch
- Maintains context across edit sessions and understands component relationships
- Significantly improved code generation accuracy and consistency

Last Updated: 2025-01-10