"use client"

import { useEffect, useRef } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatMessage as ChatMessageType } from '../../lib/ai/types'
import { cn } from '../../lib/utils'

interface ChatHistoryProps {
  messages: ChatMessageType[]
  isLoading?: boolean
  className?: string
  autoScroll?: boolean
}

export function ChatHistory({ 
  messages, 
  isLoading = false, 
  className,
  autoScroll = true 
}: ChatHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [messages.length, autoScroll])

  // Scroll to bottom when loading state changes
  useEffect(() => {
    if (isLoading && autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [isLoading, autoScroll])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className={cn(
        "flex-1 flex items-center justify-center p-8",
        className
      )}>
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium">Start a conversation</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ask me anything about your project. I can help you create, edit, and improve your code.
            </p>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Try asking:</p>
            <ul className="space-y-1">
              <li>&ldquo;Create a new React component&rdquo;</li>
              <li>&ldquo;Add a dark mode toggle&rdquo;</li>
              <li>&ldquo;Help me improve the UI design&rdquo;</li>
              <li>&ldquo;Review my code for best practices&rdquo;</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={scrollRef}
      className={cn(
        "flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
        className
      )}
    >
      <div className="space-y-1">
        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message}
            isStreaming={message.isStreaming}
          />
        ))}
        
        {isLoading && (
          <div className="flex justify-start p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}