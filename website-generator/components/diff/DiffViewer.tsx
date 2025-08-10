"use client"

import { useEffect, useRef } from 'react'
import { editor } from 'monaco-editor'
import { loader } from '@monaco-editor/react'
import { useTheme } from 'next-themes'
import { FileChange } from '../../lib/ai/types'
import { Button } from '../ui/button'
import { X } from 'lucide-react'

interface DiffViewerProps {
  change: FileChange
  originalContent?: string
  onClose: () => void
  onApprove?: (change: FileChange) => void
  onReject?: () => void
}

export function DiffViewer({ 
  change, 
  originalContent = '', 
  onClose, 
  onApprove, 
  onReject 
}: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (!containerRef.current) return

    const initializeEditor = async () => {
      const monaco = await loader.init()

      // Configure the editor theme based on current theme
      const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'

      if (editorRef.current) {
        editorRef.current.dispose()
      }

      const diffEditor = monaco.editor.createDiffEditor(containerRef.current!, {
        theme: monacoTheme,
        readOnly: true,
        enableSplitViewResizing: true,
        renderSideBySide: true,
        ignoreTrimWhitespace: false,
        renderOverviewRuler: true,
        scrollBeyondLastLine: false,
        minimap: {
          enabled: true
        },
        wordWrap: 'on',
        lineNumbers: 'on',
        folding: true,
        automaticLayout: true
      })

      // Determine language from file extension
      const language = getLanguageFromPath(change.path)

      // Create models for original and modified content
      const originalModel = monaco.editor.createModel(
        originalContent,
        language,
        monaco.Uri.file(`original${change.path}`)
      )

      const modifiedModel = monaco.editor.createModel(
        change.content || '',
        language,
        monaco.Uri.file(`modified${change.path}`)
      )

      // Set the diff models
      diffEditor.setModel({
        original: originalModel,
        modified: modifiedModel
      })

      editorRef.current = diffEditor

      // Focus the editor
      diffEditor.focus()
    }

    initializeEditor()

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose()
        editorRef.current = null
      }
    }
  }, [change.path, change.content, originalContent, theme])

  const getChangeTypeLabel = (type: FileChange['type']) => {
    switch (type) {
      case 'create':
        return 'Creating'
      case 'update':
        return 'Updating'
      case 'delete':
        return 'Deleting'
      default:
        return 'Changing'
    }
  }

  const getChangeTypeColor = (type: FileChange['type']) => {
    switch (type) {
      case 'create':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'update':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'delete':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-muted-foreground bg-muted border-muted'
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getChangeTypeColor(change.type)}`}>
              {getChangeTypeLabel(change.type)}
            </div>
            <div>
              <h3 className="font-semibold">{change.path}</h3>
              {change.description && (
                <p className="text-sm text-muted-foreground">{change.description}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Diff Editor */}
        <div className="flex-1 min-h-0">
          {change.type === 'delete' ? (
            <div className="p-4 h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="text-red-500 text-6xl">🗑️</div>
                <div>
                  <h3 className="text-lg font-semibold">Delete File</h3>
                  <p className="text-muted-foreground">
                    This file will be permanently deleted.
                  </p>
                </div>
              </div>
            </div>
          ) : change.type === 'create' ? (
            <div className="h-full border-l-4 border-green-500">
              <div className="p-2 bg-green-50 text-green-700 text-sm font-medium">
                New file content:
              </div>
              <div ref={containerRef} className="h-full" />
            </div>
          ) : (
            <div ref={containerRef} className="h-full" />
          )}
        </div>

        {/* Actions */}
        <div className="border-t p-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {change.type === 'create' && 'This will create a new file'}
            {change.type === 'update' && 'Green lines will be added, red lines will be removed'}
            {change.type === 'delete' && 'This file will be completely removed'}
          </div>
          
          <div className="flex items-center gap-2">
            {onReject && (
              <Button variant="outline" onClick={onReject}>
                Reject
              </Button>
            )}
            <Button onClick={onClose}>
              Close
            </Button>
            {onApprove && (
              <Button onClick={() => onApprove(change)}>
                Apply This Change
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'tsx':
    case 'jsx':
      return 'typescript'
    case 'ts':
      return 'typescript'
    case 'js':
      return 'javascript'
    case 'css':
      return 'css'
    case 'json':
      return 'json'
    case 'md':
      return 'markdown'
    case 'html':
      return 'html'
    case 'yml':
    case 'yaml':
      return 'yaml'
    case 'xml':
      return 'xml'
    case 'py':
      return 'python'
    case 'go':
      return 'go'
    case 'rs':
      return 'rust'
    case 'cpp':
    case 'cc':
    case 'cxx':
      return 'cpp'
    case 'c':
      return 'c'
    case 'java':
      return 'java'
    case 'sh':
    case 'bash':
      return 'shell'
    default:
      return 'plaintext'
  }
}