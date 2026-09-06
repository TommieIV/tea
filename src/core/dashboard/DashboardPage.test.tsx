// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
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

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ session: { user: { email: 'user@example.com' } } as Session, loading: false, signOut: vi.fn() }}>
        <WorkspaceContextState.Provider value={{
          contexts: [personalWorkspace, { ...personalWorkspace, workspaceId: 'household-workspace', workspaceName: 'Household', workspaceType: 'household' }],
          activeWorkspace: personalWorkspace,
          loading: false,
          error: null,
          setActiveWorkspaceId: vi.fn(),
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

  it('shows the active workspace while workspace switching lives in the account menu', () => {
    renderDashboard()

    expect(screen.getByText('Personal')).toBeInTheDocument()
    expect(screen.queryByLabelText('Active workspace')).not.toBeInTheDocument()
  })
})
