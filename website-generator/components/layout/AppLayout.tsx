"use client"

import { Header } from "./Header"
import { ResizableLayout } from "./ResizableLayout"

export function AppLayout() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex-1 overflow-hidden">
        <ResizableLayout />
      </div>
    </div>
  )
}