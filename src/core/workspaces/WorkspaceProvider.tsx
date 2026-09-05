import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../auth/supabase'
import type { WorkspaceContext } from './types'
import { WorkspaceContextState } from './WorkspaceContext'
const activeWorkspaceStorageKey = 'tea.active-workspace-id'

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const [contexts, setContexts] = useState<WorkspaceContext[]>([])
  const [activeWorkspaceId, setStoredActiveWorkspaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session || !supabase) return
    let cancelled = false

    void supabase.rpc('get_my_workspace_contexts').then(({ data, error: rpcError }) => {
      if (cancelled) return
      if (rpcError) {
        setError('Your workspace context could not be loaded.')
        setLoading(false)
        return
      }
      const nextContexts = (data ?? []) as WorkspaceContext[]
      const savedId = window.localStorage.getItem(activeWorkspaceStorageKey)
      setContexts(nextContexts)
      setStoredActiveWorkspaceId(nextContexts.some((context) => context.workspaceId === savedId) ? savedId : (nextContexts[0]?.workspaceId ?? null))
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [session])

  function setActiveWorkspaceId(workspaceId: string) {
    window.localStorage.setItem(activeWorkspaceStorageKey, workspaceId)
    setStoredActiveWorkspaceId(workspaceId)
  }

  const activeWorkspace = useMemo(
    () => contexts.find((context) => context.workspaceId === activeWorkspaceId) ?? null,
    [activeWorkspaceId, contexts],
  )

  return (
    <WorkspaceContextState.Provider value={{ contexts, activeWorkspace, loading, error, setActiveWorkspaceId }}>
      {children}
    </WorkspaceContextState.Provider>
  )
}
