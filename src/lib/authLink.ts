/**
 * Helpers for the public pages that travelers land on from the links in the mobile app's emails
 * (confirm your email, reset your password).
 */

/**
 * Supabase adds the problem to the link's address when it can't be used (for example
 * "#error=access_denied&error_code=otp_expired"). Returns a sentence for it, or null when the link is fine.
 */
export function linkProblem(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  if (!params.has('error') && !params.has('error_code')) return null
  return params.get('error_code') === 'otp_expired'
    ? 'This link has expired or was already used.'
    : (params.get('error_description')?.replace(/\+/g, ' ') ?? 'This link could not be used.')
}

/** What the link in a password-reset email carries in its address: the temporary sign-in, or a problem. */
export type RecoveryLink =
  | { kind: 'ok'; accessToken: string; refreshToken: string }
  | { kind: 'problem'; message: string }

/**
 * Reads the address of a password-reset link (for example "#access_token=…&refresh_token=…&type=recovery").
 * It is not a usable reset link when it carries a problem, or no tokens, or is not a recovery link.
 */
export function parseRecoveryLink(hash: string): RecoveryLink {
  const problem = linkProblem(hash)
  if (problem) return { kind: 'problem', message: problem }
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (params.get('type') !== 'recovery' || !accessToken || !refreshToken) {
    return { kind: 'problem', message: 'This is not a password reset link, or it was already used.' }
  }
  return { kind: 'ok', accessToken, refreshToken }
}

/** The traveler's password rules, the same as in the mobile app (at least 6 characters, typed twice). */
export const MIN_TRAVELER_PASSWORD = 6

export function newPasswordErrors(password: string, confirm: string): { password?: string; confirm?: string } {
  const errors: { password?: string; confirm?: string } = {}
  if (!password) errors.password = 'Enter a new password.'
  else if (password.length < MIN_TRAVELER_PASSWORD) errors.password = `Password must be at least ${MIN_TRAVELER_PASSWORD} characters.`
  if (!confirm) errors.confirm = 'Re-enter the new password.'
  else if (confirm !== password) errors.confirm = 'The passwords do not match.'
  return errors
}

/** True on the page where a traveler chooses a new password after tapping the link in the reset email. */
export const isPasswordResetPage = (pathname: string) => pathname.replace(/\/+$/, '') === '/reset-password'
