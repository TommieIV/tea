import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { isSupabaseConfigured, supabase } from './supabase'

export function LoginPage() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setSubmitting(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (signInError) setError(signInError.message)
  }

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="eyebrow">TEA platform</div>
        <h1 id="login-title">Welcome back</h1>
        <p className="lede">Sign in to open your workspace.</p>
        {!isSupabaseConfigured && (
          <p className="notice info">Add the Supabase URL and publishable key to a local <code>.env</code> file to enable sign-in.</p>
        )}
        <form onSubmit={handleSubmit}>
          <label className="field">Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label className="field">Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="notice error" role="alert">{error}</p>}
          <button className="button button-primary" type="submit" disabled={!isSupabaseConfigured || submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  )
}
