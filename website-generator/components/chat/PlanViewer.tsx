"use client"

import { useState } from 'react'
import { ChangePlan, FileChange } from '../../lib/ai/types'
import { Button } from '../ui/button'
import { 
  Check, 
  X, 
  FileText, 
  FilePlus, 
  FileX, 
  ChevronDown, 
  ChevronRight,
  Eye
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { CodeBlock } from './CodeBlock'

interface PlanViewerProps {
  plan: ChangePlan
  onApprove: (plan: ChangePlan) => void
  onReject: () => void
  onPreviewChange?: (change: FileChange) => void
  isApplying?: boolean
}

export function PlanViewer({ 
  plan, 
  onApprove, 
  onReject, 
  onPreviewChange,
  isApplying = false 
}: PlanViewerProps) {
  const [expandedChanges, setExpandedChanges] = useState<Set<number>>(new Set([0]))
  const [selectedChanges, setSelectedChanges] = useState<Set<number>>(
    new Set(plan.changes.map((_, index) => index))
  )

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedChanges)
    if (expandedChanges.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedChanges(newExpanded)
  }

  const toggleSelected = (index: number) => {
    const newSelected = new Set(selectedChanges)
    if (selectedChanges.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedChanges(newSelected)
  }

  const handleApprove = () => {
    const selectedChangesList = plan.changes.filter((_, index) => 
      selectedChanges.has(index)
    )
    
    const modifiedPlan: ChangePlan = {
      ...plan,
      changes: selectedChangesList
    }
    
    onApprove(modifiedPlan)
  }

  const getChangeIcon = (type: FileChange['type']) => {
    switch (type) {
      case 'create':
        return <FilePlus className="w-4 h-4 text-green-500" />
      case 'update':
        return <FileText className="w-4 h-4 text-blue-500" />
      case 'delete':
        return <FileX className="w-4 h-4 text-red-500" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getChangeTypeLabel = (type: FileChange['type']) => {
    switch (type) {
      case 'create':
        return 'Create'
      case 'update':
        return 'Update'
      case 'delete':
        return 'Delete'
      default:
        return 'Change'
    }
  }

  const getChangeTypeColor = (type: FileChange['type']) => {
    switch (type) {
      case 'create':
        return 'text-green-500 bg-green-50 border-green-200'
      case 'update':
        return 'text-blue-500 bg-blue-50 border-blue-200'
      case 'delete':
        return 'text-red-500 bg-red-50 border-red-200'
      default:
        return 'text-muted-foreground bg-muted border-muted'
    }
  }

  return (
    <div className="border rounded-lg bg-background shadow-sm">
      {/* Plan Header */}
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Proposed Changes</h3>
            <p className="text-muted-foreground mt-1">{plan.description}</p>
            {plan.reasoning && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                {plan.reasoning}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{plan.changes.length} change{plan.changes.length !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{new Date(plan.timestamp).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Changes List */}
      <div className="divide-y">
        {plan.changes.map((change, index) => {
          const isExpanded = expandedChanges.has(index)
          const isSelected = selectedChanges.has(index)

          return (
            <div key={index} className="p-4">
              <div className="flex items-center gap-3">
                {/* Selection checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelected(index)}
                  className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center",
                    isSelected 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-muted-foreground/30 hover:border-primary/50"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                </button>

                {/* Expand/collapse button */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(index)}
                  className="flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1 -mx-2"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  
                  {getChangeIcon(change.type)}
                  
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium border",
                      getChangeTypeColor(change.type)
                    )}>
                      {getChangeTypeLabel(change.type)}
                    </span>
                    <span className="font-mono text-sm">{change.path}</span>
                  </div>
                </button>

                {/* Preview button */}
                {change.content && onPreviewChange && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPreviewChange(change)}
                    className="ml-auto"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Change description */}
              {change.description && (
                <div className="ml-7 mt-2 text-sm text-muted-foreground">
                  {change.description}
                </div>
              )}

              {/* Expanded content */}
              {isExpanded && change.content && (
                <div className="ml-7 mt-3">
                  <CodeBlock
                    code={change.content}
                    language={getLanguageFromPath(change.path)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="border-t p-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedChanges.size} of {plan.changes.length} changes selected
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={isApplying}
          >
            <X className="w-4 h-4 mr-2" />
            Reject
          </Button>
          
          <Button
            onClick={handleApprove}
            disabled={selectedChanges.size === 0 || isApplying}
          >
            {isApplying ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Applying...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Apply Selected ({selectedChanges.size})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'tsx':
    case 'jsx':
      return 'typescript'
    case 'ts':
      return 'typescript'
    case 'js':
      return 'javascript'
    case 'css':
      return 'css'
    case 'json':
      return 'json'
    case 'md':
      return 'markdown'
    case 'html':
      return 'html'
    default:
      return 'text'
  }
}