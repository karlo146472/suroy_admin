import { supabase } from './supabase'

/** Changes the signed-in administrator's own display name (allowed by the "update own profile" rule). */
export async function updateOwnName(userId: string, name: string): Promise<void> {
  // Asking for the row back matters: when a policy blocks the change, Supabase returns no error and no rows.
  const { data, error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', userId).select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('Your profile could not be updated.')
}

export type PasswordChangeResult = { ok: true } | { ok: false; reason: 'wrong-password' | 'failed'; message: string }

/** Checks the current password by signing in again, then sets the new one. */
export async function changeOwnPassword(email: string, currentPassword: string, newPassword: string): Promise<PasswordChangeResult> {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
  if (signInError) {
    if (signInError.message.toLowerCase().includes('invalid login credentials')) {
      return { ok: false, reason: 'wrong-password', message: 'The current password is incorrect.' }
    }
    return { ok: false, reason: 'failed', message: 'Could not check your current password. Please try again.' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { ok: false, reason: 'failed', message: error.message }
  return { ok: true }
}
