import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { Project, FSNode, DirectoryNode } from '../filesystem/types'
import { generateId } from '../utils/id'

interface ProjectDB extends DBSchema {
  projects: {
    key: string
    value: {
      id: string
      name: string
      description?: string
      rootId: string
      nodes: Array<[string, FSNode]>
      createdAt: string
      updatedAt: string
      lastOpenedAt?: string
    }
  }
  metadata: {
    key: string
    value: {
      key: string
      lastProjectId?: string
      version: number
    }
  }
}

const DB_NAME = 'website-generator-db'
const DB_VERSION = 1

export class ProjectStore {
  private db: IDBPDatabase<ProjectDB> | null = null
  private autosaveTimer: NodeJS.Timeout | null = null
  private readonly AUTOSAVE_DELAY = 800

  async initialize(): Promise<void> {
    this.db = await openDB<ProjectDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' })
        }
      }
    })
  }

  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error('ProjectStore not initialized. Call initialize() first.')
    }
  }

  async createProject(name: string, description?: string): Promise<Project> {
    this.ensureInitialized()
    
    const now = new Date()
    const rootId = generateId()
    
    const rootNode: DirectoryNode = {
      id: rootId,
      type: 'directory',
      name: '/',
      path: '/',
      parentId: null,
      children: [],
      createdAt: now,
      updatedAt: now
    }
    
    const project: Project = {
      id: generateId(),
      name,
      description,
      rootId,
      nodes: new Map([[rootId, rootNode]]),
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now
    }
    
    await this.saveProject(project)
    await this.setLastProjectId(project.id)
    
    return project
  }

  async saveProject(project: Project): Promise<void> {
    this.ensureInitialized()
    
    const serialized = {
      id: project.id,
      name: project.name,
      description: project.description,
      rootId: project.rootId,
      nodes: Array.from(project.nodes.entries()),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      lastOpenedAt: project.lastOpenedAt?.toISOString()
    }
    
    await this.db!.put('projects', serialized)
  }

  async loadProject(id: string): Promise<Project | null> {
    this.ensureInitialized()
    
    const data = await this.db!.get('projects', id)
    if (!data) return null
    
    const project: Project = {
      id: data.id,
      name: data.name,
      description: data.description,
      rootId: data.rootId,
      nodes: new Map(data.nodes.map(([id, node]) => [
        id,
        {
          ...node,
          createdAt: new Date(node.createdAt),
          updatedAt: new Date(node.updatedAt)
        }
      ])),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      lastOpenedAt: data.lastOpenedAt ? new Date(data.lastOpenedAt) : undefined
    }
    
    project.lastOpenedAt = new Date()
    await this.saveProject(project)
    await this.setLastProjectId(project.id)
    
    return project
  }

  async listProjects(): Promise<Array<{
    id: string
    name: string
    description?: string
    createdAt: Date
    updatedAt: Date
    lastOpenedAt?: Date
  }>> {
    this.ensureInitialized()
    
    const projects = await this.db!.getAll('projects')
    
    return projects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
      lastOpenedAt: p.lastOpenedAt ? new Date(p.lastOpenedAt) : undefined
    })).sort((a, b) => {
      if (a.lastOpenedAt && b.lastOpenedAt) {
        return b.lastOpenedAt.getTime() - a.lastOpenedAt.getTime()
      }
      if (a.lastOpenedAt) return -1
      if (b.lastOpenedAt) return 1
      return b.updatedAt.getTime() - a.updatedAt.getTime()
    })
  }

  async deleteProject(id: string): Promise<void> {
    this.ensureInitialized()
    
    await this.db!.delete('projects', id)
    
    const lastProjectId = await this.getLastProjectId()
    if (lastProjectId === id) {
      await this.setLastProjectId(undefined)
    }
  }

  async duplicateProject(id: string, newName: string): Promise<Project | null> {
    this.ensureInitialized()
    
    const original = await this.loadProject(id)
    if (!original) return null
    
    const now = new Date()
    const nodeIdMap = new Map<string, string>()
    
    const duplicatedNodes = new Map<string, FSNode>()
    for (const [oldId, node] of original.nodes) {
      const newId = generateId()
      nodeIdMap.set(oldId, newId)
      
      const newNode = {
        ...node,
        id: newId,
        createdAt: now,
        updatedAt: now
      }
      
      if (node.type === 'directory') {
        (newNode as DirectoryNode).children = []
      }
      
      duplicatedNodes.set(newId, newNode)
    }
    
    for (const [oldId, node] of original.nodes) {
      const newId = nodeIdMap.get(oldId)!
      const newNode = duplicatedNodes.get(newId)!
      
      if (node.parentId) {
        newNode.parentId = nodeIdMap.get(node.parentId) || null
      }
      
      if (node.type === 'directory' && node.children.length > 0) {
        (newNode as DirectoryNode).children = node.children
          .map(childId => nodeIdMap.get(childId))
          .filter((id): id is string => id !== undefined)
      }
    }
    
    const duplicated: Project = {
      id: generateId(),
      name: newName,
      description: original.description,
      rootId: nodeIdMap.get(original.rootId)!,
      nodes: duplicatedNodes,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now
    }
    
    await this.saveProject(duplicated)
    await this.setLastProjectId(duplicated.id)
    
    return duplicated
  }

  async renameProject(id: string, newName: string): Promise<boolean> {
    this.ensureInitialized()
    
    const project = await this.loadProject(id)
    if (!project) return false
    
    project.name = newName
    project.updatedAt = new Date()
    
    await this.saveProject(project)
    return true
  }

  async getLastProjectId(): Promise<string | undefined> {
    this.ensureInitialized()
    
    const metadata = await this.db!.get('metadata', 'app')
    return metadata?.lastProjectId
  }

  private async setLastProjectId(projectId?: string): Promise<void> {
    this.ensureInitialized()
    
    await this.db!.put('metadata', {
      key: 'app',
      lastProjectId: projectId,
      version: DB_VERSION
    })
  }

  setupAutosave(getProject: () => Project | null, onChange: () => void): () => void {
    const scheduleAutosave = () => {
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer)
      }
      
      this.autosaveTimer = setTimeout(async () => {
        try {
          const currentProject = getProject()
          if (currentProject) {
            await this.saveProject(currentProject)
            onChange()
          }
        } catch (error) {
          console.error('Autosave failed:', error)
        }
      }, this.AUTOSAVE_DELAY)
    }
    
    return scheduleAutosave
  }

  cleanup(): void {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer)
      this.autosaveTimer = null
    }
  }
}