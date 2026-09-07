// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceContextState } from '../workspaces/WorkspaceContext'
import type { WorkspaceContext } from '../workspaces/types'
import { DashboardPage } from './DashboardPage'

const personalWorkspace: WorkspaceContext = {
  workspaceId: 'personal-workspace',
  workspaceName: 'Personal',
  workspaceType: 'personal',
  roleName: 'Owner',
  workspaceDisplayName: null,
  permissionKeys: ['example.overview.view'],
  enabledModuleIds: ['example'],
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <WorkspaceContextState.Provider value={{
        contexts: [personalWorkspace, { ...personalWorkspace, workspaceId: 'household-workspace', workspaceName: 'Household', workspaceType: 'household' }],
        activeWorkspace: personalWorkspace,
        loading: false,
        error: null,
        setActiveWorkspaceId: vi.fn(),
      }}>
        <DashboardPage />
      </WorkspaceContextState.Provider>
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

  it('shows the active workspace as a compact launcher bubble', () => {
    renderDashboard()

    expect(screen.getByLabelText('Active workspace: Personal')).toBeInTheDocument()
  })
})
