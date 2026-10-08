import { ImagePlus, Plus, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SANTO_TOMAS_CENTER } from '../../lib/mapDefaults'
import {
  EXPENSE_TYPES,
  PRICED_ON_SITE_CATEGORIES,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  STATUS_OPTIONS,
  validateDestination,
  type DestinationFormValues,
  type ExpenseValues,
} from '../../lib/destinationForm'
import { FormField, LoadingState } from '../ui'

// Loaded on demand so the map library isn't part of every page's bundle.
const MapView = lazy(() => import('../map/MapView'))

type TextField =
  | 'name'
  | 'category'
  | 'description'
  | 'barangay'
  | 'latitude'
  | 'longitude'
  | 'entranceFee'
  | 'operatingHours'
  | 'contact'
  | 'status'

interface DestinationFormProps {
  initialValues: DestinationFormValues
  /** Names already in use, excluding the destination being edited. */
  existingNames: string[]
  /** Categories, activities and facilities to choose from (read from the database). */
  categoryNames: string[]
  activityOptions: string[]
  facilityOptions: string[]
  submitLabel: string
  /** May be async; the form ignores further submits until it finishes. */
  onSubmit: (values: DestinationFormValues) => void | Promise<void>
  /** Lets a button outside the form (e.g. a modal footer) submit it via its `form` attribute. */
  formId?: string
  /** Hide the built-in Cancel/Save buttons when the host renders its own. */
  showActions?: boolean
}

