import { FSNode, Project, FileChange } from '../filesystem/types'
import { FileSystemOperations } from '../filesystem/operations'

export interface HistoryEntry {
  id: string
  timestamp: Date
  description: string
  changes: FileChange[]
  beforeSnapshot: Map<string, FSNode>
  afterSnapshot: Map<string, FSNode>
}

export interface UndoRedoState {
  canUndo: boolean
  canRedo: boolean
  undoDescription?: string
  redoDescription?: string
}

export class HistoryManager {
  private history: HistoryEntry[] = []
  private currentIndex: number = -1
  private readonly maxHistorySize: number = 50
  private project: Project

  constructor(project: Project) {
    this.project = project
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  private cloneNodes(nodes: Map<string, FSNode>): Map<string, FSNode> {
    const cloned = new Map<string, FSNode>()
    
    for (const [id, node] of nodes) {
      cloned.set(id, {
        ...node,
        createdAt: new Date(node.createdAt),
        updatedAt: new Date(node.updatedAt),
        children: node.type === 'directory' ? [...node.children] : undefined
      } as FSNode)
    }
    
    return cloned
  }

  recordChange(description: string, beforeAction: () => void, action: () => void): void {
    const beforeSnapshot = this.cloneNodes(this.project.nodes)
    
    beforeAction()
    const fsOps = new FileSystemOperations(this.project)
    action()
    
    const afterSnapshot = this.cloneNodes(this.project.nodes)
    const changes = fsOps.generateDiff(beforeSnapshot, afterSnapshot)
    
    if (changes.length === 0) {
      return
    }

    const entry: HistoryEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      description,
      changes,
      beforeSnapshot,
      afterSnapshot
    }

    this.currentIndex++
    
    this.history = this.history.slice(0, this.currentIndex)
    this.history.push(entry)
    
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
      this.currentIndex--
    }
  }

  undo(): boolean {
    if (!this.canUndo()) return false
    
    const entry = this.history[this.currentIndex]
    this.project.nodes = this.cloneNodes(entry.beforeSnapshot)
    this.project.updatedAt = new Date()
    
    this.currentIndex--
    return true
  }

  redo(): boolean {
    if (!this.canRedo()) return false
    
    this.currentIndex++
    const entry = this.history[this.currentIndex]
    this.project.nodes = this.cloneNodes(entry.afterSnapshot)
    this.project.updatedAt = new Date()
    
    return true
  }

  canUndo(): boolean {
    return this.currentIndex >= 0
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  getState(): UndoRedoState {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoDescription: this.canUndo() ? this.history[this.currentIndex]?.description : undefined,
      redoDescription: this.canRedo() ? this.history[this.currentIndex + 1]?.description : undefined
    }
  }

  getHistory(): HistoryEntry[] {
    return this.history.slice(0, this.currentIndex + 1).map(entry => ({
      ...entry,
      beforeSnapshot: new Map(),
      afterSnapshot: new Map()
    }))
  }

  getCurrentIndex(): number {
    return this.currentIndex
  }

  jumpToHistoryPoint(index: number): boolean {
    if (index < -1 || index >= this.history.length) {
      return false
    }
    
    if (index === this.currentIndex) {
      return true
    }
    
    if (index === -1) {
      this.currentIndex = -1
      this.project.nodes = new Map()
      return true
    }
    
    const entry = this.history[index]
    this.project.nodes = this.cloneNodes(entry.afterSnapshot)
    this.project.updatedAt = new Date()
    this.currentIndex = index
    
    return true
  }

  clear(): void {
    this.history = []
    this.currentIndex = -1
  }

  getHistorySummary(): {
    totalEntries: number
    currentIndex: number
    memoryUsage: number
  } {
    const memoryUsage = this.history.reduce((total, entry) => {
      return total + 
        entry.beforeSnapshot.size * 100 + 
        entry.afterSnapshot.size * 100 + 
        JSON.stringify(entry.changes).length
    }, 0)
    
    return {
      totalEntries: this.history.length,
      currentIndex: this.currentIndex,
      memoryUsage
    }
  }

  createCommand(description: string) {
    return {
      execute: (action: () => void) => {
        this.recordChange(description, () => {}, action)
      },
      executeWithSetup: (beforeAction: () => void, action: () => void) => {
        this.recordChange(description, beforeAction, action)
      }
    }
  }
}

export class FileSystemCommand {
  constructor(
    private historyManager: HistoryManager,
    private description: string,
    private executeAction: () => void,
    private undoAction?: () => void
  ) {}

  execute(): void {
    this.historyManager.recordChange(this.description, () => {}, this.executeAction)
  }

  static createFile(
    historyManager: HistoryManager,
    fsOps: FileSystemOperations,
    parentPath: string,
    name: string,
    content: string = ''
  ): FileSystemCommand {
    return new FileSystemCommand(
      historyManager,
      `Create file "${name}"`,
      () => {
        fsOps.createFile(parentPath, name, content)
      }
    )
  }

  static createDirectory(
    historyManager: HistoryManager,
    fsOps: FileSystemOperations,
    parentPath: string,
    name: string
  ): FileSystemCommand {
    return new FileSystemCommand(
      historyManager,
      `Create folder "${name}"`,
      () => {
        fsOps.createDirectory(parentPath, name)
      }
    )
  }

  static updateFile(
    historyManager: HistoryManager,
    fsOps: FileSystemOperations,
    path: string,
    content: string
  ): FileSystemCommand {
    return new FileSystemCommand(
      historyManager,
      `Update file "${path.split('/').pop()}"`,
      () => {
        fsOps.updateFile(path, content)
      }
    )
  }

  static renameNode(
    historyManager: HistoryManager,
    fsOps: FileSystemOperations,
    path: string,
    newName: string
  ): FileSystemCommand {
    const oldName = path.split('/').pop()
    return new FileSystemCommand(
      historyManager,
      `Rename "${oldName}" to "${newName}"`,
      () => {
        fsOps.renameNode(path, newName)
      }
    )
  }

  static moveNode(
    historyManager: HistoryManager,
    fsOps: FileSystemOperations,
    sourcePath: string,
    targetDirPath: string
  ): FileSystemCommand {
    const fileName = sourcePath.split('/').pop()
    return new FileSystemCommand(
      historyManager,
      `Move "${fileName}" to "${targetDirPath}"`,
      () => {
        fsOps.moveNode(sourcePath, targetDirPath)
      }
    )
  }

  static deleteNode(
    historyManager: HistoryManager,
    fsOps: FileSystemOperations,
    path: string
  ): FileSystemCommand {
    const fileName = path.split('/').pop()
    return new FileSystemCommand(
      historyManager,
      `Delete "${fileName}"`,
      () => {
        fsOps.deleteNode(path)
      }
    )
  }
}

export function useKeyboardShortcuts(
  historyManager: HistoryManager,
  onStateChange: () => void
): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey
    
    if (!ctrlOrCmd) return
    
    if (event.key === 'z' && !event.shiftKey) {
      if (historyManager.canUndo()) {
        event.preventDefault()
        historyManager.undo()
        onStateChange()
      }
    } else if ((event.key === 'z' && event.shiftKey) || event.key === 'y') {
      if (historyManager.canRedo()) {
        event.preventDefault()
        historyManager.redo()
        onStateChange()
      }
    }
  }
  
  document.addEventListener('keydown', handleKeyDown)
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
}