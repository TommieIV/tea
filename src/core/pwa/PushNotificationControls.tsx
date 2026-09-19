import { useState } from 'react'
import { disablePushNotifications, enablePushNotifications, pushPermission, sendPushTest } from './pushNotifications'

export function PushNotificationControls() {
  const [permission, setPermission] = useState(pushPermission)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true); setMessage('')
    try { await action(); setPermission(pushPermission()); setMessage(success) } catch (error) { setMessage(error instanceof Error ? error.message : 'Notification settings could not be changed.') } finally { setBusy(false) }
  }

  return <section className="push-controls"><span>Notifications</span>{permission === 'granted' ? <><p>Enabled for this device.</p><div><button type="button" onClick={() => void run(sendPushTest, 'Test notification sent.')} disabled={busy}>Send test</button><button type="button" onClick={() => void run(disablePushNotifications, 'Notifications disabled for this device.')} disabled={busy}>Disable</button></div></> : <><p>{permission === 'denied' ? 'Blocked by this browser.' : 'Get important TEA updates on this device.'}</p><button type="button" onClick={() => void run(enablePushNotifications, 'Notifications enabled for this device.')} disabled={busy || permission === 'denied'}>Enable notifications</button></>}{message && <small role="status">{message}</small>}</section>
}
