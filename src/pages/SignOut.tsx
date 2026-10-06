import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentAdmin } from '../hooks/session'
import { signOutAdmin } from '../lib/auth'

/**
 * Ends the session and goes to the login page. It lives outside the route guard on purpose: if the
 * session ended while a protected page was still mounted, the guard would redirect to /login on its own
 * and remember that page, so the next sign-in would send someone back to it.
 */
export default function SignOut() {
  const { admin } = useCurrentAdmin()
  // Only say "signed out" if there was a session to end (not when /logout is opened while signed out).
  const [wasSignedIn] = useState(admin !== null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Wait for the sign-out to finish before going to /login, or the login page would still see a session.
    void signOutAdmin().finally(() => setDone(true))
  }, [])

  if (!done) return null
  return <Navigate to="/login" replace state={{ signedOut: wasSignedIn }} />
}
