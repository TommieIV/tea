import { useContext } from 'react'
import { WorkspaceContextState } from './WorkspaceContext'

export function useWorkspace() {
  const value = useContext(WorkspaceContextState)
  if (!value) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return value
}

