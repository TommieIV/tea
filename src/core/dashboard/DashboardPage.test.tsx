// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { AuthContext } from '../auth/AuthContext'
import { WorkspaceContextState } from '../workspaces/WorkspaceContext'
import type { WorkspaceContext } from '../workspaces/types'
import { DashboardPage } from './DashboardPage'

const personalWorkspace: WorkspaceContext = {
  workspaceId: 'personal-workspace',
  workspaceName: 'Personal',
  workspaceType: 'personal',
  roleName: 'Owner',
  permissionKeys: ['example.overview.view'],
  enabledModuleIds: ['example'],
}

function renderDashboard(setActiveWorkspaceId = vi.fn()) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ session: { user: { email: 'user@example.com' } } as Session, loading: false, signOut: vi.fn() }}>
        <WorkspaceContextState.Provider value={{
          contexts: [personalWorkspace, { ...personalWorkspace, workspaceId: 'household-workspace', workspaceName: 'Household', workspaceType: 'household' }],
          activeWorkspace: personalWorkspace,
          loading: false,
          error: null,
          setActiveWorkspaceId,
        }}>
          <DashboardPage />
        </WorkspaceContextState.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('DashboardPage launcher', () => {
  afterEach(cleanup)

  it('renders accessible modules as launchers, keeps Coming Soon visible, and hides unavailable connected modules', () => {
    renderDashboard()

    expect(screen.getByRole('link', { name: 'Open Example module' })).toHaveAttribute('href', '/modules/example')
    expect(screen.getByLabelText('More modules, coming soon')).toBeInTheDocument()
    expect(screen.queryByLabelText('Open Tasks')).not.toBeInTheDocument()
  })

  it('keeps the workspace selector connected to the existing workspace context', () => {
    const setActiveWorkspaceId = vi.fn()
    renderDashboard(setActiveWorkspaceId)

    fireEvent.change(screen.getByLabelText('Active workspace'), { target: { value: 'household-workspace' } })

    expect(setActiveWorkspaceId).toHaveBeenCalledWith('household-workspace')
  })
})
