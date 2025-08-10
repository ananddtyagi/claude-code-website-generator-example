"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileNav } from "./FileNav"
import { Preview } from "./Preview"
import { EditorPanel } from "../editor/EditorPanel"
import { Project, FSNode } from "@/lib/filesystem/types"

interface LeftTabbedPanelProps {
  project: Project | null
  onProjectChange: (project: Project) => void
  selectedFile: FSNode | null
  onFileSelect: (node: FSNode) => void
  onFileChange: (fileId: string, content: string) => void
}

export function LeftTabbedPanel({
  project,
  onProjectChange,
  selectedFile,
  onFileSelect,
  onFileChange
}: LeftTabbedPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="files" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b">
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="files" className="flex-1 mt-0 overflow-hidden">
          <div className="h-full flex">
            <div className="w-1/3 min-w-[200px] border-r overflow-auto">
              <FileNav 
                project={project}
                onProjectChange={onProjectChange}
                onFileSelect={onFileSelect}
                selectedFileId={selectedFile?.id}
              />
            </div>
            <div className="flex-1 min-w-0">
              <EditorPanel 
                project={project}
                selectedFile={selectedFile}
                onFileChange={onFileChange}
                onProjectChange={onProjectChange}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="preview" className="flex-1 mt-0 overflow-hidden h-full">
          <div className="h-full">
            <Preview project={project} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}