"use client"

export function ChatPanel() {
  return (
    <div 
      className="h-full bg-muted/50 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
      role="region" 
      aria-label="Chat"
      tabIndex={0}
    >
      <div className="text-sm text-muted-foreground">
        Chat interface will go here
      </div>
    </div>
  )
}