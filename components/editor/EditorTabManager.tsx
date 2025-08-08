"use client"

import { Button } from '@/components/ui/button'
import { X, Circle } from 'lucide-react'

export interface EditorTab {
  fileId: string
  filename: string
  path: string
  isDirty: boolean
  originalContent: string
  currentContent: string
}

interface EditorTabManagerProps {
  tabs: EditorTab[]
  activeTabId: string | null
  onTabSelect: (fileId: string) => void
  onTabClose: (fileId: string) => void
  className?: string
}

export function EditorTabManager({ 
  tabs, 
  activeTabId, 
  onTabSelect, 
  onTabClose, 
  className 
}: EditorTabManagerProps) {
  const handleTabClose = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation()
    
    const tab = tabs.find(t => t.fileId === fileId)
    if (tab && tab.isDirty) {
      const shouldClose = confirm(`"${tab.filename}" has unsaved changes. Are you sure you want to close it?`)
      if (!shouldClose) return
    }
    
    onTabClose(fileId)
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop()
    switch (ext) {
      case 'ts':
      case 'tsx':
        return '📘'
      case 'js':
      case 'jsx':
        return '📄'
      case 'json':
        return '📋'
      case 'css':
      case 'scss':
      case 'less':
        return '🎨'
      case 'html':
        return '🌐'
      case 'md':
        return '📝'
      default:
        return '📄'
    }
  }

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center bg-muted/30 border-b overflow-x-auto ${className}`}>
      {tabs.map((tab) => (
        <div
          key={tab.fileId}
          className={`
            flex items-center gap-2 px-3 py-2 border-r cursor-pointer hover:bg-muted/50 transition-colors
            ${activeTabId === tab.fileId ? 'bg-background border-b-2 border-b-primary' : ''}
            min-w-0 flex-shrink-0
          `}
          onClick={() => onTabSelect(tab.fileId)}
          title={tab.path}
        >
          <span className="text-xs">{getFileIcon(tab.filename)}</span>
          <span className="text-sm truncate max-w-[120px]">{tab.filename}</span>
          
          {tab.isDirty && (
            <Circle className="h-2 w-2 fill-orange-500 text-orange-500 flex-shrink-0" />
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 opacity-60 hover:opacity-100"
            onClick={(e) => handleTabClose(e, tab.fileId)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      
      {tabs.length > 5 && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          +{tabs.length - 5} more
        </div>
      )}
    </div>
  )
}