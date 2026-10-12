import { CircleAlert, CircleCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import logo from '../assets/suroy-logo.png'
import { FormField, PasswordInput } from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { newPasswordErrors, parseRecoveryLink } from '../lib/authLink'
import { supabase } from '../lib/supabase'

type Stage = 'checking' | 'ready' | 'invalid' | 'done'

/**
 * Where a traveler lands after tapping the link in the SUROY "reset your password" email: they type a new password
 * here, then go back to the app. The page is public (no administrator sign-in). The link carries a temporary
 * sign-in, which is used only to set the new password and is ended straight afterwards.
 */
export default function ResetPassword() {
  useDocumentTitle('Reset password · SUROY')
  // Read once, on the first render, from the address the link opened.
  const [link] = useState(() => parseRecoveryLink(window.location.hash))
  const [stage, setStage] = useState<Stage>(link.kind === 'ok' ? 'checking' : 'invalid')
  const [problem, setProblem] = useState<string | null>(link.kind === 'problem' ? link.message : null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Take the tokens out of the address bar so they are not left in the browser history.
    window.history.replaceState(null, '', window.location.pathname)
    if (link.kind !== 'ok') return

    let cancelled = false
    const reject = (message: string) => {
      if (cancelled) return
      setProblem(message)
      setStage((current) => (current === 'checking' ? 'invalid' : current))
    }
    supabase.auth
      .setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
      .then(({ error: sessionError }) => {
        if (cancelled) return
        if (sessionError) reject('This link has expired or was already used.')
        else setStage('ready')
      })
      .catch(() => reject('This link could not be checked. It may have expired or been used already.'))
    // Never leave someone waiting: if the link can't be checked in a reasonable time, say so.
    const timer = window.setTimeout(() => reject('This link could not be checked. Check your connection, or get a new link.'), 10_000)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [link])

  const errors = newPasswordErrors(password, confirm)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSubmitted(true)
    if (errors.password || errors.confirm) return
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setSaving(false)
      setError(updateError.message)
      return
    }
    // Done: end the temporary sign-in so nothing stays signed in on this browser.
    await supabase.auth.signOut()
    setSaving(false)
    setStage('done')
  }

  return (
    <main className="login login--center">
      <section className="login__panel">
        <div className="login__card login__card--status">
          <img className="login__logo" src={logo} alt="" aria-hidden="true" />

          {stage === 'checking' && <p>Checking your link...</p>}

          {stage === 'invalid' && (
            <>
              <CircleAlert size={40} aria-hidden="true" />
              <h1 className="login__title">Link not valid</h1>
              <p className="login__subtitle">{problem ?? 'This link could not be used.'}</p>
              <p>Open the SUROY app and tap “Forgot password?” to get a new link.</p>
            </>
          )}

          {stage === 'ready' && (
            <>
              <h1 className="login__title">Choose a new password</h1>
              <p className="login__subtitle">Then go back to the SUROY app and sign in.</p>
              {error ? (
                <div className="notice notice--error" role="alert">
                  {error}
                </div>
              ) : null}
              <form noValidate className="form-stack login__status-form" onSubmit={handleSubmit}>
                <FormField label="New password" required error={submitted ? errors.password : undefined}>
                  {(c) => (
                    <PasswordInput
                      {...c}
                      toggleLabel="new password"
                      maxLength={72}
                      autoComplete="new-password"
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  )}
                </FormField>
                <FormField label="Confirm new password" required error={submitted ? errors.confirm : undefined}>
                  {(c) => (
                    <PasswordInput
                      {...c}
                      toggleLabel="new password confirmation"
                      maxLength={72}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  )}
                </FormField>
                <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
                  {saving ? 'Saving...' : 'Save new password'}
                </button>
              </form>
            </>
          )}

          {stage === 'done' && (
            <>
              <CircleCheck size={40} aria-hidden="true" />
              <h1 className="login__title">Password changed</h1>
              <p className="login__subtitle">Your password was updated.</p>
              <p>Open the SUROY app and sign in with your new password.</p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
