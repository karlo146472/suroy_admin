import { Compass, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FormField, PasswordInput } from '../components/ui'
import { useCurrentAdmin } from '../hooks/session'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSectionForm } from '../hooks/useSectionForm'
import { safeRedirectPath, signInAdmin } from '../lib/auth'
import { validateLogin, type LoginValues } from '../lib/settingsForm'

const emptyLogin: LoginValues = { email: '', password: '' }

/** Full-screen sign-in, deliberately outside the dashboard layout (no sidebar or header). */
export default function Login() {
  const navigate = useNavigate()
  useDocumentTitle('Admin Sign In · SUROY')
  const { admin, isLoading } = useCurrentAdmin()
  // RequireAdmin passes the page the visitor was trying to open; go back there after signing in.
  const routeState = useLocation().state as { from?: string; signedOut?: boolean } | null
  const destination = safeRedirectPath(routeState?.from)
  const form = useSectionForm<LoginValues>(emptyLogin, validateLogin)
  // A problem with the credentials themselves, shown above the form until the user edits a field.
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const emailProps = form.fieldProps('email')
  const passwordProps = form.fieldProps('password')

  // Already signed in: there is nothing to do here.
  if (admin) return <Navigate to={destination} replace />
  // A saved session is still being checked; showing the form now would flash it for a moment.
  if (isLoading) return null

  return (
    <main className="login">
      <aside className="login__brand">
        <span className="login__logo">
          <Compass size={24} />
        </span>
        <h1 className="login__brand-name">SUROY</h1>
        <p className="login__brand-sub">Tourism Admin</p>
        <p className="login__tagline">
          Manage destinations, transportation routes and users for Santo Tomas, Davao del Norte.
        </p>
      </aside>

      <section className="login__panel">
        <div className="login__card">
          <div className="login__mobile-brand">
            <span className="login__logo login__logo--small">
              <Compass size={20} />
            </span>
            <span>
              <strong>SUROY</strong> Tourism Admin
            </span>
          </div>

          <h2 className="login__title">Admin sign in</h2>
          <p className="login__subtitle">Sign in with your administrator account to continue.</p>

          {error ? (
            <div className="notice notice--error" role="alert">
              {error}
            </div>
          ) : (
            routeState?.signedOut && (
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
                  onChange={(e) => {
                    setError(null)
                    emailProps.onChange(e)
                  }}
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
                  onChange={(e) => {
                    setError(null)
                    passwordProps.onChange(e)
                  }}
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
