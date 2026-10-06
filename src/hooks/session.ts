import type { Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'

// The signed-in administrator, kept in sync with the Supabase Auth session. This only drives what the
// interface shows; the real protection is row-level security in the database (is_admin()), so even a
// tampered browser cannot read or change admin data without an administrator's session.

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'Tourism Administrator'
}

type SessionState = { status: 'loading' } | { status: 'signedOut' } | { status: 'admin'; admin: AdminUser }

let state: SessionState = { status: 'loading' }
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getState = () => state

function setState(next: SessionState) {
  state = next
  listeners.forEach((listener) => listener())
}

/** The administrator's profile, or null when this account is not a Tourism Administrator. Throws if the lookup fails. */
export async function loadAdmin(userId: string): Promise<AdminUser | null> {
  const { data, error } = await supabase.from('profiles').select('id, name, email, role').eq('id', userId).maybeSingle()
  if (error) throw error
  if (!data || data.role !== 'Tourism Administrator') return null
  return { id: data.id, name: data.name, email: data.email, role: 'Tourism Administrator' }
}

export const startSession = (admin: AdminUser) => setState({ status: 'admin', admin })

/** After the administrator renames themselves, so the header shows the new name without a reload. */
export function updateAdminName(name: string) {
  if (state.status === 'admin') setState({ status: 'admin', admin: { ...state.admin, name } })
}
export const endSession = () => setState({ status: 'signedOut' })

// Guards against a slow profile lookup finishing after a newer auth event.
let latestSync = 0

async function syncFromSession(session: Session | null) {
  const thisSync = ++latestSync
  if (!session) {
    setState({ status: 'signedOut' })
    return
  }

  try {
    const admin = await loadAdmin(session.user.id)
    if (thisSync !== latestSync) return
    if (admin) {
      setState({ status: 'admin', admin })
    } else {
      // Signed in, but not as an administrator (for example a traveler account): do not keep that session here.
      setState({ status: 'signedOut' })
      await supabase.auth.signOut()
    }
  } catch {
    // Could not check the role (offline, for example). Stay out of the dashboard, but keep the session so a
    // reload can try again.
    if (thisSync === latestSync) setState({ status: 'signedOut' })
  }
}

// Runs once. It also fires right away with any saved session, which is how a page reload keeps you signed in.
supabase.auth.onAuthStateChange((event, session) => {
  // A refreshed token is still the same person, so there is nothing to look up again.
  if (event === 'TOKEN_REFRESHED') return
  // Deferred because Supabase calls must not run inside this callback itself.
  setTimeout(() => void syncFromSession(session), 0)
})

/** The signed-in administrator (null when signed out) and whether the saved session is still being checked. */
export function useCurrentAdmin(): { admin: AdminUser | null; isLoading: boolean } {
  const current = useSyncExternalStore(subscribe, getState)
  return {
    admin: current.status === 'admin' ? current.admin : null,
    isLoading: current.status === 'loading',
  }
}
