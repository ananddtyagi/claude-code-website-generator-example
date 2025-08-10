import JSZip from 'jszip'
import { Project, FSNode, isFile, isDirectory } from '../filesystem/types'
import { normalizePath } from '../filesystem/path-utils'

interface ExportProgress {
  current: number
  total: number
  status: string
}

export class ZipExporter {
  async exportProject(
    project: Project,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<Blob> {
    const zip = new JSZip()
    
    const allNodes = Array.from(project.nodes.values())
    const fileNodes = allNodes.filter(isFile)
    const totalFiles = fileNodes.length
    
    onProgress?.({
      current: 0,
      total: totalFiles,
      status: 'Preparing export...'
    })
    
    for (let i = 0; i < fileNodes.length; i++) {
      const fileNode = fileNodes[i]
      
      onProgress?.({
        current: i + 1,
        total: totalFiles,
        status: `Adding ${fileNode.name}...`
      })
      
      this.addFileToZip(zip, fileNode)
    }
    
    onProgress?.({
      current: totalFiles,
      total: totalFiles,
      status: 'Generating ZIP file...'
    })
    
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      streamFiles: true
    })
    
    return blob
  }

  async downloadProject(project: Project, onProgress?: (progress: ExportProgress) => void): Promise<void> {
    const blob = await this.exportProject(project, onProgress)
    const filename = this.generateFilename(project.name)
    
    this.downloadBlob(blob, filename)
  }

  private addFileToZip(zip: JSZip, fileNode: FSNode): void {
    if (!isFile(fileNode)) return
    
    const relativePath = this.getRelativePath(fileNode.path)
    
    if (fileNode.binary && fileNode.content.startsWith('data:')) {
      const base64Data = fileNode.content.split(',')[1]
      zip.file(relativePath, base64Data, { base64: true })
    } else {
      const normalizedContent = this.normalizeLineEndings(fileNode.content)
      zip.file(relativePath, normalizedContent)
    }
  }

  private getRelativePath(path: string): string {
    const normalized = normalizePath(path)
    
    if (normalized === '/') return ''
    if (normalized.startsWith('/')) return normalized.substring(1)
    
    return normalized
  }

  private normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, '\n')
  }

  private generateFilename(projectName: string): string {
    const safeName = projectName
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
    
    const timestamp = new Date().toISOString().split('T')[0]
    return `${safeName}-${timestamp}.zip`
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  validateExport(project: Project): {
    valid: boolean
    errors: string[]
    warnings: string[]
    stats: {
      totalFiles: number
      totalDirectories: number
      totalSize: number
      largestFile: { name: string; size: number } | null
    }
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    const allNodes = Array.from(project.nodes.values())
    const fileNodes = allNodes.filter(isFile)
    const directoryNodes = allNodes.filter(isDirectory)
    
    let totalSize = 0
    let largestFile: { name: string; size: number } | null = null
    
    for (const fileNode of fileNodes) {
      totalSize += fileNode.size
      
      if (!largestFile || fileNode.size > largestFile.size) {
        largestFile = { name: fileNode.name, size: fileNode.size }
      }
      
      if (fileNode.size > 10 * 1024 * 1024) { // 10MB
        warnings.push(`Large file detected: ${fileNode.name} (${this.formatFileSize(fileNode.size)})`)
      }
      
      if (fileNode.path.length > 260) {
        errors.push(`Path too long: ${fileNode.path}`)
      }
    }
    
    if (totalSize > 100 * 1024 * 1024) { // 100MB
      warnings.push(`Large project size: ${this.formatFileSize(totalSize)}`)
    }
    
    if (fileNodes.length > 1000) {
      warnings.push(`Many files in project: ${fileNodes.length} files`)
    }
    
    const hasRootFiles = fileNodes.some(node => {
      const depth = node.path.split('/').length - 2 // Subtract 2 for empty string and root
      return depth === 0
    })
    
    if (!hasRootFiles) {
      warnings.push('No files in root directory')
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalFiles: fileNodes.length,
        totalDirectories: directoryNodes.length - 1, // Subtract root directory
        totalSize,
        largestFile
      }
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async generateProjectPreview(project: Project): Promise<{
    structure: TreeNode[]
    stats: {
      totalFiles: number
      totalDirectories: number
      totalSize: number
    }
  }> {
    const allNodes = Array.from(project.nodes.values())
    const fileNodes = allNodes.filter(isFile)
    const directoryNodes = allNodes.filter(isDirectory)
    
    const totalSize = fileNodes.reduce((sum, node) => sum + node.size, 0)
    
    const structure = this.buildTreeStructure(project)
    
    return {
      structure,
      stats: {
        totalFiles: fileNodes.length,
        totalDirectories: directoryNodes.length - 1,
        totalSize
      }
    }
  }

  private buildTreeStructure(project: Project): TreeNode[] {
    const rootNode = project.nodes.get(project.rootId)
    if (!rootNode || !isDirectory(rootNode)) return []
    
    return this.buildTreeNodeChildren(rootNode, project, 0)
  }

  private buildTreeNodeChildren(parent: FSNode, project: Project, depth: number): TreeNode[] {
    if (!isDirectory(parent) || depth > 5) return [] // Limit depth for preview
    
    const children: TreeNode[] = []
    
    for (const childId of parent.children) {
      const child = project.nodes.get(childId)
      if (!child) continue
      
      const treeNode: TreeNode = {
        name: child.name,
        type: child.type,
        size: isFile(child) ? child.size : undefined,
        children: isDirectory(child) 
          ? this.buildTreeNodeChildren(child, project, depth + 1)
          : undefined
      }
      
      children.push(treeNode)
    }
    
    return children.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1
      if (a.type === 'file' && b.type === 'directory') return 1
      return a.name.localeCompare(b.name)
    })
  }
}

interface TreeNode {
  name: string
  type: 'file' | 'directory'
  size?: number
  children?: TreeNode[]
}