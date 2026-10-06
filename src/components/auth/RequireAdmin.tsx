import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useCurrentAdmin } from '../../hooks/session'
import { LoadingState } from '../ui'

/**
 * Wraps every dashboard route. Signed-out visitors, and accounts that are no longer an active
 * administrator, are sent to the login page and brought back to this page after signing in.
 * This only gates the interface; the server must enforce access too (see hooks/session.ts).
 */
export default function RequireAdmin() {
  const { admin, isLoading } = useCurrentAdmin()
  const location = useLocation()

  // The saved session is still being checked (page reload); don't bounce to /login yet.
  if (isLoading) return <LoadingState label="Checking your session..." />

  if (!admin) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
