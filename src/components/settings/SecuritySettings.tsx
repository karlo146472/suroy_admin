import { Check, Circle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useCurrentAdmin } from '../../hooks/session'
import { useSectionForm } from '../../hooks/useSectionForm'
import { changeOwnPassword } from '../../lib/profile'
import {
  emptyPasswordValues,
  passwordChecklist,
  validatePasswordChange,
  type PasswordValues,
} from '../../lib/settingsForm'
import { FormField, PasswordInput, useToast } from '../ui'

export default function SecuritySettings() {
  const { admin } = useCurrentAdmin()
  const email = admin?.email ?? ''
  const validate = useCallback((values: PasswordValues) => validatePasswordChange(values, email), [email])
  const form = useSectionForm<PasswordValues>(emptyPasswordValues, validate)
  // Set when the current password was rejected; cleared as soon as the field is edited.
  const [wrongCurrent, setWrongCurrent] = useState(false)
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  // Changing this remounts the three fields, which puts every show/hide toggle back to hidden.
  const [fieldsKey, setFieldsKey] = useState(0)

  const checklist = passwordChecklist(form.values.next, form.values.current, email)
  const currentProps = form.fieldProps('current')

  return (
    <section className="form-card" aria-labelledby="security-title">
      <h2 id="security-title" className="form-card__title">
        Security
      </h2>
      <p className="form-card__desc">Change the password you use to sign in to this dashboard.</p>
      <form
        noValidate
        autoComplete="off"
        className="form-stack"
        onSubmit={(e) => {
          const formElement = e.currentTarget
          form.handleSubmit(async (values) => {
            if (saving) return
            setSaving(true)
            const result = await changeOwnPassword(email, values.current, values.next)
            setSaving(false)

            if (!result.ok) {
              if (result.reason === 'wrong-password') {
                setWrongCurrent(true)
                requestAnimationFrame(() =>
                  formElement.querySelector<HTMLInputElement>('input[autocomplete="current-password"]')?.focus(),
                )
              } else {
                toast.error(result.message)
              }
              return
            }
            form.reset(emptyPasswordValues)
            setFieldsKey((k) => k + 1)
            setWrongCurrent(false)
            toast.success('Password changed.')
          })(e)
        }}
      >
        <div key={fieldsKey} className="form-stack">
          <FormField
            label="Current password"
            required
            error={wrongCurrent ? 'The current password is incorrect.' : form.errorFor('current')}
          >
            {(c) => (
              <PasswordInput
                {...c}
                {...currentProps}
                toggleLabel="current password"
                autoComplete="current-password"
                onChange={(e) => {
                  setWrongCurrent(false)
                  currentProps.onChange(e)
                }}
              />
            )}
          </FormField>

          <div className="form-grid">
            <div className="form-stack">
              <FormField label="New password" required error={form.errorFor('next')}>
                {(c) => (
                  <PasswordInput
                    {...c}
                    {...form.fieldProps('next')}
                    toggleLabel="new password"
                    maxLength={72}
                    autoComplete="new-password"
                  />
                )}
              </FormField>
              <ul className="pw-rules" aria-label="New password requirements">
                {checklist.map((rule) => (
                  <li key={rule.label} className={rule.ok ? 'is-ok' : undefined}>
                    {rule.ok ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
                    <span>
                      {rule.label}
                      <span className="visually-hidden">{rule.ok ? ' (met)' : ' (not met)'}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <FormField label="Confirm new password" required error={form.errorFor('confirm')}>
              {(c) => (
                <PasswordInput
                  {...c}
                  {...form.fieldProps('confirm')}
                  toggleLabel="confirmation password"
                  maxLength={72}
                  autoComplete="new-password"
                />
              )}
            </FormField>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </section>
  )
}
