import { FlaskConical, type LucideIcon } from 'lucide-react'
import type { WorkspaceType } from '../workspaces/types'

export type ModuleStatus = 'connected' | 'coming-soon'

export type ModuleManifest = {
  id: string
  name: string
  version: string
  route?: string
  description: string
  icon: LucideIcon
  status: ModuleStatus
  classification: 'generic' | 'private' | 'business' | 'experimental'
  supportedWorkspaceTypes: WorkspaceType[]
  permissions: string[]
}

export const moduleRegistry: ModuleManifest[] = [
  {
    id: 'example',
    name: 'Example module',
    version: '0.1.0',
    route: '/modules/example',
    description: 'A small connected module that verifies the TEA platform contracts.',
    icon: FlaskConical,
    status: 'connected',
    classification: 'generic',
    supportedWorkspaceTypes: ['personal'],
    permissions: ['example.overview.view'],
  },
  {
    id: 'future-module',
    name: 'More modules',
    version: '0.0.0',
    description: 'The registry is ready for the next focused module when its requirements are clear.',
    icon: FlaskConical,
    status: 'coming-soon',
    classification: 'experimental',
    supportedWorkspaceTypes: ['personal', 'household', 'business'],
    permissions: [],
  },
]

