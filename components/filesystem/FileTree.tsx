"use client"

import { useState, useEffect, useCallback } from 'react'
import { FSNode, Project, DirectoryNode, isDirectory } from '../../lib/filesystem/types'
import { FileSystemOperations } from '../../lib/filesystem/operations'
import { FileTreeNode } from './FileTreeNode'
import { Button } from '../ui/button'
import { Plus, FolderPlus, FileText } from 'lucide-react'

interface FileTreeProps {
  project: Project | null
  onProjectChange: (project: Project) => void
  onFileSelect: (node: FSNode) => void
  selectedFileId?: string
}

export function FileTree({ 
  project, 
  onProjectChange, 
  onFileSelect, 
  selectedFileId 
}: FileTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(selectedFileId || null)

  useEffect(() => {
    if (selectedFileId) {
      setSelectedNodeId(selectedFileId)
    }
  }, [selectedFileId])

  const fsOps = project ? new FileSystemOperations(project) : null

  const buildNodeTree = useCallback((parentId: string | null): FSNode[] => {
    if (!project) return []
    
    const children: FSNode[] = []
    
    for (const node of project.nodes.values()) {
      if (node.parentId === parentId) {
        children.push(node)
      }
    }
    
    return children.sort((a, b) => {
      if (isDirectory(a) && !isDirectory(b)) return -1
      if (!isDirectory(a) && isDirectory(b)) return 1
      return a.name.localeCompare(b.name)
    })
  }, [project])

  const getRootNode = (): DirectoryNode | null => {
    if (!project) return null
    const root = project.nodes.get(project.rootId)
    return root && isDirectory(root) ? root : null
  }

  const getNodeChildren = (nodeId: string): FSNode[] => {
    return buildNodeTree(nodeId)
  }

  const handleToggle = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const handleSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    const node = project?.nodes.get(nodeId)
    if (node) {
      onFileSelect(node)
    }
  }

  const handleCreateFile = (parentId: string) => {
    if (!fsOps || !project) return
    
    try {
      const parentNode = project.nodes.get(parentId)
      if (!parentNode) return
      
      let counter = 1
      let fileName = 'untitled.txt'
      
      while (fsOps.getNodeByPath(`${parentNode.path === '/' ? '' : parentNode.path}/${fileName}`)) {
        fileName = `untitled${counter}.txt`
        counter++
      }
      
      const newFile = fsOps.createFile(parentNode.path, fileName)
      setExpandedNodes(prev => new Set([...prev, parentId]))
      setSelectedNodeId(newFile.id)
      setRenamingNodeId(newFile.id)
      
      onProjectChange({ ...project })
      onFileSelect(newFile)
    } catch (error) {
      console.error('Failed to create file:', error)
    }
  }

  const handleCreateFolder = (parentId: string) => {
    if (!fsOps || !project) return
    
    try {
      const parentNode = project.nodes.get(parentId)
      if (!parentNode) return
      
      let counter = 1
      let folderName = 'New Folder'
      
      while (fsOps.getNodeByPath(`${parentNode.path === '/' ? '' : parentNode.path}/${folderName}`)) {
        folderName = `New Folder ${counter}`
        counter++
      }
      
      const newFolder = fsOps.createDirectory(parentNode.path, folderName)
      setExpandedNodes(prev => new Set([...prev, parentId, newFolder.id]))
      setSelectedNodeId(newFolder.id)
      setRenamingNodeId(newFolder.id)
      
      onProjectChange({ ...project })
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  }

  const handleRename = (nodeId: string, newName: string) => {
    if (!fsOps || !project) return
    
    try {
      const node = project.nodes.get(nodeId)
      if (!node) return
      
      fsOps.renameNode(node.path, newName)
      onProjectChange({ ...project })
      
      if (isDirectory(node)) {
        onFileSelect(node)
      }
    } catch (error) {
      console.error('Failed to rename:', error)
    }
  }

  const handleDelete = (nodeId: string) => {
    if (!fsOps || !project) return
    
    const node = project.nodes.get(nodeId)
    if (!node || !node.parentId) return
    
    if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
      try {
        fsOps.deleteNode(node.path)
        
        if (selectedNodeId === nodeId) {
          setSelectedNodeId(null)
        }
        
        setExpandedNodes(prev => {
          const newSet = new Set(prev)
          newSet.delete(nodeId)
          return newSet
        })
        
        onProjectChange({ ...project })
      } catch (error) {
        console.error('Failed to delete:', error)
      }
    }
  }

  const handleStartRename = (nodeId: string) => {
    setRenamingNodeId(nodeId)
  }

  const handleCancelRename = () => {
    setRenamingNodeId(null)
  }

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">No project selected</p>
          <p className="text-xs mt-1">Create or open a project to get started</p>
        </div>
      </div>
    )
  }

  const rootNode = getRootNode()
  if (!rootNode) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Invalid project structure</p>
      </div>
    )
  }

  const rootChildren = getNodeChildren(rootNode.id)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b">
        <span className="text-sm font-medium truncate flex-1">{project.name}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCreateFile(rootNode.id)}
          className="h-6 w-6 p-0"
          title="New File"
        >
          <FileText className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCreateFolder(rootNode.id)}
          className="h-6 w-6 p-0"
          title="New Folder"
        >
          <FolderPlus className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto py-2">
        {rootChildren.map((node) => (
          <FileTreeNode
            key={node.id}
            node={node}
            level={0}
            isExpanded={expandedNodes.has(node.id)}
            isSelected={selectedNodeId === node.id}
            isRenaming={renamingNodeId === node.id}
            children={getNodeChildren(node.id)}
            onToggle={handleToggle}
            onSelect={handleSelect}
            onRename={handleRename}
            onDelete={handleDelete}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onStartRename={handleStartRename}
            onCancelRename={handleCancelRename}
          />
        ))}
        
        {rootChildren.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">This project is empty</p>
            <p className="text-xs mt-1">Create your first file or folder</p>
          </div>
        )}
      </div>
    </div>
  )
}