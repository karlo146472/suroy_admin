import { LogIn } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import logo from '../assets/suroy-logo.png'
import { FormField, PasswordInput } from '../components/ui'
import { useCurrentAdmin } from '../hooks/session'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSectionForm } from '../hooks/useSectionForm'
import { safeRedirectPath, signInAdmin } from '../lib/auth'
import { validateLogin, type LoginValues } from '../lib/settingsForm'

const emptyLogin: LoginValues = { email: '', password: '' }

/** How long the "You have been signed out." message stays on screen. */
const SIGNED_OUT_MESSAGE_MS = 20_000

/** Full-screen sign-in, deliberately outside the dashboard layout (no sidebar or header). */
export default function Login() {
  const navigate = useNavigate()
  useDocumentTitle('Admin Sign In · SUROY')
  const { admin, isLoading } = useCurrentAdmin()
  // RequireAdmin passes the page the visitor was trying to open; go back there after signing in.
  const routeState = useLocation().state as { from?: string; signedOut?: boolean } | null
  const destination = safeRedirectPath(routeState?.from)
  const form = useSectionForm<LoginValues>(emptyLogin, validateLogin)
  // A problem with the credentials themselves (e.g. a wrong email or password). It stays on screen until the next
  // sign-in attempt replaces it; typing in a field or waiting does not remove it.
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // "You have been signed out." is only a short confirmation, so it goes away by itself after 20 seconds.
  const [showSignedOut, setShowSignedOut] = useState(routeState?.signedOut === true)
  useEffect(() => {
    if (!showSignedOut) return
    const timer = window.setTimeout(() => setShowSignedOut(false), SIGNED_OUT_MESSAGE_MS)
    return () => window.clearTimeout(timer)
  }, [showSignedOut])

  const emailProps = form.fieldProps('email')
  const passwordProps = form.fieldProps('password')

  // Already signed in: there is nothing to do here.
  if (admin) return <Navigate to={destination} replace />
  // A saved session is still being checked; showing the form now would flash it for a moment.
  if (isLoading) return null

  return (
    <main className="login">
      <aside className="login__brand">
        {/* One box for all four, so the logo and name line up with the start of each line of the description. */}
        <div className="login__brand-inner">
          <img className="login__logo" src={logo} alt="" aria-hidden="true" />
          <h1 className="login__brand-name">SUROY</h1>
          <p className="login__brand-sub">Tourism Admin</p>
          <p className="login__tagline">
            Manage destinations, transportation routes and users for Santo Tomas, Davao del Norte.
          </p>
        </div>
      </aside>

      <section className="login__panel">
        <div className="login__card">
          <div className="login__mobile-brand">
            <img className="login__logo login__logo--small" src={logo} alt="" aria-hidden="true" />
            <span>
              <strong>SUROY</strong> Tourism Admin
            </span>
          </div>

          <h2 className="login__title">Admin sign in</h2>


          {error ? (
            <div className="notice notice--error" role="alert">
              {error}
            </div>
          ) : (
            showSignedOut && (
              <div className="notice notice--success" role="status">
                You have been signed out.
              </div>
            )
          )}

          <form
            noValidate
            className="form-stack"
            onSubmit={form.handleSubmit(async (values) => {
              if (submitting) return
              setSubmitting(true)
              const result = await signInAdmin(values.email, values.password)
              setSubmitting(false)
              if (!result.ok) {
                setError(result.message)
                return
              }
              navigate(destination, { replace: true })
            })}
          >
            <FormField label="Email" required error={form.errorFor('email')}>
              {(c) => (
                <input
                  {...c}
                  {...emailProps}
                  className="input"
                  type="email"
                  maxLength={254}
                  autoComplete="username"
                  autoFocus
                />
              )}
            </FormField>
            <FormField label="Password" required error={form.errorFor('password')}>
              {(c) => (
                <PasswordInput
                  {...c}
                  {...passwordProps}
                  toggleLabel="password"
                  maxLength={72}
                  autoComplete="current-password"
                />
              )}
            </FormField>
            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              <LogIn size={16} /> {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="login__help">Forgot your password? Ask another administrator to reset it.</p>
        </div>
      </section>
    </main>
  )
}
