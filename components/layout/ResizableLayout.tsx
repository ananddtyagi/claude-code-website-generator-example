"use client"

import { useEffect, useState } from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { ChatPanel } from "./ChatPanel"
import { FileNav } from "./FileNav"
import { Preview } from "./Preview"

const DEFAULT_LAYOUT = [25, 25, 50]

export function ResizableLayout() {
  const [isClient, setIsClient] = useState(false)
  const [defaultLayout, setDefaultLayout] = useState(DEFAULT_LAYOUT)

  useEffect(() => {
    setIsClient(true)
    const saved = localStorage.getItem("ui.layout.v1")
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as number[]
        if (parsed.length === 3) {
          setDefaultLayout(parsed)
        }
      } catch {
        // Use default layout
      }
    }
  }, [])

  const handleLayout = (sizes: number[]) => {
    if (isClient) {
      localStorage.setItem("ui.layout.v1", JSON.stringify(sizes))
    }
  }

  if (!isClient) {
    return (
      <div className="h-full grid grid-cols-1 md:grid-cols-3">
        <div className="hidden md:block"><ChatPanel /></div>
        <div className="hidden md:block"><FileNav /></div>
        <Preview />
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Mobile view */}
      <div className="md:hidden h-full">
        <Preview />
      </div>
      
      {/* Desktop view */}
      <div className="hidden md:block h-full">
        <PanelGroup
          direction="horizontal"
          onLayout={handleLayout}
          className="h-full"
        >
          <Panel 
            defaultSize={defaultLayout[0]} 
            minSize={15} 
            maxSize={75}
            className="min-w-[240px]"
          >
            <ChatPanel />
          </Panel>
          
          <PanelResizeHandle className="w-px bg-border hover:bg-primary transition-colors" />
          
          <Panel 
            defaultSize={defaultLayout[1]} 
            minSize={15} 
            maxSize={75}
            className="min-w-[240px]"
          >
            <FileNav />
          </Panel>
          
          <PanelResizeHandle className="w-px bg-border hover:bg-primary transition-colors" />
          
          <Panel 
            defaultSize={defaultLayout[2]} 
            minSize={15} 
            maxSize={75}
            className="min-w-[240px]"
          >
            <Preview />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}