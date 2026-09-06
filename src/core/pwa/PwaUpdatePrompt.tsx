import { registerSW } from 'virtual:pwa-register'
import { useEffect, useRef, useState } from 'react'

export function PwaUpdatePrompt() {
  const updateServiceWorker = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    updateServiceWorker.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setUpdateAvailable(true)
      },
    })
  }, [])

  async function refreshApp() {
    if (!updateServiceWorker.current) return

    setUpdating(true)
    try {
      await updateServiceWorker.current(true)
    } catch {
      setUpdating(false)
    }
  }

  if (!updateAvailable) return null

  return (
    <aside className="pwa-update-prompt" aria-live="polite">
      <div>
        <strong>Update ready</strong>
        <p>A newer version of TEA is available.</p>
      </div>
      <button className="button button-primary pwa-update-button" type="button" onClick={() => void refreshApp()} disabled={updating}>
        {updating ? 'Refreshing…' : 'Refresh'}
      </button>
    </aside>
  )
}
