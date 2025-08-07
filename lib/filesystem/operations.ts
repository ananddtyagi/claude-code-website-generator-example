import { generateId } from '../utils/id'
import { 
  FSNode, 
  FileNode, 
  DirectoryNode, 
  Project, 
  FileChange,
  isFile,
  isDirectory,
  FileSystemError
} from './types'
import {
  normalizePath,
  joinPath,
  dirname,
  basename,
  validateFileName,
  isSubPath
} from './path-utils'

export class FileSystemOperations {
  private project: Project

  constructor(project: Project) {
    this.project = project
  }

  getNodeByPath(path: string): FSNode | null {
    const normalized = normalizePath(path)
    
    for (const node of this.project.nodes.values()) {
      if (node.path === normalized) {
        return node
      }
    }
    
    return null
  }

  getNodeById(id: string): FSNode | null {
    return this.project.nodes.get(id) || null
  }

  createFile(
    parentPath: string,
    name: string,
    content: string = '',
    options?: { binary?: boolean; mimeType?: string }
  ): FileNode {
    const validation = validateFileName(name)
    if (!validation.valid) {
      throw new FileSystemError(validation.error!, 'INVALID_PATH')
    }

    const parentNode = this.getNodeByPath(parentPath)
    if (!parentNode) {
      throw new FileSystemError(`Parent directory not found: ${parentPath}`, 'NOT_FOUND')
    }
    
    if (!isDirectory(parentNode)) {
      throw new FileSystemError(`Parent is not a directory: ${parentPath}`, 'INVALID_OPERATION')
    }

    const filePath = joinPath(parentPath, name)
    const existingNode = this.getNodeByPath(filePath)
    if (existingNode) {
      throw new FileSystemError(`File already exists: ${filePath}`, 'ALREADY_EXISTS')
    }

    const now = new Date()
    const fileNode: FileNode = {
      id: generateId(),
      type: 'file',
      name,
      path: filePath,
      parentId: parentNode.id,
      content,
      size: content.length,
      binary: options?.binary,
      mimeType: options?.mimeType,
      createdAt: now,
      updatedAt: now
    }

    this.project.nodes.set(fileNode.id, fileNode)
    parentNode.children.push(fileNode.id)
    this.updateTimestamp(parentNode)

    return fileNode
  }

  createDirectory(parentPath: string, name: string): DirectoryNode {
    const validation = validateFileName(name)
    if (!validation.valid) {
      throw new FileSystemError(validation.error!, 'INVALID_PATH')
    }

    const parentNode = this.getNodeByPath(parentPath)
    if (!parentNode) {
      throw new FileSystemError(`Parent directory not found: ${parentPath}`, 'NOT_FOUND')
    }
    
    if (!isDirectory(parentNode)) {
      throw new FileSystemError(`Parent is not a directory: ${parentPath}`, 'INVALID_OPERATION')
    }

    const dirPath = joinPath(parentPath, name)
    const existingNode = this.getNodeByPath(dirPath)
    if (existingNode) {
      throw new FileSystemError(`Directory already exists: ${dirPath}`, 'ALREADY_EXISTS')
    }

    const now = new Date()
    const dirNode: DirectoryNode = {
      id: generateId(),
      type: 'directory',
      name,
      path: dirPath,
      parentId: parentNode.id,
      children: [],
      createdAt: now,
      updatedAt: now
    }

    this.project.nodes.set(dirNode.id, dirNode)
    parentNode.children.push(dirNode.id)
    this.updateTimestamp(parentNode)

    return dirNode
  }

  updateFile(path: string, content: string): FileNode {
    const node = this.getNodeByPath(path)
    if (!node) {
      throw new FileSystemError(`File not found: ${path}`, 'NOT_FOUND')
    }
    
    if (!isFile(node)) {
      throw new FileSystemError(`Not a file: ${path}`, 'INVALID_OPERATION')
    }

    node.content = content
    node.size = content.length
    this.updateTimestamp(node)

    return node
  }

  renameNode(path: string, newName: string): FSNode {
    const validation = validateFileName(newName)
    if (!validation.valid) {
      throw new FileSystemError(validation.error!, 'INVALID_PATH')
    }

    const node = this.getNodeByPath(path)
    if (!node) {
      throw new FileSystemError(`Node not found: ${path}`, 'NOT_FOUND')
    }

    if (node.parentId === null) {
      throw new FileSystemError('Cannot rename root directory', 'INVALID_OPERATION')
    }

    const parentPath = dirname(path)
    const newPath = joinPath(parentPath, newName)

    const existingNode = this.getNodeByPath(newPath)
    if (existingNode && existingNode.id !== node.id) {
      throw new FileSystemError(`Node already exists: ${newPath}`, 'ALREADY_EXISTS')
    }

    node.name = newName
    node.path = newPath
    this.updateTimestamp(node)

    if (isDirectory(node)) {
      this.updateChildPaths(node)
    }

    return node
  }

