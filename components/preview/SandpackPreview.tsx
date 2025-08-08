"use client"

import { useEffect, useState, useMemo } from 'react'
import { Sandpack } from '@codesandbox/sandpack-react'
import { Project, isFile } from '@/lib/filesystem/types'
import { useTheme } from 'next-themes'

interface SandpackPreviewProps {
  project: Project | null
  className?: string
}

export function SandpackPreview({ project, className }: SandpackPreviewProps) {
  const { resolvedTheme } = useTheme()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Convert our filesystem to Sandpack files format
  const sandpackFiles = useMemo(() => {
    if (!project) return {}

    const files: Record<string, string> = {}
    
    // Convert all file nodes to Sandpack file format
    for (const node of project.nodes.values()) {
      if (isFile(node) && !node.binary) {
        // Use the path directly, Sandpack expects paths like '/app/page.tsx'
        files[node.path] = node.content
      }
    }

    return files
  }, [project])

  // Default Next.js dependencies for the preview
  const customSetup = {
    dependencies: {
      'react': '^19.1.0',
      'react-dom': '^19.1.0',
      'next': '^15.4.6',
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      'typescript': '^5.0.0'
    },
    devDependencies: {
      '@types/node': '^20.0.0'
    }
  }

  if (!isClient) {
    return (
      <div className={`h-full flex items-center justify-center bg-muted/30 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (!project || Object.keys(sandpackFiles).length === 0) {
    return (
      <div className={`h-full flex items-center justify-center bg-muted/30 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No project loaded</p>
          <p className="text-xs mt-1 text-muted-foreground">Open a project to see the preview</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full ${className}`}>
      <div 
        className="h-full [&_.sp-wrapper]:h-full [&_.sp-layout]:h-full [&_.sp-preview-container]:h-full"
        style={{ '--sp-border-radius': '0' } as React.CSSProperties}
      >
        <Sandpack
          template="nextjs"
          files={sandpackFiles}
          customSetup={customSetup}
          theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
          options={{
            showNavigator: false,
            showTabs: false,
            showLineNumbers: false,
            showInlineErrors: true,
            showConsole: false,
            editorHeight: '100%',
            layout: 'preview',
            autorun: true,
            autoReload: true,
          }}
        />
      </div>
    </div>
  )
}