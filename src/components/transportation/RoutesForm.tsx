import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  emptyModeDetails,
  isMultiValid,
  validateRoutes,
  type ModeDetails,
  type MultiRouteValues,
} from '../../lib/routeForm'
import { isFreeTransport, ROUTE_ORIGIN, transportKey, TRANSPORT_TYPES, type RouteRecord } from '../../lib/transportation'
import { FormField } from '../ui'

interface RoutesFormProps {
  formId: string
  /** Destinations a route can go to. */
  destinations: { id: number; name: string }[]
  /** Routes that already exist, so a way already recorded for a destination can't be added twice. */
  existingRoutes: RouteRecord[]
  /** May be async; the form ignores further submits until it finishes. */
  onSubmit: (values: MultiRouteValues) => void | Promise<void>
}

/**
 * Add the ways of getting to one destination in one go: pick the destination, tick every way that really goes
 * there (as many as it has), then fill in the fare, travel time and instructions of each one that is ticked.
 * Travelers will only be offered the ways that are ticked here.
 */
export default function RoutesForm({ formId, destinations, existingRoutes, onSubmit }: RoutesFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [destinationId, setDestinationId] = useState('')
  // The chosen ways, and what has been typed for each (kept when a way is unticked and ticked again).
  const [chosen, setChosen] = useState<string[]>([])
  const [details, setDetails] = useState<Record<string, ModeDetails>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const values: MultiRouteValues = useMemo(
    () => ({
      destinationId,
      modes: Object.fromEntries(chosen.map((mode) => [mode, details[mode] ?? emptyModeDetails])),
    }),
    [destinationId, chosen, details],
  )

  const errors = useMemo(
    () =>
      validateRoutes(
        values,
        destinations.map((d) => d.id),
        TRANSPORT_TYPES,
        existingRoutes,
      ),
    [values, destinations, existingRoutes],
  )

  // Ways that already exist for the chosen destination can't be ticked again.
  const alreadyAdded = useMemo(
    () =>
      new Set(
        existingRoutes
          .filter((r) => destinationId !== '' && r.destinationId === Number(destinationId))
          .map((r) => transportKey(r.transportType)),
      ),
    [existingRoutes, destinationId],
  )

  const changeDestination = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value
    setDestinationId(next)
    // Drop ticks that this destination already has.
    const taken = new Set(
      existingRoutes.filter((r) => next !== '' && r.destinationId === Number(next)).map((r) => transportKey(r.transportType)),
    )
    setChosen((list) => list.filter((mode) => !taken.has(transportKey(mode))))
  }

  const toggleMode = (mode: string) =>
    setChosen((list) =>
      list.includes(mode) ? list.filter((m) => m !== mode) : TRANSPORT_TYPES.filter((m) => list.includes(m) || m === mode),
    )

  // Motorcycle and Habal-habal are the same ride, so ticking one switches the other off.
  const blockedByTwin = (mode: string) =>
    transportKey(mode) === 'Motorcycle' && chosen.some((m) => m !== mode && transportKey(m) === 'Motorcycle')

  const setField = (mode: string, field: keyof ModeDetails, value: string) =>
    setDetails((all) => ({ ...all, [mode]: { ...(all[mode] ?? emptyModeDetails), [field]: value } }))
  const touch = (mode: string, field: keyof ModeDetails) => setTouched((t) => ({ ...t, [`${mode}.${field}`]: true }))
  const errorFor = (mode: string, field: keyof ModeDetails) =>
    submitted || touched[`${mode}.${field}`] ? errors.byMode[mode]?.[field] : undefined

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSubmitted(true)
    if (!isMultiValid(errors)) {
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
        <h2 className="form-card__title">Destination and ways of getting there</h2>
        <div className="form-grid">
          <FormField label="Origin" hint="Every route starts from the town center.">
            {(c) => <input {...c} className="input" type="text" value={ROUTE_ORIGIN} readOnly />}
          </FormField>
          <FormField label="Destination" required error={submitted ? errors.destinationId : undefined}>
            {(c) => (
              <select {...c} className="input" value={destinationId} onChange={changeDestination}>
                <option value="">Select a destination</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <div className="form-grid__full">
            <fieldset className="check-group">
              <legend className="form-field__label">Ways of getting there *</legend>
              <p className="form-field__hint">
                Tick every way that goes to this destination, as many as it has. Travelers will only be offered the ones
                you tick. Habal-habal and Motorcycle are the same ride: use Habal-habal for hilly places and Motorcycle in
                town.
              </p>
              <div className="check-grid">
                {TRANSPORT_TYPES.map((mode) => {
                  const taken = alreadyAdded.has(transportKey(mode))
                  const disabled = taken || blockedByTwin(mode)
                  return (
                    <label key={mode} className="check-item" aria-disabled={disabled}>
                      <input type="checkbox" checked={chosen.includes(mode)} disabled={disabled} onChange={() => toggleMode(mode)} />
                      {mode}
                      {taken ? ' (already added)' : ''}
                    </label>
                  )
                })}
              </div>
              {submitted && errors.modes ? (
                <p className="form-field__error" role="alert">
                  {errors.modes}
                </p>
              ) : null}
            </fieldset>
          </div>
        </div>
      </section>

      {chosen.map((mode) => (
        <section key={mode} className="form-card">
          <h2 className="form-card__title">{mode}</h2>
          <div className="form-grid">
            {errors.byMode[mode]?.transportType ? (
              <div className="form-grid__full">
                <div className="notice notice--error" role="alert">
                  {errors.byMode[mode]?.transportType}
                </div>
              </div>
            ) : null}

            {isFreeTransport(mode) ? (
              <div className="form-grid__full">
                <div className="notice notice--info" role="status">
                  A personal car is free for the traveler, so there is no fare to enter. It will show as “Free”.
                </div>
              </div>
            ) : (
              <>
                <FormField label="Estimated minimum fare (PHP)" required error={errorFor(mode, 'fareMin')} hint="Per person, one way, from Poblacion.">
                  {(c) => (
                    <input
                      {...c}
                      className="input"
                      type="text"
                      inputMode="decimal"
                      value={details[mode]?.fareMin ?? ''}
                      onChange={(e) => setField(mode, 'fareMin', e.target.value)}
                      onBlur={() => touch(mode, 'fareMin')}
                    />
                  )}
                </FormField>
                <FormField label="Estimated maximum fare (PHP)" required error={errorFor(mode, 'fareMax')} hint="Use the same amount if the fare is fixed.">
                  {(c) => (
                    <input
                      {...c}
                      className="input"
                      type="text"
                      inputMode="decimal"
                      value={details[mode]?.fareMax ?? ''}
                      onChange={(e) => setField(mode, 'fareMax', e.target.value)}
                      onBlur={() => touch(mode, 'fareMax')}
                    />
                  )}
                </FormField>
              </>
            )}

            <FormField label="Estimated travel time" required error={errorFor(mode, 'duration')} hint="e.g. 25-40 minutes">
              {(c) => (
                <input
                  {...c}
                  className="input"
                  type="text"
                  maxLength={60}
                  value={details[mode]?.duration ?? ''}
                  onChange={(e) => setField(mode, 'duration', e.target.value)}
                  onBlur={() => touch(mode, 'duration')}
                />
              )}
            </FormField>
            <div className="form-grid__full">
              <FormField
                label="Instructions"
                required
                error={errorFor(mode, 'instructions')}
                hint={`${(details[mode]?.instructions ?? '').trim().length}/1000 characters (minimum 10). Tell travelers how to get there by ${mode.toLowerCase()}.`}
              >
                {(c) => (
                  <textarea
                    {...c}
                    className="input"
                    rows={3}
                    maxLength={1000}
                    value={details[mode]?.instructions ?? ''}
                    onChange={(e) => setField(mode, 'instructions', e.target.value)}
                    onBlur={() => touch(mode, 'instructions')}
                  />
                )}
              </FormField>
            </div>
          </div>
        </section>
      ))}

      {saving ? <p className="form-field__hint">Saving...</p> : null}
    </form>
  )
}
