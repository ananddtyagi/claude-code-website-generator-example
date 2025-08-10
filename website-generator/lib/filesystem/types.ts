export type FileType = 'file'
export type DirectoryType = 'directory'
export type NodeType = FileType | DirectoryType

export interface FSNodeBase {
  id: string
  name: string
  path: string
  parentId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface FileNode extends FSNodeBase {
  type: 'file'
  content: string
  binary?: boolean
  mimeType?: string
  size: number
}

export interface DirectoryNode extends FSNodeBase {
  type: 'directory'
  children: string[]
}

export type FSNode = FileNode | DirectoryNode

export interface Project {
  id: string
  name: string
  description?: string
  rootId: string
  nodes: Map<string, FSNode>
  createdAt: Date
  updatedAt: Date
  lastOpenedAt?: Date
}

export interface FileChange {
  type: 'create' | 'update' | 'delete' | 'rename' | 'move'
  nodeId: string
  oldPath?: string
  newPath?: string
  oldContent?: string
  newContent?: string
  oldParentId?: string
  newParentId?: string
}

export interface TreeDiff {
  changes: FileChange[]
  timestamp: Date
}

export function isFile(node: FSNode): node is FileNode {
  return node.type === 'file'
}

export function isDirectory(node: FSNode): node is DirectoryNode {
  return node.type === 'directory'
}

export class FileSystemError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'ALREADY_EXISTS' | 'INVALID_PATH' | 'PERMISSION_DENIED' | 'INVALID_OPERATION'
  ) {
    super(message)
    this.name = 'FileSystemError'
  }
}