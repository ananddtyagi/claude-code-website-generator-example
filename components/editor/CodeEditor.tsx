"use client"

import { useRef } from 'react'
import { Editor as MonacoEditor } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { FileNode } from '@/lib/filesystem/types'
import { useTheme } from 'next-themes'

interface CodeEditorProps {
  file: FileNode | null
  onChange: (content: string) => void
  onSave?: () => void
  className?: string
}

export function CodeEditor({ file, onChange, onSave, className }: CodeEditorProps) {
  const { resolvedTheme } = useTheme()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const getLanguage = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop()
    switch (ext) {
      case 'ts': return 'typescript'
      case 'tsx': return 'typescript'
      case 'js': return 'javascript'
      case 'jsx': return 'javascript'
      case 'json': return 'json'
      case 'css': return 'css'
      case 'scss': return 'scss'
      case 'less': return 'less'
      case 'html': return 'html'
      case 'xml': return 'xml'
      case 'md': return 'markdown'
      case 'yaml': case 'yml': return 'yaml'
      case 'toml': return 'toml'
      case 'sql': return 'sql'
      case 'py': return 'python'
      case 'sh': return 'shell'
      default: return 'plaintext'
    }
  }

  const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    editorRef.current = editorInstance

    // Add save keyboard shortcut
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) {
        onSave()
      }
    })

    // Configure Monaco for better TypeScript experience
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types']
    })

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      allowJs: true
    })
  }

  if (!file) {
    return (
      <div className={`h-full flex items-center justify-center text-muted-foreground ${className}`}>
        <div className="text-center">
          <p className="text-sm">No file selected</p>
          <p className="text-xs mt-1">Select a file from the navigator to start editing</p>
        </div>
      </div>
    )
  }

  if (file.binary) {
    return (
      <div className={`h-full flex items-center justify-center text-muted-foreground ${className}`}>
        <div className="text-center">
          <p className="text-sm">Binary file</p>
          <p className="text-xs mt-1">{file.name}</p>
          <p className="text-xs text-muted-foreground">Cannot be edited in text mode</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <MonacoEditor
        height="100%"
        language={getLanguage(file.name)}
        value={file.content}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineHeight: 20,
          fontFamily: 'SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace',
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true
          },
          suggest: {
            showKeywords: true,
            showSnippets: true
          },
          quickSuggestions: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: false
        }}
      />
    </div>
  )
}