function CheckboxGroup({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const toggle = (option: string) =>
    onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option])

  return (
    <fieldset className="check-group">
      <legend className="form-field__label">{legend}</legend>
      <div className="check-grid">
        {options.map((option) => (
          <label key={option} className="check-item">
            <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function DestinationForm({
  initialValues,
  existingNames,
  categoryNames: availableCategories,
  activityOptions,
  facilityOptions,
  submitLabel,
  onSubmit,
  formId = 'destination-form',
  showActions = true,
}: DestinationFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<DestinationFormValues>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<keyof DestinationFormValues, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  // The database categories, plus the destination's current one in case it is no longer listed.
  const [categoryNames] = useState(() => {
    const current = initialValues.category
    return current && !availableCategories.includes(current) ? [...availableCategories, current] : availableCategories
  })

  const errors = useMemo(
    () => validateDestination(values, categoryNames, existingNames),
    [values, categoryNames, existingNames],
  )

  // The map opens on the saved location when editing, otherwise on Santo Tomas.
  const [initialView] = useState(() => {
    const lat = Number(initialValues.latitude)
    const lng = Number(initialValues.longitude)
    const hasLocation = initialValues.latitude.trim() !== '' && !Number.isNaN(lat) && !Number.isNaN(lng)
    return hasLocation
      ? { center: [lng, lat] as [number, number], zoom: 14 }
      : { center: SANTO_TOMAS_CENTER, zoom: 11 }
  })

  const hasValidLocation = !errors.latitude && !errors.longitude
  const pin = hasValidLocation ? { latitude: Number(values.latitude), longitude: Number(values.longitude) } : null

  // A chosen photo is previewed from the file itself; otherwise the destination's saved photo is shown.
  const chosenPreview = useMemo(() => (values.image ? URL.createObjectURL(values.image) : null), [values.image])
  useEffect(() => () => {
    if (chosenPreview) URL.revokeObjectURL(chosenPreview)
  }, [chosenPreview])
  const photoUrl = chosenPreview ?? values.imageUrl

  const set = <K extends keyof DestinationFormValues>(key: K, value: DestinationFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))
  const setExpense = (index: number, patch: Partial<ExpenseValues>) =>
    setValues((v) => ({ ...v, expenses: v.expenses.map((expense, i) => (i === index ? { ...expense, ...patch } : expense)) }))
  const markTouched = (key: keyof DestinationFormValues) => setTouched((t) => ({ ...t, [key]: true }))
  const errorFor = (key: keyof DestinationFormValues) => (submitted || touched[key] ? errors[key] : undefined)

  const textProps = (key: TextField) => ({
    value: values[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(key, e.target.value as never),
    onBlur: () => markTouched(key),
  })

  const pickLocation = (latitude: number, longitude: number) => {
    setValues((v) => ({ ...v, latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) }))
    setTouched((t) => ({ ...t, latitude: true, longitude: true }))
  }

  const chooseImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) set('image', file)
    markTouched('image')
    e.target.value = ''
  }

  // Clears both a newly chosen photo and the saved one; the old file is deleted when the form is saved.
  const removeImage = () => setValues((v) => ({ ...v, image: null, imageUrl: null }))

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
        <h2 className="form-card__title">Basic Information</h2>
        <div className="form-grid">
          <FormField label="Name" required error={errorFor('name')}>
            {(c) => <input {...c} className="input" type="text" maxLength={100} {...textProps('name')} />}
          </FormField>
          <FormField label="Category" required error={errorFor('category')}>
            {(c) => (
              <select {...c} className="input" {...textProps('category')}>
                <option value="">Select a category</option>
                {categoryNames.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <div className="form-grid__full">
            <FormField
              label="Description"
              required
              error={errorFor('description')}
              hint={`${values.description.trim().length}/1000 characters (minimum 20)`}
            >
              {(c) => <textarea {...c} className="input" rows={4} maxLength={1000} {...textProps('description')} />}
            </FormField>
          </div>
          <FormField label="Status" hint="Featured destinations are highlighted in the app.">
            {(c) => (
              <select {...c} className="input" {...textProps('status')}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
      </section>

      <section className="form-card">
        <h2 className="form-card__title">Location</h2>
        <div className="form-grid">
          <div className="form-grid__full">
            <FormField label="Barangay / Address" required error={errorFor('barangay')}>
              {(c) => <input {...c} className="input" type="text" maxLength={120} {...textProps('barangay')} />}
            </FormField>
          </div>
          <FormField label="Latitude" required error={errorFor('latitude')} hint="e.g. 7.5333">
            {(c) => <input {...c} className="input" type="text" inputMode="decimal" {...textProps('latitude')} />}
          </FormField>
          <FormField label="Longitude" required error={errorFor('longitude')} hint="e.g. 125.6167">
            {(c) => <input {...c} className="input" type="text" inputMode="decimal" {...textProps('longitude')} />}
          </FormField>
          <div className="form-grid__full">
            <p className="form-field__hint picker-hint">
              Click the map or drag the pin to set the location. Latitude and longitude fill in automatically.
            </p>
            <div className="picker-map">
              <Suspense fallback={<LoadingState label="Loading map..." />}>
                <MapView
                  label="Location map. Click the map or drag the pin to set the location, or type the coordinates."
                  markers={NO_MARKERS}
                  center={initialView.center}
                  zoom={initialView.zoom}
                  height="100%"
                  pin={pin}
                  onPinChange={pickLocation}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <section className="form-card">
        <h2 className="form-card__title">Visit Details</h2>
        <div className="form-grid">
          <FormField label="Entrance fee (PHP)" required error={errorFor('entranceFee')} hint="Enter 0 if free.">
            {(c) => <input {...c} className="input" type="text" inputMode="decimal" {...textProps('entranceFee')} />}
          </FormField>
          <FormField label="Opening hours" required error={errorFor('operatingHours')}>
            {(c) => (
              <input
                {...c}
                className="input"
                type="text"
                maxLength={60}
                placeholder="8:00 AM - 5:00 PM"
                {...textProps('operatingHours')}
              />
            )}
          </FormField>
          <div className="form-grid__full">
            <FormField label="Contact information" error={errorFor('contact')} hint="Phone number or email (optional).">
              {(c) => <input {...c} className="input" type="text" {...textProps('contact')} />}
            </FormField>
          </div>
        </div>
      </section>

      <section className="form-card">
        <h2 className="form-card__title">Costs at the place</h2>
        <p className="form-card__desc">
          What a visitor typically pays on site, per person. The app adds these to the entrance fee and the fare, so
          travelers see the full cost. Meal is one typical meal, and Room is one night.
        </p>
        {PRICED_ON_SITE_CATEGORIES.includes(values.category) && values.expenses.length === 0 && (
          <div className="notice notice--info" role="status">
            Add a {values.category === 'Accommodation' ? 'Room' : 'Meal'} price. Until then this place stays out of
            budget results, because its real cost is not known.
          </div>
        )}
        {values.expenses.length > 0 && (
          <div className="expense-list">
            {values.expenses.map((expense, index) => (
              <div key={index} className="expense-row">
                <select
                  className="input"
                  aria-label={`Cost ${index + 1} type`}
                  value={expense.type}
                  onChange={(e) => setExpense(index, { type: e.target.value as ExpenseValues['type'] })}
                >
                  {EXPENSE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount (PHP)"
                  aria-label={`Cost ${index + 1} amount in pesos`}
                  value={expense.amount}
                  onChange={(e) => setExpense(index, { amount: e.target.value })}
                  onBlur={() => markTouched('expenses')}
                />
                <input
                  className="input"
                  type="text"
                  maxLength={80}
                  placeholder="Note, e.g. fan room"
                  aria-label={`Cost ${index + 1} note`}
                  value={expense.description}
                  onChange={(e) => setExpense(index, { description: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn--small btn--danger-text"
                  aria-label={`Remove cost ${index + 1}`}
                  onClick={() => set('expenses', values.expenses.filter((_, i) => i !== index))}
                >
                  <X size={14} /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
        {errorFor('expenses') && (
          <span className="form-field__error" role="alert">
            {errorFor('expenses')}
          </span>
        )}
        <div>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => set('expenses', [...values.expenses, { type: 'Meal', amount: '', description: '' }])}
          >
            <Plus size={14} /> Add cost
          </button>
        </div>
      </section>

      <section className="form-card">
        <h2 className="form-card__title">Activities and Facilities</h2>
        <div className="form-stack">
          <CheckboxGroup
            legend="Activities"
            options={withSelected(activityOptions, values.activities)}
            selected={values.activities}
            onChange={(next) => set('activities', next)}
          />
          <CheckboxGroup
            legend="Facilities"
            options={withSelected(facilityOptions, values.facilities)}
            selected={values.facilities}
            onChange={(next) => set('facilities', next)}
          />
        </div>
      </section>

      <section className="form-card">
        <h2 className="form-card__title">Photo</h2>
        <FormField
          label="Destination photo"
          error={errorFor('image')}
          hint={`One JPG, PNG or WebP photo, up to ${MAX_IMAGE_BYTES / (1024 * 1024)} MB. It is uploaded when you save.`}
        >
          {(c) => (
            <label className="upload-button">
              <ImagePlus size={16} /> {photoUrl ? 'Replace Photo' : 'Choose Photo'}
              <input
                {...c}
                className="visually-hidden"
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                onChange={chooseImage}
              />
            </label>
          )}
        </FormField>
        {photoUrl && (
          <ul className="image-grid">
            <li className="image-grid__item">
              <img src={photoUrl} alt={values.image?.name ?? `Photo of ${values.name || 'this destination'}`} />
              <button type="button" className="image-grid__remove" aria-label="Remove photo" onClick={removeImage}>
                <X size={14} />
              </button>
            </li>
          </ul>
        )}
      </section>

      {showActions && (
        <div className="form-actions">
          <Link to="/destinations" className="btn">
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

const NO_MARKERS: never[] = []

/** The options, plus any selected value that is missing from them, so nothing is silently dropped. */
const withSelected = (options: string[], selected: string[]) => [...new Set([...options, ...selected])]
