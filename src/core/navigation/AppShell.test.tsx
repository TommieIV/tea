// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { AuthContext } from '../auth/AuthContext'
import { WorkspaceContextState } from '../workspaces/WorkspaceContext'
import type { WorkspaceContext } from '../workspaces/types'
import { AppShell } from './AppShell'

vi.mock('../pwa/useOnlineStatus', () => ({ useOnlineStatus: () => true }))

const workspace: WorkspaceContext = {
  workspaceId: 'personal-workspace',
  workspaceName: 'Personal',
  workspaceType: 'personal',
  roleName: 'Owner',
  permissionKeys: [],
  enabledModuleIds: [],
}

describe('AppShell account menu', () => {
  afterEach(cleanup)

  it('provides workspace switching and sign out from the user menu', () => {
    const setActiveWorkspaceId = vi.fn()
    const signOut = vi.fn()

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthContext.Provider value={{ session: { user: { email: 'user@example.com', user_metadata: { display_name: 'Taylor' } } } as unknown as Session, loading: false, signOut }}>
          <WorkspaceContextState.Provider value={{
            contexts: [workspace, { ...workspace, workspaceId: 'household-workspace', workspaceName: 'Household', workspaceType: 'household' }],
            activeWorkspace: workspace,
            loading: false,
            error: null,
            setActiveWorkspaceId,
          }}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<Outlet />} />
              </Route>
            </Routes>
          </WorkspaceContextState.Provider>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Taylor')).toHaveLength(2)
    fireEvent.click(screen.getByLabelText('Open account menu for Taylor'))
    fireEvent.change(screen.getByLabelText('Active workspace'), { target: { value: 'household-workspace' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(setActiveWorkspaceId).toHaveBeenCalledWith('household-workspace')
    expect(signOut).toHaveBeenCalledOnce()
  })
})
