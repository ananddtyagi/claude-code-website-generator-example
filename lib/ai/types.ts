import { FSNode } from '../filesystem/types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isStreaming?: boolean
}

export interface FileChange {
  type: 'create' | 'update' | 'delete'
  path: string
  content?: string
  description?: string
}

export interface ChangePlan {
  id: string
  description: string
  changes: FileChange[]
  reasoning?: string
  timestamp: number
}

export interface ProjectContext {
  name: string
  structure: FSNode
  openFiles: string[]
  currentFile?: string
}

export interface AIConfiguration {
  apiKey: string
  model?: string
  temperature?: number
  maxTurns?: number
}

export interface StreamingResponse {
  type: 'message' | 'plan' | 'error' | 'complete'
  content: string
  plan?: ChangePlan
  error?: string
  metadata?: {
    cost?: number
    duration?: number
    sessionId?: string
  }
}

export interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  currentPlan?: ChangePlan
  error?: string
  sessionId?: string
}