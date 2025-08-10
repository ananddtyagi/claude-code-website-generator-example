"use client"

import { Project, isFile } from '@/lib/filesystem/types'
import { Sandpack } from '@codesandbox/sandpack-react'
import { useTheme } from 'next-themes'
import { useEffect, useMemo, useState } from 'react'

interface SandpackPreviewProps {
  project: Project | null
  className?: string
}

export function SandpackPreview({ project, className }: SandpackPreviewProps) {
  const { resolvedTheme } = useTheme()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Convert our filesystem to Sandpack files format
  const sandpackFiles = useMemo(() => {
    if (!project) {
      // Return default fallback files when no project is loaded
      return {
        'App.tsx': `import React from 'react';

export default function App() {
  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>
        No Project Loaded
      </h1>
      <p style={{ color: '#666', textAlign: 'center' }}>
        Create or open a project to see the preview
      </p>
    </div>
  );
}`,
        'styles.css': `body { margin: 0; padding: 0; }`
      }
    }

    let files: Record<string, string> = {}

    // Convert all file nodes to Sandpack file format
    for (const node of project.nodes.values()) {
      if (isFile(node) && !node.binary) {
        // Sandpack expects paths without leading slash
        const sandpackPath = node.path.startsWith('/') ? node.path.slice(1) : node.path
        files[sandpackPath] = node.content
        console.log('Loading file for Sandpack:', sandpackPath, 'Content preview:', node.content.substring(0, 100))
      }
    }

    // For Next.js projects, create an App.tsx entry point from app/page.tsx if it exists
    if (files['app/page.tsx'] && !files['App.tsx']) {
      // Use the page content as the base for App.tsx
      files['App.tsx'] = files['app/page.tsx']
    }

    // Ensure we have a basic CSS file
    if (!files['styles.css'] && !files['app/globals.css']) {
      files['styles.css'] = `body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, sans-serif;
}

* {
  box-sizing: border-box;
}`
    }

    // If we have app/globals.css, use it as styles.css for Sandpack
    if (files['app/globals.css'] && !files['styles.css']) {
      files['styles.css'] = files['app/globals.css']
    }

    // Simple and reliable component inlining for Sandpack
    const inlineAllComponents = (files: Record<string, string>): Record<string, string> => {
      const processedFiles = { ...files }
      
      // Process App.tsx (or any main component file)
      if (processedFiles['App.tsx']) {
        let appContent = processedFiles['App.tsx']
        let allComponentDefinitions = ''
        
        // Find all import statements
        const importRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
        const imports = [...appContent.matchAll(importRegex)]
        
        console.log('Found imports in App.tsx:', imports.map(i => `${i[1]} from ${i[2]}`))
        
        // Process each import
        imports.forEach(([fullImport, componentName, importPath]) => {
          // Skip React and other external imports
          if (importPath.startsWith('.') || importPath.startsWith('@/')) {
            // Resolve the file path
            let resolvedPath = importPath
              .replace('@/', '')
              .replace('./', '')
              .replace(/^components\//, 'components/')
            
            // Try different extensions
            const filesToCheck = [
              resolvedPath + '.tsx',
              resolvedPath + '.jsx',
              resolvedPath + '.ts',
              resolvedPath + '.js',
              resolvedPath
            ]
            
            for (const filePath of filesToCheck) {
              if (processedFiles[filePath]) {
                console.log(`Found file for ${componentName}: ${filePath}`)
                
                // Extract the entire file content and adapt it
                let fileContent = processedFiles[filePath]
                
                // Remove all imports from the component file
                fileContent = fileContent.replace(/import\s+[^;]+;\s*\n?/g, '')
                
                // Remove export default and just get the component
                fileContent = fileContent.replace(/export\s+default\s+/g, '')
                
                // Add the component definition
                allComponentDefinitions += `\n// Inlined from ${filePath}\n${fileContent}\n`
                break
              }
            }
          }
        })
        
        // Remove all local imports from App.tsx
        appContent = appContent.replace(/import\s+\w+\s+from\s+['"](?:\.\/|@\/)[^'"]+['"]\s*;?\s*\n?/g, '')
        
        // Add all component definitions after React import
        if (allComponentDefinitions) {
          const reactImportMatch = appContent.match(/(import\s+React[^;]*;?\s*\n?)/)
          if (reactImportMatch) {
            appContent = appContent.replace(
              reactImportMatch[0],
              reactImportMatch[0] + '\n' + allComponentDefinitions + '\n'
            )
          } else {
            appContent = allComponentDefinitions + '\n\n' + appContent
          }
        }
        
        processedFiles['App.tsx'] = appContent
        console.log('Final App.tsx preview:', appContent.substring(0, 500))
      }
      
      return processedFiles
    }
    
    // First inline all components
    files = inlineAllComponents(files)
    
    // Then process each file for Tailwind conversion
    for (const [path, content] of Object.entries(files)) {
      if (path.endsWith('.tsx') || path.endsWith('.jsx')) {
        let processedContent = content
        
        // Convert common Tailwind classes to inline styles
        processedContent = processedContent
          .replace(/className="([^"]*)"/g, (match, classes) => {
            const styles: Record<string, string> = {}

            // Layout & Flexbox
            if (classes.includes('flex')) styles.display = 'flex'
            if (classes.includes('grid')) styles.display = 'grid'
            if (classes.includes('min-h-screen')) styles.minHeight = '100vh'
            if (classes.includes('flex-col')) styles.flexDirection = 'column'
            if (classes.includes('items-center')) styles.alignItems = 'center'
            if (classes.includes('justify-center')) styles.justifyContent = 'center'
            if (classes.includes('justify-between')) styles.justifyContent = 'space-between'
            if (classes.includes('text-center')) styles.textAlign = 'center'
            if (classes.includes('text-left')) styles.textAlign = 'left'

            // Spacing
            if (classes.includes('p-24')) styles.padding = '6rem'
            if (classes.includes('p-8')) styles.padding = '2rem'
            if (classes.includes('p-4')) styles.padding = '1rem'
            if (classes.includes('px-5')) styles.paddingLeft = styles.paddingRight = '1.25rem'
            if (classes.includes('py-4')) styles.paddingTop = styles.paddingBottom = '1rem'
            if (classes.includes('mb-32')) styles.marginBottom = '8rem'
            if (classes.includes('mb-3')) styles.marginBottom = '0.75rem'
            if (classes.includes('mt-4')) styles.marginTop = '1rem'

            // Typography
            if (classes.includes('text-6xl')) styles.fontSize = '3.75rem'
            if (classes.includes('text-2xl')) styles.fontSize = '1.5rem'
            if (classes.includes('text-sm')) styles.fontSize = '0.875rem'
            if (classes.includes('font-bold')) styles.fontWeight = 'bold'
            if (classes.includes('font-semibold')) styles.fontWeight = '600'
            if (classes.includes('font-mono')) styles.fontFamily = 'monospace'

            // Colors & Backgrounds
            if (classes.includes('text-gray-600')) styles.color = '#4b5563'
            if (classes.includes('text-blue-600')) styles.color = '#2563eb'
            if (classes.includes('bg-white')) styles.backgroundColor = '#ffffff'
            if (classes.includes('bg-gray-100')) styles.backgroundColor = '#f3f4f6'
            if (classes.includes('bg-blue-500')) styles.backgroundColor = '#3b82f6'

            // Borders & Shadows
            if (classes.includes('rounded-lg')) styles.borderRadius = '0.5rem'
            if (classes.includes('rounded-xl')) styles.borderRadius = '0.75rem'
            if (classes.includes('border')) styles.border = '1px solid #d1d5db'
            if (classes.includes('shadow-lg')) styles.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'

            // Positioning
            if (classes.includes('relative')) styles.position = 'relative'
            if (classes.includes('absolute')) styles.position = 'absolute'
            if (classes.includes('fixed')) styles.position = 'fixed'

            // Sizing
            if (classes.includes('w-full')) styles.width = '100%'
            if (classes.includes('h-full')) styles.height = '100%'
            if (classes.includes('max-w-5xl')) styles.maxWidth = '64rem'

            const styleString = Object.entries(styles)
              .map(([key, value]) => `${key}: '${value}'`)
              .join(', ')

            return styleString ? `style={{${styleString}}}` : match
          })
          .replace(/import.*from ['"]react['"]/g, "import React from 'react'") // Normalize React imports
          .replace(/export\s+default\s+function\s+(\w+)/, (match, name) => {
            // Only rename to App if it's not already App (to avoid duplicate declaration)
            return name === 'App' ? match : 'export default function App'
          }) // Ensure function is named App
        
        files[path] = processedContent
        
        // Debug log the final App.tsx content
        if (path === 'App.tsx') {
          console.log('Final App.tsx content:', processedContent)
        }
      }
    }

    console.log('All Sandpack files:', Object.keys(files))
    return files
  }, [project])

  // Use Next.js 13 which works with Node 16
  const customSetup = {
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'next': '^13.5.0'
    }
  }

  if (!isClient) {
    return (
      <div className={`h-full flex items-center justify-center bg-muted/30 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (!project || Object.keys(sandpackFiles).length === 0) {
    return (
      <div className={`h-full flex items-center justify-center bg-muted/30 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No project loaded</p>
          <p className="text-xs mt-1 text-muted-foreground">Open a project to see the preview</p>
          {project && (
            <p className="text-xs mt-1 text-red-500">
              Files in project: {project.nodes.size}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full ${className}`}>
      <div
        className="h-full [&_.sp-wrapper]:h-full [&_.sp-layout]:h-full [&_.sp-preview-container]:h-full [&_.sp-preview-iframe]:h-full [&_.sp-stack]:h-full"
        style={{ '--sp-border-radius': '0' } as React.CSSProperties}
      >
        <div style={{ height: '100%' }}>
          <Sandpack
            template="react-ts"
            files={sandpackFiles}
            customSetup={customSetup}
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            options={{
              showNavigator: false,
              showTabs: false,
              showLineNumbers: false,
              showInlineErrors: true,
              showConsole: true,
              editorWidthPercentage: 0,
              autorun: true,
              autoReload: true,
            }}
            style={{
              height: '100%',
            }}
          />
        </div>
      </div>
    </div>
  )
}