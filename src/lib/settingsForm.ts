import { passwordStrengthError } from './userForm'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ---- Admin profile ----

export interface ProfileValues extends Record<string, string> {
  name: string
}

// Letters (any language), spaces, periods, apostrophes and hyphens; must start with a letter.
const PERSON_NAME = /^\p{L}[\p{L}\p{M}\s.'’-]*$/u

export function validateProfile(values: ProfileValues): Partial<Record<keyof ProfileValues, string>> {
  const errors: Partial<Record<keyof ProfileValues, string>> = {}

  const name = values.name.trim()
  if (!name) errors.name = 'Enter your full name.'
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters.'
  else if (name.length > 80) errors.name = 'Name must be 80 characters or fewer.'
  else if (!PERSON_NAME.test(name))
    errors.name = 'Use letters, spaces, periods, apostrophes and hyphens only, starting with a letter.'

  return errors
}

// ---- Change password ----

export interface PasswordValues extends Record<string, string> {
  current: string
  next: string
  confirm: string
}

export const emptyPasswordValues: PasswordValues = { current: '', next: '', confirm: '' }

export interface PasswordCheck {
  label: string
  ok: boolean
}

/** The new-password rules as a live checklist; nothing counts as met until something is typed. */
export function passwordChecklist(next: string, current: string, email: string): PasswordCheck[] {
  const typed = next.length > 0
  const emailName = email.toLowerCase().split('@')[0]
  return [
    { label: 'At least 8 characters', ok: next.length >= 8 },
    { label: 'An uppercase letter', ok: /[A-Z]/.test(next) },
    { label: 'A lowercase letter', ok: /[a-z]/.test(next) },
    { label: 'A number', ok: /\d/.test(next) },
    { label: 'No spaces', ok: typed && !/\s/.test(next) },
    { label: 'Not your email name', ok: typed && !(emailName.length >= 4 && next.toLowerCase().includes(emailName)) },
    { label: 'Different from your current password', ok: typed && next !== current },
  ]
}

export function validatePasswordChange(
  values: PasswordValues,
  email: string,
): Partial<Record<keyof PasswordValues, string>> {
  const errors: Partial<Record<keyof PasswordValues, string>> = {}

  if (!values.current) errors.current = 'Enter your current password.'

  if (!values.next) errors.next = 'Enter a new password.'
  else {
    const strength = passwordStrengthError(values.next, email.toLowerCase())
    if (strength) errors.next = strength
    else if (values.next === values.current) errors.next = 'The new password must be different from the current one.'
  }

  if (!values.confirm) errors.confirm = 'Re-enter the new password.'
  else if (values.confirm !== values.next) errors.confirm = 'The passwords do not match.'

  return errors
}

// ---- Sign in ----

export interface LoginValues extends Record<string, string> {
  email: string
  password: string
}

export function validateLogin(values: LoginValues): Partial<Record<keyof LoginValues, string>> {
  const errors: Partial<Record<keyof LoginValues, string>> = {}

  const email = values.email.trim()
  if (!email) errors.email = 'Enter your email address.'
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = 'Enter a valid email address.'

  if (!values.password) errors.password = 'Enter your password.'

  return errors
}
