export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 9)
  const randomPart2 = Math.random().toString(36).substring(2, 9)
  return `${timestamp}-${randomPart}-${randomPart2}`
}