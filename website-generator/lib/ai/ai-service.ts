import { query } from '@anthropic-ai/claude-code'
import { FSNode, FileNode, DirectoryNode } from '../filesystem/types'
import { 
  ChatMessage, 
  ProjectContext, 
  AIConfiguration, 
  StreamingResponse, 
  ChangePlan,
  FileChange 
} from './types'
import { 
  ChangePlanSchema, 
  validateFilePath, 
  sanitizeContent, 
  validateFileSize 
} from './schemas'

export class AIService {
  private config: AIConfiguration
  private sessionId?: string

  constructor(config: AIConfiguration) {
    this.config = config
  }

  private generateSystemPrompt(context: ProjectContext): string {
    return `You are an expert full-stack developer helping with a Next.js website generator project named "${context.name}".

CONTEXT:
- You're working with a virtual filesystem that supports creating, editing, and deleting files
- The project uses Next.js 15 with TypeScript, React 19, Tailwind CSS, and Monaco Editor
- Current file structure: ${this.summarizeFileStructure(context.structure)}
- Currently open files: ${context.openFiles.join(', ') || 'none'}
- Current file being edited: ${context.currentFile || 'none'}

CAPABILITIES:
- Analyze the existing codebase and project structure
- Create new files and directories
- Update existing file contents
- Delete files when necessary
- Provide architectural guidance and best practices

CONSTRAINTS:
- Only work with files in these directories: /app, /components, /public, /styles, /lib
- Follow Next.js 15 App Router conventions
- Use TypeScript for all code files
- Follow the existing code patterns and component structure
- Maintain consistency with Tailwind CSS styling
- Keep files under 5MB in size

RESPONSE FORMAT:
When making file changes, always propose a structured plan with:
1. Clear description of what you're doing
2. List of specific file changes (create/update/delete)
3. Brief reasoning for the changes

Be concise but thorough. Focus on practical implementation details.`
  }

  private summarizeFileStructure(node: FSNode, prefix = '', maxDepth = 3, currentDepth = 0): string {
    if (currentDepth >= maxDepth) return ''
    
    let summary = prefix + node.name + (node.type === 'directory' ? '/' : '') + '\n'
    
    if (node.type === 'directory' && node.children && currentDepth < maxDepth - 1) {
      const sortedChildren = Object.values(node.children)
        .sort((a, b) => {
          // Directories first, then files
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        })
        .slice(0, 10) // Limit to first 10 items per directory
      
      for (const child of sortedChildren) {
        summary += this.summarizeFileStructure(child, prefix + '  ', maxDepth, currentDepth + 1)
      }
      
      if (Object.keys(node.children).length > 10) {
        summary += prefix + '  ... and more files\n'
      }
    }
    
    return summary
  }

