"use client"

import { ProjectContext, ChatMessage, StreamingResponse, ChangePlan, AIConfiguration } from './types'

// Client-side AI service that communicates with a server endpoint
export class ClientAIService {
  private config: AIConfiguration
  private sessionId?: string

  constructor(config: AIConfiguration) {
    this.config = config
  }

  async* streamChat(message: string, context: ProjectContext): AsyncGenerator<StreamingResponse> {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context,
          config: this.config,
          sessionId: this.sessionId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          
          // Split by lines and process each complete JSON object
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line) as StreamingResponse
                
                if (data.type === 'message' && data.metadata?.sessionId) {
                  this.sessionId = data.metadata.sessionId
                }
                
                yield data
              } catch (parseError) {
                console.error('Error parsing streaming response:', parseError)
                yield {
                  type: 'error',
                  content: 'Error parsing AI response',
                  error: 'Invalid JSON in streaming response'
                }
              }
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer) as StreamingResponse
            yield data
          } catch (parseError) {
            console.error('Error parsing final buffer:', parseError)
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      yield {
        type: 'error',
        content: 'Failed to communicate with AI service',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // Mock implementation for development/testing
  async* mockStreamChat(message: string, context: ProjectContext): AsyncGenerator<StreamingResponse> {
    yield {
      type: 'message',
      content: 'This is a mock AI response. I understand you want me to help with your Next.js project. '
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    yield {
      type: 'message',
      content: 'Let me analyze your current project structure and provide some suggestions...'
    }

    await new Promise(resolve => setTimeout(resolve, 1000))

    // Create a mock plan
    const mockPlan: ChangePlan = {
      id: crypto.randomUUID(),
      description: 'Create a sample component to demonstrate the chat functionality',
      changes: [
        {
          type: 'create',
          path: '/components/examples/SampleComponent.tsx',
          content: `"use client"

export function SampleComponent() {
  return (
    <div className="p-4 bg-background border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Sample Component</h3>
      <p className="text-muted-foreground">
        This is a sample component created by the AI assistant.
      </p>
    </div>
  )
}`,
          description: 'Create a simple example component'
        }
      ],
      reasoning: 'This creates a basic component to demonstrate the AI file creation capabilities.',
      timestamp: Date.now()
    }

    yield {
      type: 'plan',
      content: 'I\'ve created a plan to add a sample component to your project.',
      plan: mockPlan
    }

    yield {
      type: 'complete',
      content: 'Mock conversation complete',
      metadata: {
        cost: 0.001,
        duration: 2000,
        sessionId: 'mock-session-' + Date.now()
      }
    }
  }

  getSessionId(): string | undefined {
    return this.sessionId
  }

  clearSession(): void {
    this.sessionId = undefined
  }
}