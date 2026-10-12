import { CircleAlert, CircleCheck } from 'lucide-react'
import logo from '../assets/suroy-logo.png'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { linkProblem } from '../lib/authLink'

/**
 * The page travelers land on after tapping the link in the SUROY sign-up email. It is public (no administrator
 * sign-in) and only tells them what to do next in the app.
 */
export default function EmailConfirmed() {
  useDocumentTitle('Email confirmed · SUROY')
  const problem = linkProblem(window.location.hash)

  return (
    <main className="login login--center">
      <section className="login__panel">
        <div className="login__card login__card--status">
          <img className="login__logo" src={logo} alt="" aria-hidden="true" />
          {problem ? (
            <>
              <CircleAlert size={40} aria-hidden="true" />
              <h1 className="login__title">Link not valid</h1>
              <p className="login__subtitle">{problem}</p>
              <p>
                Open the SUROY app and try signing in. If it says your email is not confirmed, register again to get a
                new link.
              </p>
            </>
          ) : (
            <>
              <CircleCheck size={40} aria-hidden="true" />
              <h1 className="login__title">Email confirmed</h1>
              <p className="login__subtitle">Your SUROY account is ready.</p>
              <p>Open the SUROY app and sign in with your email and password.</p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
