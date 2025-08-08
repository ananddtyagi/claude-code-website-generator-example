import { z } from 'zod'

// File operation schemas
export const FileChangeSchema = z.object({
  type: z.enum(['create', 'update', 'delete']),
  path: z.string().refine(path => {
    // Validate allowed paths - only allow certain directories
    const allowedDirs = ['/app', '/components', '/public', '/styles', '/lib']
    return allowedDirs.some(dir => path.startsWith(dir)) && 
           !path.includes('..') && 
           !path.includes('//') &&
           path.length > 0 &&
           path.length < 500
  }, 'Invalid file path or path not in allowed directories'),
  content: z.string().optional(),
  description: z.string().optional()
})

export const ChangePlanSchema = z.object({
  id: z.string(),
  description: z.string().min(1).max(1000),
  changes: z.array(FileChangeSchema).min(1).max(50), // Limit number of changes
  reasoning: z.string().optional(),
  timestamp: z.number()
})

// Project context schema
export const ProjectContextSchema = z.object({
  name: z.string().min(1).max(100),
  structure: z.any(), // FSNode type validation
  openFiles: z.array(z.string()).max(20), // Limit open files
  currentFile: z.string().optional()
})

// API configuration schema
export const AIConfigurationSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().optional().default('claude-3-5-sonnet-20241022'),
  temperature: z.number().min(0).max(1).optional().default(0.1),
  maxTurns: z.number().min(1).max(10).optional().default(5)
})

// Validation functions
export const validateFilePath = (path: string): boolean => {
  try {
    const result = FileChangeSchema.shape.path.parse(path)
    return true
  } catch {
    return false
  }
}

export const sanitizeContent = (content: string): string => {
  // Basic content sanitization
  return content
    .replace(/\0/g, '') // Remove null bytes
    .slice(0, 100000) // Limit content length
}

export const validateFileSize = (content: string): boolean => {
  const sizeInMB = new Blob([content]).size / (1024 * 1024)
  return sizeInMB <= 5 // 5MB limit
}