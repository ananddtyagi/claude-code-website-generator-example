"use client"

import { useState, useEffect, useCallback } from 'react'
import { FSNode, FileNode, Project, isFile } from '@/lib/filesystem/types'
import { CodeEditor } from './CodeEditor'
import { EditorTabManager, EditorTab } from './EditorTabManager'

interface EditorPanelProps {
  project: Project | null
  selectedFile: FSNode | null
  onFileChange: (fileId: string, content: string) => void
  onProjectChange: (project: Project) => void
  className?: string
}

export function EditorPanel({ 
  project, 
  selectedFile, 
  onFileChange, 
  onProjectChange,
  className 
}: EditorPanelProps) {
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  // Add selected file to tabs when it changes
  useEffect(() => {
    if (selectedFile && isFile(selectedFile)) {
      setOpenTabs(prev => {
        const existingTab = prev.find(tab => tab.fileId === selectedFile.id)
        
        if (!existingTab) {
          const newTab: EditorTab = {
            fileId: selectedFile.id,
            filename: selectedFile.name,
            path: selectedFile.path,
            isDirty: false,
            originalContent: selectedFile.content,
            currentContent: selectedFile.content
          }
          return [...prev, newTab]
        }
        return prev
      })
      
      setActiveTabId(selectedFile.id)
    }
  }, [selectedFile])

  // Update tab content when file content changes in project
  useEffect(() => {
    if (project) {
      setOpenTabs(prevTabs => 
        prevTabs.map(tab => {
          const fileNode = project.nodes.get(tab.fileId)
          if (fileNode && isFile(fileNode)) {
            return {
              ...tab,
              originalContent: fileNode.content,
              currentContent: fileNode.content,
              isDirty: false
            }
          }
          return tab
        }).filter(tab => project.nodes.has(tab.fileId)) // Remove tabs for deleted files
      )
    } else {
      setOpenTabs([])
      setActiveTabId(null)
    }
  }, [project])

  const handleTabSelect = (fileId: string) => {
    setActiveTabId(fileId)
  }

  const handleTabClose = (fileId: string) => {
    setOpenTabs(prev => prev.filter(tab => tab.fileId !== fileId))
    
    if (activeTabId === fileId) {
      const remainingTabs = openTabs.filter(tab => tab.fileId !== fileId)
      setActiveTabId(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].fileId : null)
    }
  }

  const handleEditorChange = (content: string) => {
    if (!activeTabId) return

    setOpenTabs(prevTabs =>
      prevTabs.map(tab => 
        tab.fileId === activeTabId
          ? { ...tab, currentContent: content, isDirty: content !== tab.originalContent }
          : tab
      )
    )

    // Update the file content in the project
    onFileChange(activeTabId, content)
  }

  const handleSave = useCallback(() => {
    if (!activeTabId || !project) return

    const tab = openTabs.find(t => t.fileId === activeTabId)
    if (!tab || !tab.isDirty) return

    // Save the changes to the project
    const fileNode = project.nodes.get(activeTabId)
    if (fileNode && isFile(fileNode)) {
      const updatedNode: FileNode = {
        ...fileNode,
        content: tab.currentContent,
        updatedAt: new Date()
      }

      const updatedProject = {
        ...project,
        nodes: new Map(project.nodes.set(activeTabId, updatedNode)),
        updatedAt: new Date()
      }

      onProjectChange(updatedProject)

      // Update tab state
      setOpenTabs(prevTabs =>
        prevTabs.map(t => 
          t.fileId === activeTabId
            ? { ...t, originalContent: tab.currentContent, isDirty: false }
            : t
        )
      )
    }
  }, [activeTabId, project, openTabs, onProjectChange])

  const activeTab = openTabs.find(tab => tab.fileId === activeTabId)
  const activeFile = activeTab && project ? project.nodes.get(activeTab.fileId) as FileNode | undefined : null

  if (!project) {
    return (
      <div className={`h-full flex items-center justify-center text-muted-foreground ${className}`}>
        <div className="text-center">
          <p className="text-sm">No project loaded</p>
          <p className="text-xs mt-1">Create or open a project to start editing</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <EditorTabManager
        tabs={openTabs}
        activeTabId={activeTabId}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
      />
      
      <div className="flex-1 min-h-0">
        <CodeEditor
          file={activeFile || null}
          onChange={handleEditorChange}
          onSave={handleSave}
          className="h-full"
        />
      </div>
    </div>
  )
}