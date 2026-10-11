import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { validateRoute, type RouteFormValues } from '../../lib/routeForm'
import { isFreeTransport, ROUTE_ORIGIN, type RouteRecord } from '../../lib/transportation'
import { FormField } from '../ui'

type TextField = keyof RouteFormValues

interface RouteFormProps {
  initialValues: RouteFormValues
  submitLabel: string
  /** May be async; the form ignores further submits until it finishes. */
  onSubmit: (values: RouteFormValues) => void | Promise<void>
  /** Destinations a route can go to. */
  destinations: { id: number; name: string }[]
  transportTypes: string[]
  /** Routes that already exist, used to reject a duplicate destination + type. */
  existingRoutes: RouteRecord[]
  formId?: string
  showActions?: boolean
}

export default function RouteForm({
  initialValues,
  submitLabel,
  onSubmit,
  destinations,
  transportTypes,
  existingRoutes,
  formId = 'route-form',
  showActions = true,
}: RouteFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<RouteFormValues>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<TextField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const errors = useMemo(
    () =>
      validateRoute(
        values,
        destinations.map((d) => d.id),
        transportTypes,
        existingRoutes,
      ),
    [values, destinations, transportTypes, existingRoutes],
  )

  const errorFor = (key: TextField) => (submitted || touched[key] ? errors[key] : undefined)
  // The traveler's own car costs nothing, so there is no fare to enter for it.
  const free = isFreeTransport(values.transportType)

  const fieldProps = (key: TextField) => ({
    value: values[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
  })

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
    <form id={formId} ref={formRef} className="form-stack" onSubmit={handleSubmit} noValidate>
      <section className="form-card">
        <h2 className="form-card__title">Route</h2>
        <div className="form-grid">
          <FormField label="Origin" hint="Every route starts from the town center.">
            {(c) => <input {...c} className="input" type="text" value={ROUTE_ORIGIN} readOnly />}
          </FormField>
          <FormField label="Destination" required error={errorFor('destinationId')}>
            {(c) => (
              <select {...c} className="input" {...fieldProps('destinationId')}>
                <option value="">Select a destination</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField
            label="Transport type"
            required
            error={errorFor('transportType')}
            hint="Add one route per way of getting there. Travelers will only see the ones you add for this destination. Habal-habal and Motorcycle are the same ride: use Habal-habal for hilly places and Motorcycle in town."
          >
            {(c) => (
              <select {...c} className="input" {...fieldProps('transportType')}>
                <option value="">Select a transport type</option>
                {transportTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
      </section>

      <section className="form-card">
        <h2 className="form-card__title">Fare and Duration</h2>
        <div className="form-grid">
          {free ? (
            <div className="form-grid__full">
              <div className="notice notice--info" role="status">
                A personal car is free for the traveler, so there is no fare to enter. It will show as “Free”.
              </div>
            </div>
          ) : (
            <>
              <FormField label="Estimated minimum fare (PHP)" required error={errorFor('fareMin')} hint="Per person, one way, from Poblacion.">
                {(c) => <input {...c} className="input" type="text" inputMode="decimal" {...fieldProps('fareMin')} />}
              </FormField>
              <FormField
                label="Estimated maximum fare (PHP)"
                required
                error={errorFor('fareMax')}
                hint="Use the same amount if the fare is fixed."
              >
                {(c) => <input {...c} className="input" type="text" inputMode="decimal" {...fieldProps('fareMax')} />}
              </FormField>
            </>
          )}
          <FormField label="Estimated travel time" required error={errorFor('duration')} hint="e.g. 25-40 minutes">
            {(c) => <input {...c} className="input" type="text" maxLength={60} {...fieldProps('duration')} />}
          </FormField>
        </div>
      </section>

      <section className="form-card">
        <h2 className="form-card__title">Route Instructions</h2>
        <FormField
          label="Instructions"
          required
          error={errorFor('instructions')}
          hint={`${values.instructions.trim().length}/1000 characters (minimum 10). Tell travelers how to take this route.`}
        >
          {(c) => <textarea {...c} className="input" rows={4} maxLength={1000} {...fieldProps('instructions')} />}
        </FormField>
      </section>

      {showActions && (
        <div className="form-actions">
          <Link to="/transportation" className="btn">
            Cancel
          </Link>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving...' : submitLabel}
          </button>
        </div>
      )}
    </form>
  )
}
