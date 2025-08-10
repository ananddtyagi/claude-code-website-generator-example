import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ProjectContext, AIConfiguration } from '../../../../../lib/ai/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ChatRequest {
  message: string
  context: ProjectContext
  config: AIConfiguration
  sessionId?: string
}

function generateSystemPrompt(context: ProjectContext): string {
  const openFileContents = getOpenFileContents(context)
  
  return `You are an expert full-stack developer agent for a Next.js website generator project named "${context.name}".

CONTEXT:
- You're working with a virtual filesystem that supports creating, editing, and deleting files
- The project uses Next.js 15 with TypeScript, React 19, Tailwind CSS, and Monaco Editor
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
- Follow existing code patterns and component structure
- Maintain consistency with Tailwind CSS styling
- Keep files under 5MB in size

IMPORTANT BEHAVIOR:
- Act autonomously and take direct actions
- Don't explain what you're going to do, just do it
- Focus on implementing rather than planning
- Be concise in your responses
- After making changes, briefly report what was done

FILE OPERATIONS:
Include a JSON block with your file operations, but keep your main response focused on what you're accomplishing:

\`\`\`json
{
  "changes": [
    {
      "type": "create|update|delete",
      "path": "/path/to/file.tsx",
      "content": "file content here (omit for delete)",
      "description": "Brief description of the change"
    }
  ]
}
\`\`\`

Remember: You are an autonomous agent. When asked to create something, immediately create it. Don't ask for permission or explain your plan in detail.`
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

export async function POST(request: NextRequest) {
  console.log('🚀 Direct AI Chat API called')
  
  try {
    const body: ChatRequest = await request.json()
    console.log('📝 Request received for message length:', body.message.length)
    
    const { message, context, config } = body

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
    console.log('✅ API key found')

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    })

    // Generate system prompt
    const systemPrompt = generateSystemPrompt(context)
    console.log('📋 Generated system prompt, length:', systemPrompt.length)

    // Set up streaming response
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('🤖 Starting Anthropic API call...')
          
          // Send initial message
          const initData = {
            type: 'message',
            content: '',
            metadata: { sessionId: 'direct-' + Date.now() }
          }
          controller.enqueue(encoder.encode(JSON.stringify(initData) + '\n'))

          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: message
              }
            ],
            stream: true
          })

          let fullResponse = ''
          
          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta') {
              if (chunk.delta.type === 'text_delta') {
                const text = chunk.delta.text
                fullResponse += text
                
                const data = {
                  type: 'message',
                  content: text
                }
                controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
              }
            }
            
            if (chunk.type === 'message_stop') {
              console.log('✅ Message completed')
              
              // Try to extract a plan from the response
              const plan = extractPlanFromResponse(fullResponse)
              
              const completeData = {
                type: 'complete',
                content: fullResponse,
                metadata: {
                  cost: 0.001, // Estimated cost
                  duration: 2000, // Estimated duration
                  sessionId: 'direct-' + Date.now()
                }
              }
              controller.enqueue(encoder.encode(JSON.stringify(completeData) + '\n'))
              
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
          console.error('❌ Anthropic API error:', error)
          
          const errorData = {
            type: 'error',
            content: 'Failed to communicate with Anthropic API. Please check your API key and try again.',
            error: error instanceof Error ? error.message : String(error)
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
    description?: string
  }>
  reasoning?: string
  timestamp: number
}

function extractPlanFromResponse(content: string): ExtractedPlan | null {
  try {
    // Look for JSON code blocks
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g
    const matches = content.match(jsonBlockRegex)
    
    if (matches) {
      for (const match of matches) {
        try {
          const jsonContent = match.replace(/```json\s*/, '').replace(/\s*```$/, '')
          const parsed = JSON.parse(jsonContent)
          
          if (parsed.changes && Array.isArray(parsed.changes)) {
            return {
              id: crypto.randomUUID(),
              description: 'File operations executed',
              changes: parsed.changes,
              reasoning: '',
              timestamp: Date.now()
            }
          }
        } catch (parseError) {
          console.log('Failed to parse JSON block:', parseError)
          continue
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error extracting plan:', error)
    return null
  }
}