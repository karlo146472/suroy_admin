import { endSession, loadAdmin, startSession } from '../hooks/session'
import { supabase } from './supabase'

export type SignInResult = { ok: true } | { ok: false; message: string }

const WRONG_CREDENTIALS = 'Incorrect email or password.'

/**
 * Signs in with Supabase Auth, then checks that the account is a Tourism Administrator.
 *
 * Wrong email and wrong password give the same message, so it can't be used to find out which emails exist.
 * The role is only checked after the credentials are right, and a non-administrator is signed straight back out.
 */
export async function signInAdmin(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error || !data.user) {
    if (error && error.status && error.status >= 500) {
      return { ok: false, message: 'The server could not be reached. Please try again in a moment.' }
    }
    if (error && !error.status) {
      return { ok: false, message: 'Could not connect. Check your internet connection and try again.' }
    }
    return { ok: false, message: WRONG_CREDENTIALS }
  }

  try {
    const admin = await loadAdmin(data.user.id)
    if (!admin) {
      await supabase.auth.signOut()
      return { ok: false, message: 'This account does not have access to the admin dashboard.' }
    }
    startSession(admin)
    return { ok: true }
  } catch {
    await supabase.auth.signOut()
    return { ok: false, message: 'Could not check your account. Please try again.' }
  }
}

export async function signOutAdmin() {
  // Leave the dashboard right away, then end the Supabase session.
  endSession()
  await supabase.auth.signOut()
}

/**
 * Where to go after signing in. Only in-app paths are accepted, so a crafted link
 * can't send someone to another site, and the login page never redirects to itself.
 */
export function safeRedirectPath(path: unknown): string {
  if (typeof path !== 'string') return '/'
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return '/'
  if (path === '/login' || path.startsWith('/login?') || path.startsWith('/login/')) return '/'
  return path
}
