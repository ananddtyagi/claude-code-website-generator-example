"use client"

import { useState, useRef, useEffect } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, MoreHorizontal } from 'lucide-react'
import { FSNode, isDirectory, isFile } from '../../lib/filesystem/types'
import { Button } from '../ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu'

interface FileTreeNodeProps {
  node: FSNode
  level: number
  isExpanded: boolean
  isSelected: boolean
  isRenaming: boolean
  children?: FSNode[]
  onToggle: (nodeId: string) => void
  onSelect: (nodeId: string) => void
  onRename: (nodeId: string, newName: string) => void
  onDelete: (nodeId: string) => void
  onCreateFile: (parentId: string) => void
  onCreateFolder: (parentId: string) => void
  onStartRename: (nodeId: string) => void
  onCancelRename: () => void
}

export function FileTreeNode({
  node,
  level,
  isExpanded,
  isSelected,
  isRenaming,
  children = [],
  onToggle,
  onSelect,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onStartRename,
  onCancelRename
}: FileTreeNodeProps) {
  const [editName, setEditName] = useState(node.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDirectory(node)) {
      onToggle(node.id)
    }
  }

  const handleSelect = () => {
    onSelect(node.id)
  }

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editName.trim() && editName !== node.name) {
      onRename(node.id, editName.trim())
    }
    onCancelRename()
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditName(node.name)
      onCancelRename()
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onSelect(node.id)
  }

  const getIcon = () => {
    if (isDirectory(node)) {
      return isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const canHaveChildren = isDirectory(node)
  const paddingLeft = level * 16 + 8

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 py-1 px-2 text-sm cursor-pointer hover:bg-accent rounded
          ${isSelected ? 'bg-accent' : ''}
        `}
        style={{ paddingLeft }}
        onClick={handleSelect}
        onContextMenu={handleContextMenu}
      >
        {canHaveChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={handleToggle}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
        
        {!canHaveChildren && <div className="w-4" />}
        
        {getIcon()}
        
        {isRenaming ? (
          <form onSubmit={handleRenameSubmit} className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              className="flex-1 bg-background border border-border rounded px-1 text-sm"
            />
          </form>
        ) : (
          <span className="flex-1 truncate">{node.name}</span>
        )}
        
        {isSelected && !isRenaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canHaveChildren && (
                <>
                  <DropdownMenuItem onClick={() => onCreateFile(node.id)}>
                    New File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateFolder(node.id)}>
                    New Folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => onStartRename(node.id)}>
                Rename
              </DropdownMenuItem>
              {node.parentId && (
                <DropdownMenuItem 
                  onClick={() => onDelete(node.id)}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {canHaveChildren && isExpanded && children.map((child) => (
        <FileTreeNode
          key={child.id}
          node={child}
          level={level + 1}
          isExpanded={false} // This will be managed by parent
          isSelected={false} // This will be managed by parent
          isRenaming={false} // This will be managed by parent
          onToggle={onToggle}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onStartRename={onStartRename}
          onCancelRename={onCancelRename}
        />
      ))}
    </div>
  )
}