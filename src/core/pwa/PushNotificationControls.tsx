import { useEffect, useState } from 'react'
import { disablePushNotifications, enablePushNotifications, hasPushSubscription, pushPermission, sendPushTest } from './pushNotifications'

export function PushNotificationControls() {
  const [permission, setPermission] = useState(pushPermission)
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function refreshStatus() {
    setPermission(pushPermission())
    try {
      setSubscribed(await hasPushSubscription())
    } catch {
      setSubscribed(false)
    }
  }

  useEffect(() => {
    void refreshStatus()
  }, [])

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true); setMessage('')
    try { await action(); await refreshStatus(); setMessage(success) } catch (error) { setMessage(error instanceof Error ? error.message : 'Notification settings could not be changed.') } finally { setBusy(false) }
  }

  const enabled = permission === 'granted' && subscribed === true
  const blocked = permission === 'denied'

  return <section className="push-controls"><span>Notifications</span>{enabled ? <><p>Enabled for this device.</p><div><button type="button" onClick={() => void run(sendPushTest, 'Test notification sent.')} disabled={busy}>Send test</button><button type="button" onClick={() => void run(disablePushNotifications, 'Notifications disabled for this device.')} disabled={busy}>Disable</button></div></> : <><p>{blocked ? 'Blocked by this browser.' : permission === 'granted' ? 'Permission is allowed, but this device is not registered.' : 'Get important TEA updates on this device.'}</p><button type="button" onClick={() => void run(enablePushNotifications, 'Notifications enabled for this device.')} disabled={busy || blocked || subscribed === null}>Enable notifications</button></>}{message && <small role="status">{message}</small>}</section>
}
