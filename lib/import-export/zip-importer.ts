import JSZip from 'jszip'
import { Project, FSNode, FileNode, DirectoryNode } from '../filesystem/types'
import { 
  normalizePath, 
  joinPath, 
  dirname, 
  basename, 
  getFileTypeFromPath,
  validateFileName 
} from '../filesystem/path-utils'
import { generateId } from '../utils/id'

interface ImportProgress {
  current: number
  total: number
  status: string
}

export class ZipImporter {
  async importZip(
    zipFile: File,
    projectName?: string,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<Project> {
    const zip = new JSZip()
    const zipData = await zip.loadAsync(zipFile)
    
    const files = Object.keys(zipData.files).filter(path => !zipData.files[path].dir)
    const totalFiles = files.length
    
    onProgress?.({
      current: 0,
      total: totalFiles,
      status: 'Reading ZIP file...'
    })

    const now = new Date()
    const rootId = generateId()
    const nodes = new Map<string, FSNode>()
    const pathToNodeId = new Map<string, string>()
    
    const rootNode: DirectoryNode = {
      id: rootId,
      type: 'directory',
      name: '/',
      path: '/',
      parentId: null,
      children: [],
      createdAt: now,
      updatedAt: now
    }
    
    nodes.set(rootId, rootNode)
    pathToNodeId.set('/', rootId)
    
    for (let i = 0; i < files.length; i++) {
      const filePath = files[i]
      const zipEntry = zipData.files[filePath]
      
      onProgress?.({
        current: i + 1,
        total: totalFiles,
        status: `Processing ${basename(filePath)}...`
      })
      
      await this.processZipEntry(filePath, zipEntry, nodes, pathToNodeId, now)
    }
    
    onProgress?.({
      current: totalFiles,
      total: totalFiles,
      status: 'Finalizing project...'
    })
    
    const project: Project = {
      id: generateId(),
      name: projectName || this.generateProjectName(zipFile.name),
      rootId,
      nodes,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now
    }
    
    return project
  }

  private async processZipEntry(
    filePath: string,
    zipEntry: JSZip.JSZipObject,
    nodes: Map<string, FSNode>,
    pathToNodeId: Map<string, string>,
    timestamp: Date
  ): Promise<void> {
    const normalizedPath = normalizePath('/' + filePath)
    
    await this.ensureParentDirectories(normalizedPath, nodes, pathToNodeId, timestamp)
    
    try {
      const content = await this.getFileContent(zipEntry, filePath)
      const fileType = getFileTypeFromPath(filePath)
      const fileName = basename(normalizedPath)
      
      const validation = validateFileName(fileName)
      if (!validation.valid) {
        console.warn(`Skipping invalid filename: ${fileName}`, validation.error)
        return
      }
      
      const parentPath = dirname(normalizedPath)
      const parentId = pathToNodeId.get(parentPath)
      
      if (!parentId) {
        console.warn(`Parent directory not found for: ${normalizedPath}`)
        return
      }
      
      const fileNode: FileNode = {
        id: generateId(),
        type: 'file',
        name: fileName,
        path: normalizedPath,
        parentId,
        content: content.content,
        size: content.size,
        binary: fileType !== 'text',
        mimeType: this.getMimeType(filePath),
        createdAt: timestamp,
        updatedAt: timestamp
      }
      
      nodes.set(fileNode.id, fileNode)
      pathToNodeId.set(normalizedPath, fileNode.id)
      
      const parentNode = nodes.get(parentId) as DirectoryNode
      parentNode.children.push(fileNode.id)
      
    } catch (error) {
      console.warn(`Failed to process file: ${filePath}`, error)
    }
  }

  private async ensureParentDirectories(
    filePath: string,
    nodes: Map<string, FSNode>,
    pathToNodeId: Map<string, string>,
    timestamp: Date
  ): Promise<void> {
    const pathParts = filePath.split('/').filter(Boolean)
    let currentPath = ''
    
    for (const part of pathParts.slice(0, -1)) {
      const parentPath = currentPath || '/'
      currentPath = joinPath(currentPath, part)
      
      if (pathToNodeId.has(currentPath)) {
        continue
      }
      
      const validation = validateFileName(part)
      if (!validation.valid) {
        throw new Error(`Invalid directory name: ${part}`)
      }
      
      const parentId = pathToNodeId.get(parentPath)
      if (!parentId) {
        throw new Error(`Parent directory not found: ${parentPath}`)
      }
      
      const dirNode: DirectoryNode = {
        id: generateId(),
        type: 'directory',
        name: part,
        path: currentPath,
        parentId,
        children: [],
        createdAt: timestamp,
        updatedAt: timestamp
      }
      
      nodes.set(dirNode.id, dirNode)
      pathToNodeId.set(currentPath, dirNode.id)
      
      const parentNode = nodes.get(parentId) as DirectoryNode
      parentNode.children.push(dirNode.id)
    }
  }

  private async getFileContent(
    zipEntry: JSZip.JSZipObject,
    filePath: string
  ): Promise<{ content: string; size: number }> {
    const fileType = getFileTypeFromPath(filePath)
    
    if (fileType === 'text') {
      const content = await zipEntry.async('text')
      return {
        content: this.normalizeLineEndings(content),
        size: new Blob([content]).size
      }
    } else {
      const arrayBuffer = await zipEntry.async('arraybuffer')
      const base64 = await this.arrayBufferToBase64(arrayBuffer)
      return {
        content: `data:${this.getMimeType(filePath)};base64,${base64}`,
        size: arrayBuffer.byteLength
      }
    }
  }

  private normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  }

  private async arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()
    
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'js': 'text/javascript',
      'jsx': 'text/javascript',
      'ts': 'text/typescript',
      'tsx': 'text/typescript',
      'css': 'text/css',
      'scss': 'text/scss',
      'sass': 'text/sass',
      'html': 'text/html',
      'xml': 'application/xml',
      'json': 'application/json',
      'yml': 'text/yaml',
      'yaml': 'text/yaml',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'ico': 'image/x-icon',
      'pdf': 'application/pdf',
      'zip': 'application/zip'
    }
    
    return ext ? mimeTypes[ext] || 'application/octet-stream' : 'application/octet-stream'
  }

  private generateProjectName(zipFileName: string): string {
    const baseName = basename(zipFileName, '.zip')
    return baseName || 'Imported Project'
  }

  validateZipStructure(project: Project): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    const hasPackageJson = Array.from(project.nodes.values())
      .some(node => node.path === '/package.json')
    
    if (!hasPackageJson) {
      warnings.push('No package.json found - this may not be a valid Next.js project')
    }
    
    const hasAppDir = Array.from(project.nodes.values())
      .some(node => node.path === '/app' && node.type === 'directory')
    
    const hasPagesDir = Array.from(project.nodes.values())
      .some(node => node.path === '/pages' && node.type === 'directory')
    
    if (!hasAppDir && !hasPagesDir) {
      warnings.push('No app/ or pages/ directory found - this may not be a Next.js project')
    }
    
    const nodeCount = project.nodes.size
    if (nodeCount > 1000) {
      warnings.push(`Large project with ${nodeCount} files - performance may be impacted`)
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}