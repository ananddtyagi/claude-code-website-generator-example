import { NextRequest, NextResponse } from 'next/server'
import { query } from '@anthropic-ai/claude-code'
import { ProjectContext, AIConfiguration } from '../../../../lib/ai/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Ensure proper Node.js environment
if (typeof process === 'undefined') {
  throw new Error('Claude Code SDK requires Node.js environment')
}

interface ChatRequest {
  message: string
  context: ProjectContext
  config: AIConfiguration
  sessionId?: string
}

function generateSystemPrompt(context: ProjectContext): string {
  const openFileContents = getOpenFileContents(context)
  
  return `You are an expert full-stack developer helping with a Next.js website generator project named "${context.name}".

CONTEXT:
- You're working with a virtual filesystem that supports creating, editing, and deleting files
- The project uses Next.js 15 with TypeScript, React 19, Tailwind CSS, and Monaco Editor
- Current file structure: ${summarizeFileStructure(context.structure)}
- Currently open files: ${context.openFiles.join(', ') || 'none'}
- Current file being edited: ${context.currentFile || 'none'}

CURRENT FILE CONTENTS:
${openFileContents}

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

function getOpenFileContents(context: ProjectContext): string {
  if (!context.openFiles.length) {
    return 'No files are currently open in the editor.'
  }
  
  const contents: string[] = []
  
  for (const filePath of context.openFiles) {
    // The context.structure should be a project with nodes Map
    // We need to find the file by iterating through all nodes and matching the path
    const fileNode = findFileNodeByPath(context.structure, filePath)
    if (fileNode && fileNode.type === 'file') {
      const isCurrentFile = filePath === context.currentFile
      const marker = isCurrentFile ? ' (CURRENTLY ACTIVE)' : ''
      
      contents.push(`
--- ${filePath}${marker} ---
${fileNode.content || '(empty file)'}
`)
    }
  }
  
  return contents.join('\n')
}

function findFileNodeByPath(rootNode: unknown, targetPath: string): unknown {
  if (!rootNode || typeof rootNode !== 'object') return null
  
  const node = rootNode as Record<string, unknown>
  
  // Handle case where rootNode is the filesystem structure with a nodes map
  if (node.nodes && typeof node.nodes === 'object') {
    // If it's a Map, convert to array
    const nodesArray = node.nodes instanceof Map ? 
      Array.from(node.nodes.values()) : 
      Object.values(node.nodes as Record<string, unknown>)
    for (const childNode of nodesArray) {
      if (childNode && typeof childNode === 'object') {
        const child = childNode as Record<string, unknown>
        if (child.path === targetPath && child.type === 'file') {
          return child
        }
      }
    }
    return null
  }
  
  // Handle direct node traversal (recursive tree structure)
  if (node.path === targetPath && node.type === 'file') {
    return node
  }
  
  if (node.children && node.type === 'directory') {
    const children = Object.values(node.children as Record<string, unknown>)
    for (const child of children) {
      const result = findFileNodeByPath(child, targetPath)
      if (result) return result
    }
  }
  
  return null
}

function summarizeFileStructure(node: unknown, prefix = '', maxDepth = 3, currentDepth = 0): string {
  if (!node || typeof node !== 'object' || currentDepth >= maxDepth) return ''
  
  const nodeObj = node as { name?: string; type?: string; children?: Record<string, unknown> }
  if (!nodeObj.name) return ''
  
  let summary = prefix + nodeObj.name + (nodeObj.type === 'directory' ? '/' : '') + '\n'
  
  if (nodeObj.type === 'directory' && nodeObj.children && currentDepth < maxDepth - 1) {
    const sortedChildren = Object.values(nodeObj.children)
      .filter((child): child is { name: string; type: string } => 
        typeof child === 'object' && child !== null && 
        'name' in child && 'type' in child
      )
      .sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
      .slice(0, 10) // Limit to first 10 items per directory
    
    for (const child of sortedChildren) {
      summary += summarizeFileStructure(child, prefix + '  ', maxDepth, currentDepth + 1)
    }
    
    if (Object.keys(nodeObj.children).length > 10) {
      summary += prefix + '  ... and more files\n'
    }
  }
  
  return summary
}

export async function POST(request: NextRequest) {
  console.log('🚀 AI Chat API called')
  
  try {
    const body: ChatRequest = await request.json()
    console.log('📝 Request body:', JSON.stringify(body, null, 2))
    
    const { message, context, config, sessionId } = body

    // Validate required fields
    if (!message || !context) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: message and context' },
        { status: 400 }
      )
    }

    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.log('❌ No API key found in environment')
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }
    console.log('✅ API key found:', apiKey.substring(0, 20) + '...')

    // Set up streaming response
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        // Generate system prompt
        const systemPrompt = generateSystemPrompt(context)

        // Start AI query
        try {
          console.log('🤖 Starting Claude Code SDK query...')
          console.log('📋 System prompt length:', systemPrompt.length)
          console.log('💬 User message:', message.substring(0, 100) + '...')
          
          let fullResponse = ''

          const queryOptions = {
            appendSystemPrompt: systemPrompt,
            maxTurns: config.maxTurns || 5,
            allowedTools: ["Read", "Write", "Edit", "Glob", "Grep", "WebSearch"],
            ...(sessionId && { resumeSessionId: sessionId })
          }
          
          console.log('⚙️ Query options:', JSON.stringify(queryOptions, null, 2))

          for await (const response of query({
            prompt: message,
            options: queryOptions
          })) {
            
            if (response.type === 'system' && response.subtype === 'init') {
              const data = {
                type: 'message',
                content: '',
                metadata: { sessionId: response.session_id }
              }
              controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
            }
            
            if (response.type === 'assistant') {
              // Handle streaming assistant message
              const content = response.message.content
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'text') {
                    fullResponse += block.text
                    const data = {
                      type: 'message',
                      content: block.text
                    }
                    controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
                  }
                }
              }
            }
            
            if (response.type === 'result') {
              const data = {
                type: 'complete',
                content: response.subtype === 'success' ? response.result : `Operation ${response.subtype}`,
                metadata: {
                  cost: response.total_cost_usd,
                  duration: response.duration_ms,
                  sessionId: response.session_id
                }
              }
              controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
              
              // Try to extract a plan from the full response
              const plan = extractPlanFromResponse(fullResponse)
              if (plan) {
                const planData = {
                  type: 'plan',
                  content: 'Plan extracted from response',
                  plan
                }
                controller.enqueue(encoder.encode(JSON.stringify(planData) + '\n'))
              }
              
              controller.close()
              return
            }
          }
        } catch (error) {
          console.error('❌ AI query error:', error)
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
          console.error('Error details:', {
            message: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : typeof error,
            code: (error as any)?.code,
            signal: (error as any)?.signal,
            status: (error as any)?.status
          })
          
          const errorData = {
            type: 'error',
            content: 'Failed to communicate with AI service. Please check your API key and try again.',
            error: error instanceof Error ? error.message : String(error),
            details: {
              code: (error as any)?.code,
              signal: (error as any)?.signal
            }
          }
          controller.enqueue(encoder.encode(JSON.stringify(errorData) + '\n'))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface ExtractedPlan {
  id: string
  description: string
  changes: Array<{
    type: 'create' | 'update' | 'delete'
    path: string
    content?: string
  }>
  reasoning?: string
  timestamp: number
}

function extractPlanFromResponse(content: string): ExtractedPlan | null {
  try {
    // Look for JSON-like structures in the response
    const jsonRegex = /\{[\s\S]*"changes"[\s\S]*\}/g
    const matches = content.match(jsonRegex)
    
    if (!matches) return parseTextualPlan(content)
    
    for (const match of matches) {
      try {
        const parsed = JSON.parse(match)
        if (parsed.changes && Array.isArray(parsed.changes)) {
          return {
            id: crypto.randomUUID(),
            description: parsed.description || 'AI-generated plan',
            changes: parsed.changes,
            reasoning: parsed.reasoning,
            timestamp: Date.now()
          }
        }
      } catch {
        continue
      }
    }
    
    return parseTextualPlan(content)
  } catch (error) {
    console.error('Error extracting plan:', error)
    return null
  }
}

function parseTextualPlan(content: string): ExtractedPlan | null {
  const changes: Array<{ type: 'create' | 'update' | 'delete'; path: string; content?: string }> = []
  const lines = content.split('\n')
  
  let currentChange: { type?: 'create' | 'update' | 'delete'; path?: string; content?: string } = {}
  let inCodeBlock = false
  let codeContent: string[] = []
  
  for (const line of lines) {
    // Detect file operations
    const createMatch = line.match(/(?:create|add|new)\s+(?:file\s+)?([^\s]+\.(tsx?|jsx?|css|json|md))/i)
    const updateMatch = line.match(/(?:update|modify|edit)\s+(?:file\s+)?([^\s]+\.(tsx?|jsx?|css|json|md))/i)
    const deleteMatch = line.match(/(?:delete|remove)\s+(?:file\s+)?([^\s]+\.(tsx?|jsx?|css|json|md))/i)
    
    if (createMatch) {
      if (currentChange.type && currentChange.path) {
        changes.push(currentChange as { type: 'create' | 'update' | 'delete'; path: string; content?: string })
      }
      currentChange = { type: 'create', path: createMatch[1] }
    } else if (updateMatch) {
      if (currentChange.type && currentChange.path) {
        changes.push(currentChange as { type: 'create' | 'update' | 'delete'; path: string; content?: string })
      }
      currentChange = { type: 'update', path: updateMatch[1] }
    } else if (deleteMatch) {
      if (currentChange.type && currentChange.path) {
        changes.push(currentChange as { type: 'create' | 'update' | 'delete'; path: string; content?: string })
      }
      currentChange = { type: 'delete', path: deleteMatch[1] }
      if (currentChange.path) {
        changes.push(currentChange as { type: 'create' | 'update' | 'delete'; path: string; content?: string })
      }
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
  if (currentChange.type && currentChange.path) {
    if (codeContent.length > 0) {
      currentChange.content = codeContent.join('\n')
    }
    changes.push(currentChange as { type: 'create' | 'update' | 'delete'; path: string; content?: string })
  }
  
  if (changes.length === 0) return null
  
  // Filter to valid paths
  const validChanges = changes.filter(change => {
    const allowedDirs = ['/app', '/components', '/public', '/styles', '/lib']
    return allowedDirs.some(dir => change.path.startsWith(dir)) && 
           !change.path.includes('..') && 
           !change.path.includes('//') &&
           change.path.length > 0 &&
           change.path.length < 500
  })
  
  return validChanges.length > 0 ? {
    id: crypto.randomUUID(),
    description: 'Extracted plan from AI response',
    changes: validChanges,
    timestamp: Date.now()
  } : null
}