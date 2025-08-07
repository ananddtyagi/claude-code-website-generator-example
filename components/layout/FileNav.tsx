"use client"

import { FSNode, Project } from '../../lib/filesystem/types'
import { FileTree } from '../filesystem/FileTree'

interface FileNavProps {
  project: Project | null
  onProjectChange: (project: Project) => void
  onFileSelect: (node: FSNode) => void
  selectedFileId?: string
}

export function FileNav({ 
  project, 
  onProjectChange, 
  onFileSelect, 
  selectedFileId 
}: FileNavProps) {
  return (
    <div className="h-full bg-background" role="navigation" aria-label="File Navigator">
      <FileTree
        project={project}
        onProjectChange={onProjectChange}
        onFileSelect={onFileSelect}
        selectedFileId={selectedFileId}
      />
    </div>
  )
}