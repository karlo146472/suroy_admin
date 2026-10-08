import { USER_ROLES, type UserRecord, type UserRole } from './users'

/** The only thing an administrator can change about a user. Name and email are shown read-only. */
export interface UserFormValues {
  role: UserRole
}

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>

/** Pre-fills the form from an existing user. */
export function valuesFromUser(user: UserRecord): UserFormValues {
  return { role: user.role }
}

/** Rules every password must meet; an empty password is checked by the caller. */
export function passwordStrengthError(password: string, email: string): string | undefined {
  if (/\s/.test(password)) return 'Password cannot contain spaces.'
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (password.length > 72) return 'Password must be 72 characters or fewer.'
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password))
    return 'Include an uppercase letter, a lowercase letter and a number.'
  if (email && password.toLowerCase() === email) return 'Password cannot be the same as the email.'
  const emailName = email.split('@')[0]
  if (emailName.length >= 4 && password.toLowerCase().includes(emailName)) return 'Password cannot contain the email name.'
  return undefined
}

interface ValidateOptions {
  /** True when editing the only administrator, who must stay an administrator. */
  protectLastAdmin?: boolean
}

/** Returns an error message per invalid field; an empty object means the form is valid. */
export function validateUser(values: UserFormValues, { protectLastAdmin = false }: ValidateOptions = {}): UserFormErrors {
  const errors: UserFormErrors = {}

  if (!USER_ROLES.includes(values.role)) errors.role = 'Choose a role.'
  else if (protectLastAdmin && values.role !== 'Tourism Administrator')
    errors.role = 'This is the only administrator. Make someone else an administrator first.'

  return errors
}
