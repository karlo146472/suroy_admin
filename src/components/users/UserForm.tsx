import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { validateUser, type UserFormValues } from '../../lib/userForm'
import { USER_ROLES, type UserRole } from '../../lib/users'
import { FormField } from '../ui'

interface UserFormProps {
  initialValues: UserFormValues
  /** Shown read-only: a person's name is theirs to change, not an administrator's. */
  name: string
  /** Shown read-only: the sign-in email is managed by Supabase Auth and cannot be changed here. */
  email: string
  /** May be async; the form ignores further submits until it finishes. */
  onSubmit: (values: UserFormValues) => void | Promise<void>
  formId: string
  /** Editing the only administrator: they must stay an administrator. */
  protectLastAdmin?: boolean
}

/** The buttons live in the host (a modal footer) and submit this form through its `form` attribute. */
export default function UserForm({ initialValues, name, email, onSubmit, formId, protectLastAdmin = false }: UserFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<UserFormValues>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<keyof UserFormValues, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const errors = useMemo(() => validateUser(values, { protectLastAdmin }), [values, protectLastAdmin])
  const errorFor = (key: keyof UserFormValues) => (submitted || touched[key] ? errors[key] : undefined)

  // The role is the only editable field.
  const roleProps = {
    value: values.role,
    onChange: (e: ChangeEvent<HTMLSelectElement>) => setValues({ role: e.target.value as UserRole }),
    onBlur: () => setTouched({ role: true }),
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSubmitted(true)
    if (Object.keys(errors).length > 0) {
      // Wait a frame so the error state (and aria-invalid) has rendered before focusing.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    try {
      await onSubmit(values)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form id={formId} ref={formRef} className="form-stack" onSubmit={handleSubmit} noValidate autoComplete="off">
      <FormField label="Full name" hint="The name cannot be changed here.">
        {(c) => <input {...c} className="input" type="text" value={name} readOnly />}
      </FormField>
      <FormField label="Email" hint="The sign-in email cannot be changed here.">
        {(c) => <input {...c} className="input" type="email" value={email} readOnly />}
      </FormField>
      <FormField
        label="Role"
        required
        error={errorFor('role')}
        hint={
          protectLastAdmin
            ? 'The only administrator, so the role is locked in until another administrator exists.'
            : values.role === 'Tourism Administrator'
              ? 'Only administrators can change roles. Administrators can manage all content and users.'
              : 'Only administrators can change roles.'
        }
      >
        {(c) => (
          <select {...c} className="input" {...roleProps}>
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
      </FormField>
    </form>
  )
}
