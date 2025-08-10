"use client"

import { SandpackPreview } from '../preview/SandpackPreview'
import { Project } from '@/lib/filesystem/types'

interface PreviewProps {
  project?: Project | null
  className?: string
}

export function Preview({ project, className }: PreviewProps) {
  return (
    <div className={`h-full ${className}`} role="region" aria-label="Preview">
      <SandpackPreview project={project || null} className="h-full" />
    </div>
  )
}