  private extractPlanFromResponse(content: string): ChangePlan | null {
    try {
      // Look for JSON-like structures in the response
      const jsonRegex = /\{[\s\S]*"changes"[\s\S]*\}/g
      const matches = content.match(jsonRegex)
      
      if (!matches) return null
      
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match)
          const validated = ChangePlanSchema.parse(parsed)
          return validated
        } catch {
          continue
        }
      }
      
      // If no JSON found, try to extract file operations from text
      return this.parseTextualPlan(content)
    } catch (error) {
      console.error('Error extracting plan:', error)
      return null
    }
  }

  private parseTextualPlan(content: string): ChangePlan | null {
    const changes: FileChange[] = []
    const lines = content.split('\n')
    
    let currentChange: Partial<FileChange> = {}
    let inCodeBlock = false
    let codeContent: string[] = []
    
    for (const line of lines) {
      // Detect file operations
      const createMatch = line.match(/(?:create|add|new)\s+(?:file\s+)?([^\s]+\.(tsx?|jsx?|css|json|md))/i)
      const updateMatch = line.match(/(?:update|modify|edit)\s+(?:file\s+)?([^\s]+\.(tsx?|jsx?|css|json|md))/i)
      const deleteMatch = line.match(/(?:delete|remove)\s+(?:file\s+)?([^\s]+\.(tsx?|jsx?|css|json|md))/i)
      
      if (createMatch) {
        if (currentChange.type) {
          changes.push(currentChange as FileChange)
        }
        currentChange = { type: 'create', path: createMatch[1] }
      } else if (updateMatch) {
        if (currentChange.type) {
          changes.push(currentChange as FileChange)
        }
        currentChange = { type: 'update', path: updateMatch[1] }
      } else if (deleteMatch) {
        if (currentChange.type) {
          changes.push(currentChange as FileChange)
        }
        currentChange = { type: 'delete', path: deleteMatch[1] }
        changes.push(currentChange as FileChange)
        currentChange = {}
      }
      
      // Detect code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock && currentChange.type) {
          currentChange.content = codeContent.join('\n')
          codeContent = []
        }
        inCodeBlock = !inCodeBlock
      } else if (inCodeBlock) {
        codeContent.push(line)
      }
    }
    
    // Add final change
    if (currentChange.type) {
      if (codeContent.length > 0) {
        currentChange.content = codeContent.join('\n')
      }
      changes.push(currentChange as FileChange)
    }
    
    if (changes.length === 0) return null
    
    return {
      id: crypto.randomUUID(),
      description: 'Extracted plan from AI response',
      changes: changes.filter(change => validateFilePath(change.path)),
      timestamp: Date.now()
    }
  }

  async* streamChat(
    message: string, 
    context: ProjectContext
  ): AsyncGenerator<StreamingResponse> {
    try {
      const systemPrompt = this.generateSystemPrompt(context)
      
      // Set environment variable for API key
      if (typeof window === 'undefined') {
        process.env.ANTHROPIC_API_KEY = this.config.apiKey
      }
      
      let fullResponse = ''
      
      for await (const response of query({
        prompt: message,
        options: {
          systemPrompt,
          maxTurns: this.config.maxTurns || 5,
          allowedTools: ["Read", "Write", "Edit", "Glob", "Grep"],
          temperature: this.config.temperature || 0.1
        }
      })) {
        
        if (response.type === 'system' && response.subtype === 'init') {
          this.sessionId = response.session_id
          yield {
            type: 'message',
            content: 'Initializing AI assistant...',
            metadata: { sessionId: response.session_id }
          }
        }
        
        if (response.type === 'assistant') {
          // Handle streaming assistant message
          const content = response.message.content
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text') {
                fullResponse += block.text
                yield {
                  type: 'message',
                  content: block.text
                }
              }
            }
          }
        }
        
        if (response.type === 'result') {
          yield {
            type: 'complete',
            content: response.result,
            metadata: {
              cost: response.total_cost_usd,
              duration: response.duration_ms,
              sessionId: this.sessionId
            }
          }
          
          // Try to extract a plan from the full response
          const plan = this.extractPlanFromResponse(fullResponse)
          if (plan) {
            yield {
              type: 'plan',
              content: 'Plan extracted from response',
              plan
            }
          }
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        content: 'Failed to communicate with AI service',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async continueConversation(
    message: string, 
    context: ProjectContext
  ): Promise<AsyncGenerator<StreamingResponse>> {
    if (!this.sessionId) {
      throw new Error('No active session. Start a new conversation first.')
    }
    
    return this.streamChat(message, context)
  }

  validatePlan(plan: ChangePlan): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    try {
      ChangePlanSchema.parse(plan)
    } catch (error) {
      errors.push('Invalid plan structure')
    }
    
    // Additional validation
    for (const change of plan.changes) {
      if (!validateFilePath(change.path)) {
        errors.push(`Invalid file path: ${change.path}`)
      }
      
      if (change.content && !validateFileSize(change.content)) {
        errors.push(`File too large: ${change.path}`)
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  sanitizePlan(plan: ChangePlan): ChangePlan {
    return {
      ...plan,
      changes: plan.changes.map(change => ({
        ...change,
        content: change.content ? sanitizeContent(change.content) : undefined
      }))
    }
  }
}