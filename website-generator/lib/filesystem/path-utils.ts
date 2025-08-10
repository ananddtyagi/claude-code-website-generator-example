export const PATH_SEPARATOR = '/'

export function normalizePath(path: string): string {
  if (!path) return PATH_SEPARATOR
  
  const normalized = path
    .split(/[/\\]+/)
    .filter(Boolean)
    .join(PATH_SEPARATOR)
  
  return path.startsWith(PATH_SEPARATOR) ? PATH_SEPARATOR + normalized : normalized
}

export function joinPath(...segments: string[]): string {
  const joined = segments
    .filter(Boolean)
    .map(s => s.replace(/^[/\\]+|[/\\]+$/g, ''))
    .filter(Boolean)
    .join(PATH_SEPARATOR)
  
  return joined.startsWith(PATH_SEPARATOR) ? joined : PATH_SEPARATOR + joined
}

export function dirname(path: string): string {
  const normalized = normalizePath(path)
  const lastSeparator = normalized.lastIndexOf(PATH_SEPARATOR)
  
  if (lastSeparator === -1) return PATH_SEPARATOR
  if (lastSeparator === 0) return PATH_SEPARATOR
  
  return normalized.substring(0, lastSeparator)
}

export function basename(path: string, ext?: string): string {
  const normalized = normalizePath(path)
  const lastSeparator = normalized.lastIndexOf(PATH_SEPARATOR)
  const base = normalized.substring(lastSeparator + 1)
  
  if (ext && base.endsWith(ext)) {
    return base.substring(0, base.length - ext.length)
  }
  
  return base
}

export function extname(path: string): string {
  const base = basename(path)
  const lastDot = base.lastIndexOf('.')
  
  if (lastDot === -1 || lastDot === 0) return ''
  return base.substring(lastDot)
}

export function isAbsolutePath(path: string): boolean {
  return path.startsWith(PATH_SEPARATOR)
}

export function relativePath(from: string, to: string): string {
  const fromParts = normalizePath(from).split(PATH_SEPARATOR).filter(Boolean)
  const toParts = normalizePath(to).split(PATH_SEPARATOR).filter(Boolean)
  
  let commonIndex = 0
  while (
    commonIndex < fromParts.length &&
    commonIndex < toParts.length &&
    fromParts[commonIndex] === toParts[commonIndex]
  ) {
    commonIndex++
  }
  
  const upCount = fromParts.length - commonIndex
  const remainingPath = toParts.slice(commonIndex)
  
  const relativeParts = [
    ...Array(upCount).fill('..'),
    ...remainingPath
  ]
  
  return relativeParts.join(PATH_SEPARATOR) || '.'
}

export function isSubPath(parent: string, child: string): boolean {
  const normalizedParent = normalizePath(parent)
  const normalizedChild = normalizePath(child)
  
  if (normalizedParent === PATH_SEPARATOR) {
    return normalizedChild.startsWith(PATH_SEPARATOR)
  }
  
  return normalizedChild.startsWith(normalizedParent + PATH_SEPARATOR)
}

export function splitPath(path: string): string[] {
  return normalizePath(path).split(PATH_SEPARATOR).filter(Boolean)
}

export function validateFileName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'File name cannot be empty' }
  }
  
  if (name.includes(PATH_SEPARATOR) || name.includes('\\')) {
    return { valid: false, error: 'File name cannot contain path separators' }
  }
  
  const invalidChars = /[<>:"|?*\x00-\x1f]/
  if (invalidChars.test(name)) {
    return { valid: false, error: 'File name contains invalid characters' }
  }
  
  if (name === '.' || name === '..') {
    return { valid: false, error: 'Invalid file name' }
  }
  
  if (name.length > 255) {
    return { valid: false, error: 'File name is too long (max 255 characters)' }
  }
  
  return { valid: true }
}

export function getFileTypeFromPath(path: string): 'text' | 'image' | 'binary' {
  const ext = extname(path).toLowerCase()
  
  const textExtensions = [
    '.txt', '.md', '.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.sass',
    '.html', '.xml', '.json', '.yml', '.yaml', '.toml', '.ini', '.env',
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.py', '.rb', '.go', '.rs',
    '.java', '.kt', '.swift', '.c', '.cpp', '.h', '.hpp', '.cs', '.php',
    '.sql', '.graphql', '.vue', '.svelte', '.astro'
  ]
  
  const imageExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico',
    '.tiff', '.tif'
  ]
  
  if (textExtensions.includes(ext)) return 'text'
  if (imageExtensions.includes(ext)) return 'image'
  
  return 'binary'
}