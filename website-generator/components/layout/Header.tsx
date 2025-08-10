"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center px-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Website Generator</span>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            New
          </Button>
          <Button variant="ghost" size="sm">
            Import
          </Button>
          <Button variant="ghost" size="sm">
            Export
          </Button>
          <Button variant="ghost" size="sm">
            Settings
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}