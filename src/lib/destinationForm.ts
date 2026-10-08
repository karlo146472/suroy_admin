import { EXPENSE_TYPES, type DestinationRecord, type DestinationStatus, type ExpenseType } from './destinationTypes'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from './destinationImages'

export const ACTIVITY_OPTIONS = [
  'Hiking',
  'Swimming',
  'Camping',
  'Photography',
  'Picnic',
  'Bird watching',
  'Zip line',
  'Farm tour',
]

export const FACILITY_OPTIONS = [
  'Parking',
  'Restrooms',
  'Cottages',
  'Food stalls',
  'Guide service',
  'Wi-Fi',
  'Changing rooms',
  'Souvenir shop',
]

export const STATUS_OPTIONS: DestinationStatus[] = ['Standard', 'Featured']

export { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES }

export { EXPENSE_TYPES }

/** One cost row in the form. The amount is text while it is being typed. */
export interface ExpenseValues {
  type: ExpenseType
  amount: string
  description: string
}

/** Categories whose real cost is mostly a room or a meal, so they should have at least one cost row. */
export const PRICED_ON_SITE_CATEGORIES = ['Accommodation', 'Food']

export interface DestinationFormValues {
  name: string
  category: string
  description: string
  barangay: string
  latitude: string
  longitude: string
  entranceFee: string
  operatingHours: string
  contact: string
  activities: string[]
  facilities: string[]
  status: DestinationStatus
  /** Typical on-site costs per person (a meal, a room, an activity). */
  expenses: ExpenseValues[]
  /** A photo chosen in this form, not yet uploaded. */
  image: File | null
  /** The destination's existing photo to keep; null when it has none or the admin removed it. */
  imageUrl: string | null
}

export type FormErrors = Partial<Record<keyof DestinationFormValues, string>>

export const emptyDestinationForm: DestinationFormValues = {
  name: '',
  category: '',
  description: '',
  barangay: '',
  latitude: '',
  longitude: '',
  entranceFee: '0',
  operatingHours: '',
  contact: '',
  activities: [],
  facilities: [],
  status: 'Standard',
  expenses: [],
  image: null,
  imageUrl: null,
}

/** Pre-fills the form from an existing destination (used by Edit). */
export function valuesFromRecord(record: DestinationRecord): DestinationFormValues {
  return {
    name: record.name,
    category: record.category,
    description: record.description ?? '',
    barangay: record.barangay,
    latitude: String(record.latitude),
    longitude: String(record.longitude),
    entranceFee: String(record.entranceFee),
    operatingHours: record.operatingHours,
    contact: record.contactInformation ?? '',
    activities: record.activities ?? [],
    facilities: record.facilities ?? [],
    status: record.status,
    expenses: (record.expenses ?? []).map((expense) => ({
      type: expense.type,
      amount: String(expense.amount),
      description: expense.description,
    })),
    image: null,
    imageUrl: record.imageUrl ?? null,
  }
}

/** Converts validated form values into the shape stored for a destination. */
export function recordFromValues(values: DestinationFormValues): Omit<DestinationRecord, 'id'> {
  return {
    name: values.name.trim(),
    category: values.category,
    description: values.description.trim(),
    barangay: values.barangay.trim(),
    latitude: Number(values.latitude),
    longitude: Number(values.longitude),
    entranceFee: Number(values.entranceFee),
    operatingHours: values.operatingHours.trim(),
    contactInformation: values.contact.trim() || undefined,
    activities: values.activities,
    facilities: values.facilities,
    status: values.status,
    expenses: values.expenses.map((expense) => ({
      type: expense.type,
      amount: Number(expense.amount),
      description: expense.description.trim(),
    })),
    imageUrl: values.imageUrl ?? undefined,
  }
}

const EMAIL =/^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_CHARS = /^\+?[\d\s()-]+$/

function parseNumber(text: string): number {
  return text.trim() === '' ? NaN : Number(text)
}

