"use client"

import { useState, useCallback, useEffect } from 'react'
import { ChatHistory } from '../chat/ChatHistory'
import { ChatInput } from '../chat/ChatInput'
import { DiffViewer } from '../diff/DiffViewer'
import { ClientAIService } from '../../lib/ai/client-ai-service'
import { 
  ChatMessage, 
  ChatState, 
  ChangePlan, 
  FileChange, 
  ProjectContext,
  AIConfiguration
} from '../../lib/ai/types'
import { FileSystemOperations } from '../../lib/filesystem/operations'
import { Project, FSNode, isFile } from '../../lib/filesystem/types'
import { validateFilePath } from '../../lib/ai/schemas'
import { generateId } from '../../lib/utils/id'
import { Button } from '../ui/button'
import { Settings } from 'lucide-react'

interface ChatPanelProps {
  project?: Project | null
  onFileChange?: (path: string, content: string) => void
  onProjectUpdate?: (project: Project) => void
}

export function ChatPanel({ project, onFileChange, onProjectUpdate }: ChatPanelProps) {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false
  })
  
  const [showDiff, setShowDiff] = useState<{
    change: FileChange
    originalContent: string
  } | null>(null)
  
  const [aiService, setAiService] = useState<ClientAIService | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [useMockAI, setUseMockAI] = useState(false)

  // Initialize AI service
  useEffect(() => {
    const storedApiKey = localStorage.getItem('anthropic-api-key')
    if (storedApiKey) {
      setApiKey(storedApiKey)
      initializeAIService(storedApiKey)
    }
  }, [])

  const initializeAIService = (key: string) => {
    const config: AIConfiguration = {
      apiKey: key,
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.1,
      maxTurns: 5
    }
    
    setAiService(new ClientAIService(config))
    setShowSettings(false)
  }

  const handleSaveApiKey = () => {
    if (useMockAI || apiKey.trim()) {
      if (apiKey.trim()) {
        localStorage.setItem('anthropic-api-key', apiKey.trim())
      }
      initializeAIService(apiKey.trim() || 'mock-key')
    }
  }

  const buildProjectContext = useCallback((): ProjectContext | null => {
    if (!project) return null

    return {
      name: project.name,
      structure: Array.from(project.nodes.values()).find(node => 
        node.path === '/' && node.type === 'directory'
      ) as FSNode,
      openFiles: [], // TODO: Get from editor state
      currentFile: undefined // TODO: Get from editor state
    }
  }, [project])

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: Date.now()
    }
    
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }))
    
    return newMessage
  }

  const updateLastMessage = (content: string, isStreaming = true) => {
    setChatState(prev => {
      const messages = [...prev.messages]
      const lastMessage = messages[messages.length - 1]
      
      if (lastMessage && lastMessage.role === 'assistant') {
        messages[messages.length - 1] = {
          ...lastMessage,
          content: lastMessage.content + content,
          isStreaming
        }
      } else {
        // Create new assistant message
        messages.push({
          id: generateId(),
          role: 'assistant',
          content,
          timestamp: Date.now(),
          isStreaming
        })
      }
      
      return { ...prev, messages }
    })
  }

  const handleSendMessage = useCallback(async (message: string) => {
    if (!aiService) {
      setShowSettings(true)
      return
    }

    const context = buildProjectContext()
    if (!context) {
      addMessage({
        role: 'system',
        content: 'Please load a project first to start chatting with the AI assistant.'
      })
      return
    }

    // Add user message
    addMessage({
      role: 'user',
      content: message
    })

    setChatState(prev => ({ ...prev, isLoading: true }))

    try {
      // Use the real AI implementation or mock based on user preference
      const responseStream = useMockAI 
        ? aiService.mockStreamChat(message, context)
        : aiService.streamChat(message, context)
      
      for await (const response of responseStream) {
        switch (response.type) {
          case 'message':
            updateLastMessage(response.content)
            break
            
          case 'plan':
            if (response.plan && project && onProjectUpdate) {
              // Auto-apply the plan immediately
              handleApplyPlan(response.plan)
            }
            break
            
          case 'complete':
            updateLastMessage('', false) // Stop streaming
            setChatState(prev => ({ ...prev, isLoading: false }))
            break
            
          case 'error':
            addMessage({
              role: 'system',
              content: `Error: ${response.error || 'Unknown error occurred'}`
            })
            setChatState(prev => ({ ...prev, isLoading: false }))
            break
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      addMessage({
        role: 'system',
        content: 'Failed to communicate with AI service. Please check your API key and try again.'
      })
      setChatState(prev => ({ ...prev, isLoading: false }))
    }
  }, [aiService, buildProjectContext, useMockAI])

  const handlePreviewChange = (change: FileChange) => {
    if (!project) return

    let originalContent = ''
    
    // Get original content if file exists
    const existingNode = Array.from(project.nodes.values()).find(node => 
      node.path === change.path
    )
    
    if (existingNode && isFile(existingNode)) {
      originalContent = existingNode.content
    }

    setShowDiff({
      change,
      originalContent
    })
  }

  const handleApplyPlan = async (plan: ChangePlan) => {
    if (!project || !onProjectUpdate) return

    try {
      const operations = new FileSystemOperations(project)
      let hasChanges = false

      for (const change of plan.changes) {
        // Validate the path
        if (!validateFilePath(change.path)) {
          console.warn(`Skipping invalid path: ${change.path}`)
          continue
        }

        try {
          switch (change.type) {
            case 'create':
              if (change.content !== undefined) {
                // Check if file already exists
                const existingNode = operations.getNodeByPath(change.path)
                if (existingNode && isFile(existingNode)) {
                  // File exists, update it instead
                  console.log(`File ${change.path} already exists, updating instead of creating`)
                  existingNode.content = change.content
                  existingNode.updatedAt = new Date()
                  hasChanges = true
                  
                  // Notify parent component of file change
                  if (onFileChange) {
                    onFileChange(change.path, change.content)
                  }
                } else {
                  // File doesn't exist, create it
                  try {
                    const pathParts = change.path.split('/')
                    const filename = pathParts.pop()
                    const parentPath = pathParts.join('/') || '/'
                    
                    if (filename) {
                      operations.createFile(parentPath, filename, change.content)
                      hasChanges = true
                    }
                  } catch (error) {
                    console.warn(`Failed to create file ${change.path}:`, error)
                    // Continue with other changes instead of failing completely
                  }
                }
              }
              break
              
            case 'update':
              try {
                const existingNode = operations.getNodeByPath(change.path)
                if (existingNode && isFile(existingNode) && change.content !== undefined) {
                  existingNode.content = change.content
                  existingNode.updatedAt = new Date()
                  hasChanges = true
                  
                  // Notify parent component of file change
                  if (onFileChange) {
                    onFileChange(change.path, change.content)
                  }
                } else {
                  console.warn(`Cannot update file ${change.path}: file not found or is not a file`)
                }
              } catch (error) {
                console.warn(`Failed to update file ${change.path}:`, error)
              }
              break
              
            case 'delete':
              try {
                const nodeToDelete = operations.getNodeByPath(change.path)
                if (nodeToDelete) {
                  operations.deleteNode(nodeToDelete.id)
                  hasChanges = true
                } else {
                  console.warn(`Cannot delete file ${change.path}: file not found`)
                }
              } catch (error) {
                console.warn(`Failed to delete file ${change.path}:`, error)
              }
              break
          }
        } catch (error) {
          console.error(`Failed to apply change to ${change.path}:`, error)
        }
      }

      if (hasChanges) {
        // Update project timestamp
        project.updatedAt = new Date()
        onProjectUpdate(project)
        
        // Success - changes applied automatically
      }

    } catch (error) {
      console.error('Failed to apply plan:', error)
      addMessage({
        role: 'system',
        content: 'Failed to apply some changes. Please check the console for details.'
      })
    } finally {
      // Cleanup done
    }
  }


  if (showSettings || !aiService) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold">AI Configuration</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your Anthropic API key to start using the AI assistant.
          </p>
        </div>
        
        <div className="flex-1 p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Anthropic API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Get your API key from the <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">Anthropic Console</a>
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useMockAI"
              checked={useMockAI}
              onChange={(e) => setUseMockAI(e.target.checked)}
              className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="useMockAI" className="text-sm text-muted-foreground">
              Use mock AI for testing (no API calls)
            </label>
          </div>
          
          <Button 
            onClick={handleSaveApiKey}
            disabled={!useMockAI && !apiKey.trim()}
            className="w-full"
          >
            {useMockAI ? 'Start Chatting (Mock)' : 'Save and Start Chatting'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="h-full flex flex-col bg-background" 
      role="region" 
      aria-label="Chat"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">AI Assistant</h3>
          <p className="text-sm text-muted-foreground">
            {project ? `Working on: ${project.name}` : 'No project loaded'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(true)}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Chat History */}
      <ChatHistory 
        messages={chatState.messages}
        isLoading={chatState.isLoading}
        className="flex-1 min-h-0"
      />

      {/* Auto-applying changes - no manual approval needed */}

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={chatState.isLoading}
        disabled={!project}
        placeholder={!project ? "Load a project to start chatting..." : "Ask me anything about your project..."}
      />

      {/* Diff Viewer Modal */}
      {showDiff && (
        <DiffViewer
          change={showDiff.change}
          originalContent={showDiff.originalContent}
          onClose={() => setShowDiff(null)}
          onApprove={(change) => {
            if (currentPlan) {
              handleApplyPlan({
                ...currentPlan,
                changes: [change]
              })
            }
            setShowDiff(null)
          }}
        />
      )}
    </div>
  )
}