  moveNode(sourcePath: string, targetDirPath: string): FSNode {
    const node = this.getNodeByPath(sourcePath)
    if (!node) {
      throw new FileSystemError(`Node not found: ${sourcePath}`, 'NOT_FOUND')
    }

    if (node.parentId === null) {
      throw new FileSystemError('Cannot move root directory', 'INVALID_OPERATION')
    }

    const targetDir = this.getNodeByPath(targetDirPath)
    if (!targetDir) {
      throw new FileSystemError(`Target directory not found: ${targetDirPath}`, 'NOT_FOUND')
    }
    
    if (!isDirectory(targetDir)) {
      throw new FileSystemError(`Target is not a directory: ${targetDirPath}`, 'INVALID_OPERATION')
    }

    if (isSubPath(sourcePath, targetDirPath)) {
      throw new FileSystemError('Cannot move directory into itself', 'INVALID_OPERATION')
    }

    const newPath = joinPath(targetDirPath, node.name)
    const existingNode = this.getNodeByPath(newPath)
    if (existingNode) {
      throw new FileSystemError(`Node already exists: ${newPath}`, 'ALREADY_EXISTS')
    }

    const oldParentNode = this.getNodeById(node.parentId)
    if (oldParentNode && isDirectory(oldParentNode)) {
      oldParentNode.children = oldParentNode.children.filter(id => id !== node.id)
      this.updateTimestamp(oldParentNode)
    }

    node.path = newPath
    node.parentId = targetDir.id
    targetDir.children.push(node.id)
    this.updateTimestamp(node)
    this.updateTimestamp(targetDir)

    if (isDirectory(node)) {
      this.updateChildPaths(node)
    }

    return node
  }

  deleteNode(path: string): void {
    const node = this.getNodeByPath(path)
    if (!node) {
      throw new FileSystemError(`Node not found: ${path}`, 'NOT_FOUND')
    }

    if (node.parentId === null) {
      throw new FileSystemError('Cannot delete root directory', 'INVALID_OPERATION')
    }

    if (isDirectory(node)) {
      this.deleteChildren(node)
    }

    const parentNode = this.getNodeById(node.parentId)
    if (parentNode && isDirectory(parentNode)) {
      parentNode.children = parentNode.children.filter(id => id !== node.id)
      this.updateTimestamp(parentNode)
    }

    this.project.nodes.delete(node.id)
  }

  private deleteChildren(dir: DirectoryNode): void {
    for (const childId of dir.children) {
      const child = this.getNodeById(childId)
      if (child && isDirectory(child)) {
        this.deleteChildren(child)
      }
      this.project.nodes.delete(childId)
    }
  }

  private updateChildPaths(dir: DirectoryNode): void {
    for (const childId of dir.children) {
      const child = this.getNodeById(childId)
      if (child) {
        child.path = joinPath(dir.path, child.name)
        this.updateTimestamp(child)
        
        if (isDirectory(child)) {
          this.updateChildPaths(child)
        }
      }
    }
  }

  private updateTimestamp(node: FSNode): void {
    node.updatedAt = new Date()
    this.project.updatedAt = new Date()
  }

  generateDiff(oldNodes: Map<string, FSNode>, newNodes: Map<string, FSNode>): FileChange[] {
    const changes: FileChange[] = []
    
    for (const [id, oldNode] of oldNodes) {
      const newNode = newNodes.get(id)
      
      if (!newNode) {
        changes.push({
          type: 'delete',
          nodeId: id,
          oldPath: oldNode.path
        })
      } else if (oldNode.path !== newNode.path) {
        changes.push({
          type: 'move',
          nodeId: id,
          oldPath: oldNode.path,
          newPath: newNode.path,
          oldParentId: oldNode.parentId || undefined,
          newParentId: newNode.parentId || undefined
        })
      } else if (isFile(oldNode) && isFile(newNode) && oldNode.content !== newNode.content) {
        changes.push({
          type: 'update',
          nodeId: id,
          oldContent: oldNode.content,
          newContent: newNode.content
        })
      }
    }
    
    for (const [id, newNode] of newNodes) {
      if (!oldNodes.has(id)) {
        changes.push({
          type: 'create',
          nodeId: id,
          newPath: newNode.path,
          newContent: isFile(newNode) ? newNode.content : undefined
        })
      }
    }
    
    return changes
  }
}