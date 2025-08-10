"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { ChatPanel } from "./ChatPanel"
import { LeftTabbedPanel } from "./LeftTabbedPanel"
import { Project, FSNode } from "@/lib/filesystem/types"
import { ProjectStore } from "@/lib/storage/project-store"
import { createSampleProject } from "@/lib/dev/sample-data"
import { EditorState } from "../editor/EditorPanel"

const DEFAULT_LAYOUT = [50, 50]

export function ResizableLayout() {
  const [isClient, setIsClient] = useState(false)
  const [defaultLayout, setDefaultLayout] = useState(DEFAULT_LAYOUT)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [selectedFile, setSelectedFile] = useState<FSNode | null>(null)
  const [editorState, setEditorState] = useState<EditorState>({ openFiles: [] })
  const autosaveSchedulerRef = useRef<(() => void) | null>(null)
  const autosaveCleanupRef = useRef<(() => void) | null>(null)
  const projectStoreRef = useRef<ProjectStore | null>(null)

  useEffect(() => {
    setIsClient(true)
    const saved = localStorage.getItem("ui.layout.v1")
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as number[]
        if (parsed.length === 2) {
          setDefaultLayout(parsed)
        }
      } catch {
        // Use default layout
      }
    }

    // Load the last opened project or create a default one for development
    loadLastProject()
  }, [])

  const loadLastProject = async () => {
    try {
      if (!projectStoreRef.current) {
        projectStoreRef.current = new ProjectStore()
        await projectStoreRef.current.initialize()
      }
      const projectStore = projectStoreRef.current
      const projects = await projectStore.listProjects()
      
      if (projects.length > 0) {
        // Load the most recently opened project
        const mostRecent = projects.sort((a, b) => 
          (b.lastOpenedAt?.getTime() || 0) - (a.lastOpenedAt?.getTime() || 0)
        )[0]
        
        const project = await projectStore.loadProject(mostRecent.id)
        if (project) {
          setCurrentProject(project)
        }
      } else {
        // Create and load a sample project if none exist
        const sampleProject = createSampleProject()
        await projectStore.saveProject(sampleProject)
        setCurrentProject(sampleProject)
        console.log('Created sample project with demo files')
      }
    } catch (error) {
      console.error('Failed to load last project:', error)
      // Fallback: create sample project anyway
      try {
        const sampleProject = createSampleProject()
        setCurrentProject(sampleProject)
        console.log('Created sample project (fallback)')
      } catch (fallbackError) {
        console.error('Failed to create sample project:', fallbackError)
      }
    }
  }

  const handleLayout = (sizes: number[]) => {
    if (isClient) {
      localStorage.setItem("ui.layout.v1", JSON.stringify(sizes))
    }
  }

  const handleProjectChange = useCallback(async (project: Project) => {
    setCurrentProject(project)
    
    // Save project to IndexedDB immediately for explicit saves
    try {
      if (!projectStoreRef.current) {
        projectStoreRef.current = new ProjectStore()
        await projectStoreRef.current.initialize()
      }
      await projectStoreRef.current.saveProject(project)
    } catch (error) {
      console.error('Failed to save project:', error)
    }
  }, [])

  // Setup autosave when project changes
  useEffect(() => {
    if (currentProject) {
      const setupAutosave = async () => {
        // Clean up previous autosave
        if (autosaveCleanupRef.current) {
          autosaveCleanupRef.current()
        }

        // Setup new autosave for current project
        if (!projectStoreRef.current) {
          projectStoreRef.current = new ProjectStore()
          await projectStoreRef.current.initialize()
        }
        const scheduleAutosave = projectStoreRef.current.setupAutosave(
          () => currentProject, 
          () => {
            console.log('Project autosaved')
          }
        )
        
        autosaveSchedulerRef.current = scheduleAutosave
        
        // Create cleanup function
        const cleanup = () => {
          autosaveSchedulerRef.current = null
        }
        autosaveCleanupRef.current = cleanup
      }

      setupAutosave().catch(error => {
        console.error('Failed to setup autosave:', error)
      })

      return () => {
        if (autosaveCleanupRef.current) {
          autosaveCleanupRef.current()
        }
      }
    }
  }, [currentProject])

  // Trigger autosave whenever currentProject changes (debounced)
  useEffect(() => {
    if (currentProject && autosaveSchedulerRef.current) {
      console.log('Triggering autosave schedule...')
      autosaveSchedulerRef.current()
    }
  }, [currentProject])

  // Cleanup autosave on unmount
  useEffect(() => {
    return () => {
      if (autosaveCleanupRef.current) {
        autosaveCleanupRef.current()
      }
    }
  }, [])

  const handleFileSelect = useCallback((node: FSNode) => {
    setSelectedFile(node)
  }, [])

  const handleEditorStateChange = useCallback((state: EditorState) => {
    setEditorState(state)
  }, [])

  const handleFileChange = useCallback((fileId: string, content: string) => {
    if (!currentProject) return

    console.log('File changed:', fileId, 'content length:', content.length)

    const fileNode = currentProject.nodes.get(fileId)
    if (fileNode && fileNode.type === 'file') {
      const updatedNode = {
        ...fileNode,
        content,
        updatedAt: new Date()
      }

      const updatedProject = {
        ...currentProject,
        nodes: new Map(currentProject.nodes.set(fileId, updatedNode)),
        updatedAt: new Date()
      }

      setCurrentProject(updatedProject)
      console.log('Project state updated, autosave should trigger')
    }
  }, [currentProject])

  // Handler for AI-driven file changes (path-based)
  const handleAIFileChange = useCallback((path: string, content: string) => {
    if (!currentProject) return

    console.log('AI file change:', path, 'content length:', content.length)

    // Find the file node by path
    const fileNode = Array.from(currentProject.nodes.values()).find(node => 
      node.path === path && node.type === 'file'
    )
    
    if (fileNode) {
      handleFileChange(fileNode.id, content)
    }
  }, [currentProject, handleFileChange])

  if (!isClient) {
    return (
      <div className="h-full grid grid-cols-1 md:grid-cols-2">
        <div className="">
          <ChatPanel 
            project={currentProject}
            onFileChange={handleAIFileChange}
            onProjectUpdate={handleProjectChange}
            editorState={editorState}
          />
        </div>
        <div className="hidden md:block">
          <LeftTabbedPanel 
            project={currentProject}
            onProjectChange={handleProjectChange}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onFileChange={handleFileChange}
            onEditorStateChange={handleEditorStateChange}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Mobile view */}
      <div className="md:hidden h-full">
        <ChatPanel 
          project={currentProject}
          onFileChange={handleAIFileChange}
          onProjectUpdate={handleProjectChange}
          editorState={editorState}
        />
      </div>
      
      {/* Desktop view */}
      <div className="hidden md:block h-full">
        <PanelGroup
          direction="horizontal"
          onLayout={handleLayout}
          className="h-full"
        >
          <Panel 
            defaultSize={defaultLayout[0]} 
            minSize={30} 
            maxSize={70}
            className="min-w-[320px]"
          >
            <ChatPanel 
              project={currentProject}
              onFileChange={handleAIFileChange}
              onProjectUpdate={handleProjectChange}
              editorState={editorState}
            />
          </Panel>
          
          <PanelResizeHandle className="w-px bg-border hover:bg-primary transition-colors" />
          
          <Panel 
            defaultSize={defaultLayout[1]} 
            minSize={30} 
            maxSize={70}
            className="min-w-[320px]"
          >
            <LeftTabbedPanel 
              project={currentProject}
              onProjectChange={handleProjectChange}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onFileChange={handleFileChange}
              onEditorStateChange={handleEditorStateChange}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}