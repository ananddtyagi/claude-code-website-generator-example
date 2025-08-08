"use client"

import { useState } from 'react'
import { Button } from '../ui/button'
import { Copy, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
}

export function CodeBlock({ code, language = 'text', className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }

  return (
    <div className={cn("relative group", className)}>
      <div className="flex items-center justify-between bg-muted/50 px-4 py-2 text-sm border-b">
        <span className="text-muted-foreground font-mono">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </Button>
      </div>
      <pre className={cn(
        "overflow-x-auto p-4 text-sm bg-muted/30",
        "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
      )}>
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  )
}