/** Returns an error message per invalid field; an empty object means the form is valid. */
export function validateDestination(
  values: DestinationFormValues,
  categories: string[],
  existingNames: string[],
): FormErrors {
  const errors: FormErrors = {}

  const name = values.name.trim()
  if (!name) errors.name = 'Enter the destination name.'
  else if (name.length < 3) errors.name = 'Name must be at least 3 characters.'
  else if (name.length > 100) errors.name = 'Name must be 100 characters or fewer.'
  else if (existingNames.some((n) => n.trim().toLowerCase() === name.toLowerCase()))
    errors.name = 'A destination with this name already exists.'

  if (!values.category) errors.category = 'Choose a category.'
  else if (!categories.includes(values.category)) errors.category = 'Choose a category from the list.'

  const description = values.description.trim()
  if (!description) errors.description = 'Enter a description.'
  else if (description.length < 20) errors.description = 'Description must be at least 20 characters.'
  else if (description.length > 1000) errors.description = 'Description must be 1000 characters or fewer.'

  const barangay = values.barangay.trim()
  if (!barangay) errors.barangay = 'Enter the barangay or address.'
  else if (barangay.length > 120) errors.barangay = 'Keep this to 120 characters or fewer.'

  const lat = parseNumber(values.latitude)
  if (values.latitude.trim() === '') errors.latitude = 'Enter the latitude.'
  else if (Number.isNaN(lat)) errors.latitude = 'Latitude must be a number, e.g. 7.5333.'
  else if (lat < 4.5 || lat > 21.5) errors.latitude = 'Latitude must be within the Philippines (4.5 to 21.5).'

  const lng = parseNumber(values.longitude)
  if (values.longitude.trim() === '') errors.longitude = 'Enter the longitude.'
  else if (Number.isNaN(lng)) errors.longitude = 'Longitude must be a number, e.g. 125.6167.'
  else if (lng < 116 || lng > 127) errors.longitude = 'Longitude must be within the Philippines (116 to 127).'

  const fee = parseNumber(values.entranceFee)
  if (values.entranceFee.trim() === '') errors.entranceFee = 'Enter the fee, or 0 if free.'
  else if (Number.isNaN(fee)) errors.entranceFee = 'Entrance fee must be a number.'
  else if (fee < 0) errors.entranceFee = 'Entrance fee cannot be negative.'
  else if (fee > 100000) errors.entranceFee = 'Entrance fee looks too high.'

  const hours = values.operatingHours.trim()
  if (!hours) errors.operatingHours = 'Enter the opening hours, e.g. 8:00 AM - 5:00 PM.'
  else if (hours.length > 60) errors.operatingHours = 'Keep this to 60 characters or fewer.'

  const contact = values.contact.trim()
  if (contact) {
    const digits = contact.replace(/\D/g, '').length
    const isPhone = PHONE_CHARS.test(contact) && digits >= 7 && digits <= 15
    if (!isPhone && !EMAIL.test(contact)) errors.contact = 'Enter a valid phone number or email address.'
  }

  for (const [index, expense] of values.expenses.entries()) {
    const amount = parseNumber(expense.amount)
    if (expense.amount.trim() === '' || Number.isNaN(amount) || amount <= 0) {
      errors.expenses = `Cost ${index + 1}: enter an amount above 0, or remove the row.`
      break
    }
    if (amount > 100000) {
      errors.expenses = `Cost ${index + 1}: the amount looks too high.`
      break
    }
    if (expense.description.trim().length > 80) {
      errors.expenses = `Cost ${index + 1}: keep the note to 80 characters or fewer.`
      break
    }
  }

  if (values.image) {
    if (!ALLOWED_IMAGE_TYPES.includes(values.image.type)) errors.image = 'Use a JPG, PNG or WebP photo.'
    else if (values.image.size > MAX_IMAGE_BYTES) errors.image = 'The photo is larger than 5 MB.'
  }

  return errors
}
