// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PushNotificationControls } from './PushNotificationControls'

const mocks = vi.hoisted(() => ({ hasPushSubscription: vi.fn() }))

vi.mock('./pushNotifications', () => ({
  disablePushNotifications: vi.fn(),
  enablePushNotifications: vi.fn(),
  hasPushSubscription: mocks.hasPushSubscription,
  pushPermission: () => 'granted',
  sendPushTest: vi.fn(),
}))

describe('PushNotificationControls', () => {
  afterEach(() => {
    cleanup()
    mocks.hasPushSubscription.mockReset()
  })

  it('does not call a permitted but unsubscribed device enabled', async () => {
    mocks.hasPushSubscription.mockResolvedValue(false)

    render(<PushNotificationControls />)

    expect(await screen.findByText('Permission is allowed, but this device is not registered.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enable notifications' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Send test' })).not.toBeInTheDocument()
  })

  it('shows device controls only when the browser has a subscription', async () => {
    mocks.hasPushSubscription.mockResolvedValue(true)

    render(<PushNotificationControls />)

    expect(await screen.findByText('Enabled for this device.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send test' })).toBeInTheDocument()
  })
})
