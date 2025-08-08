"use client"

import { ChatMessage as ChatMessageType } from '../../lib/ai/types'
import { CodeBlock } from './CodeBlock'
import { cn } from '../../lib/utils'
import { Bot, User } from 'lucide-react'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  // Parse code blocks from message content
  const parseContent = (content: string) => {
    const parts = []
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    let lastIndex = 0
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = content.slice(lastIndex, match.index).trim()
        if (textContent) {
          parts.push({ type: 'text', content: textContent })
        }
      }

      // Add code block
      const language = match[1] || 'text'
      const code = match[2] || ''
      parts.push({ type: 'code', language, content: code })

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const textContent = content.slice(lastIndex).trim()
      if (textContent) {
        parts.push({ type: 'text', content: textContent })
      }
    }

    return parts.length > 0 ? parts : [{ type: 'text', content }]
  }

  const contentParts = parseContent(message.content)

  if (isSystem) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex gap-3 p-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground ml-12"
            : "bg-muted text-foreground mr-12"
        )}
      >
        <div className="space-y-2">
          {contentParts.map((part, index) => {
            if (part.type === 'code') {
              return (
                <CodeBlock
                  key={index}
                  code={part.content}
                  language={part.language}
                />
              )
            }

            return (
              <div key={index} className="whitespace-pre-wrap">
                {part.content}
                {isStreaming && index === contentParts.length - 1 && (
                  <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                )}
              </div>
            )
          })}
        </div>

        <div className={cn(
          "text-xs mt-2 opacity-60",
          isUser ? "text-right" : "text-left"
        )}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
  )
}