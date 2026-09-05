import { createContext } from 'react'
import type { WorkspaceContext } from './types'

export type WorkspaceContextValue = {
  contexts: WorkspaceContext[]
  activeWorkspace: WorkspaceContext | null
  loading: boolean
  error: string | null
  setActiveWorkspaceId: (workspaceId: string) => void
}

export const WorkspaceContextState = createContext<WorkspaceContextValue | null>(null)

