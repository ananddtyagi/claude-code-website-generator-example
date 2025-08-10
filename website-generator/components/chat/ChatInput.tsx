"use client"

import { useState } from 'react'
import { Button } from '../ui/button'
import { Send, Square } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onStopStreaming?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSendMessage,
  onStopStreaming,
  isLoading = false,
  disabled = false,
  placeholder = "Ask me anything about your project..."
}: ChatInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled && !isLoading) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleStop = () => {
    if (onStopStreaming) {
      onStopStreaming()
    }
  }

  return (
    <div className="border-t bg-background p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full resize-none rounded-lg border border-input bg-background px-3 py-2",
              "min-h-[2.5rem] max-h-32 placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
            )}
            rows={1}
            style={{
              height: 'auto',
              minHeight: '2.5rem'
            }}
            ref={(textarea) => {
              if (textarea) {
                textarea.style.height = 'auto'
                textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`
              }
            }}
          />
          
          {/* Character count indicator */}
          {message.length > 0 && (
            <div className="absolute right-2 bottom-1 text-xs text-muted-foreground">
              {message.length}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {isLoading ? (
            <Button
              type="button"
              onClick={handleStop}
              size="sm"
              variant="outline"
              className="px-3"
            >
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!message.trim() || disabled}
              size="sm"
              className="px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </form>
      
      {/* Keyboard shortcut hint */}
      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
        <span>Press Enter to send, Shift+Enter for new line</span>
        {isLoading && (
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            AI is responding...
          </span>
        )}
      </div>
    </div>
  )
}