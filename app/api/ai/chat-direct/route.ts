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
  return `You are an expert full-stack developer helping with a Next.js website generator project named "${context.name}".

CONTEXT:
- You're working with a virtual filesystem that supports creating, editing, and deleting files
- The project uses Next.js 15 with TypeScript, React 19, Tailwind CSS, and Monaco Editor
- Current project structure exists with standard Next.js files

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

RESPONSE FORMAT:
When making file changes, provide them in this JSON format at the end of your response:

\`\`\`json
{
  "changes": [
    {
      "type": "create|update|delete",
      "path": "/path/to/file.tsx",
      "content": "file content here (omit for delete)",
      "description": "Brief description of the change"
    }
  ],
  "description": "Overall description of what you're doing",
  "reasoning": "Brief reasoning for the changes"
}
\`\`\`

Be helpful and provide practical implementation details. Focus on creating working, production-ready code.`
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
              description: parsed.description || 'AI-generated plan',
              changes: parsed.changes,
              reasoning: parsed.reasoning,
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