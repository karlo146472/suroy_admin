import { updateAdminName, useCurrentAdmin } from '../../hooks/session'
import { useSectionForm } from '../../hooks/useSectionForm'
import { updateOwnName } from '../../lib/profile'
import { validateProfile, type ProfileValues } from '../../lib/settingsForm'
import { FormField, StatusBadge, useToast } from '../ui'

export default function AdminProfile() {
  const { admin } = useCurrentAdmin()
  const form = useSectionForm<ProfileValues>({ name: admin?.name ?? '' }, validateProfile)
  const toast = useToast()

  if (!admin) return null

  return (
    <section className="form-card" aria-labelledby="profile-title">
      <h2 id="profile-title" className="form-card__title">
        Admin Profile
      </h2>
      <p className="form-card__desc">Your own account details. Your name appears in the header.</p>
      <form
        noValidate
        className="form-stack"
        onSubmit={form.handleSubmit(async (values) => {
          const name = values.name.trim()
          try {
            await updateOwnName(admin.id, name)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Your profile could not be saved. Please try again.')
            return
          }
          updateAdminName(name)
          form.reset({ name })
          toast.success('Profile saved.')
        })}
      >
        <div className="form-grid">
          <FormField label="Full name" required error={form.errorFor('name')}>
            {(c) => <input {...c} className="input" type="text" maxLength={80} autoComplete="name" {...form.fieldProps('name')} />}
          </FormField>
          <FormField label="Email" hint="The email you sign in with. It cannot be changed here.">
            {(c) => <input {...c} className="input" type="email" value={admin.email} readOnly />}
          </FormField>
          <div className="form-field">
            <span className="form-field__label">Role</span>
            <div>
              <StatusBadge tone="info">{admin.role}</StatusBadge>
            </div>
          </div>
        </div>
        <div className="form-actions">
          {form.dirty && (
            <button type="button" className="btn" onClick={() => form.reset()}>
              Discard Changes
            </button>
          )}
          <button type="submit" className="btn btn--primary" disabled={!form.dirty}>
            Save Changes
          </button>
        </div>
      </form>
    </section>
  )
}
