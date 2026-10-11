import { isFreeTransport, transportKey, type RouteInput, type RouteRecord } from './transportation'

export interface RouteFormValues {
  /** The chosen destination's id, as the text of the <select>. */
  destinationId: string
  transportType: string
  fareMin: string
  fareMax: string
  /** Free text, e.g. "25-40 minutes". */
  duration: string
  instructions: string
}

export type RouteFormErrors = Partial<Record<keyof RouteFormValues, string>>

export const emptyRouteForm: RouteFormValues = {
  destinationId: '',
  transportType: '',
  fareMin: '',
  fareMax: '',
  duration: '',
  instructions: '',
}

/** Pre-fills the form from an existing route (used by Edit). */
export function valuesFromRecord(record: RouteRecord): RouteFormValues {
  return {
    destinationId: record.destinationId === null ? '' : String(record.destinationId),
    transportType: record.transportType,
    fareMin: String(record.fareMin),
    fareMax: String(record.fareMax),
    duration: record.duration,
    instructions: record.instructions,
  }
}

/** Converts validated form values into the shape stored for a route. */
export function inputFromValues(values: RouteFormValues): RouteInput {
  const free = isFreeTransport(values.transportType)
  return {
    destinationId: Number(values.destinationId),
    transportType: values.transportType,
    // The traveler's own car is free: no fare is asked for, and it is stored as 0.
    fareMin: free ? 0 : Number(values.fareMin),
    fareMax: free ? 0 : Number(values.fareMax),
    duration: values.duration.trim(),
    instructions: values.instructions.trim(),
  }
}

const parseNumber = (text: string) => (text.trim() === '' ? NaN : Number(text))

// --- Adding several ways of getting to one destination at once ---

/** What the admin fills in for one way of getting there. */
export interface ModeDetails {
  fareMin: string
  fareMax: string
  duration: string
  instructions: string
}

export const emptyModeDetails: ModeDetails = { fareMin: '', fareMax: '', duration: '', instructions: '' }

/** One destination and any number of ways of getting there (the keys of `modes` are the chosen ones). */
export interface MultiRouteValues {
  destinationId: string
  modes: Record<string, ModeDetails>
}

export interface MultiRouteErrors {
  destinationId?: string
  /** About the choice of ways as a whole, e.g. none chosen. */
  modes?: string
  /** Problems inside one chosen way, by its name. */
  byMode: Record<string, Partial<Record<keyof ModeDetails | 'transportType', string>>>
}

/** Converts validated values into one route per chosen way. */
export function inputsFromMulti(values: MultiRouteValues): RouteInput[] {
  return Object.entries(values.modes).map(([transportType, details]) =>
    inputFromValues({ destinationId: values.destinationId, transportType, ...details }),
  )
}

/** True when there is nothing to fix. */
export const isMultiValid = (errors: MultiRouteErrors) =>
  !errors.destinationId && !errors.modes && Object.keys(errors.byMode).length === 0

/**
 * Checks a destination with several ways of getting there. Every chosen way is checked like a single route (fares
 * unless it is free, duration, instructions, and not already recorded for the destination), and Motorcycle and
 * Habal-habal can't both be chosen because they are the same ride.
 */
export function validateRoutes(
  values: MultiRouteValues,
  destinationIds: number[],
  transportTypes: string[],
  existing: RouteRecord[],
): MultiRouteErrors {
  const errors: MultiRouteErrors = { byMode: {} }

  if (!values.destinationId) errors.destinationId = 'Choose the destination these routes go to.'
  else if (!destinationIds.includes(Number(values.destinationId))) errors.destinationId = 'Choose a destination from the list.'

  const chosen = Object.keys(values.modes)
  if (chosen.length === 0) errors.modes = 'Choose at least one way of getting there.'

  const seen = new Set<string>()
  for (const transportType of chosen) {
    const problems = validateRoute({ destinationId: values.destinationId, transportType, ...values.modes[transportType] }, destinationIds, transportTypes, existing)
    // The destination is reported once, above; everything else belongs to this way.
    const own = { ...problems }
    delete own.destinationId
    const key = transportKey(transportType)
    if (seen.has(key)) own.transportType = 'Motorcycle and Habal-habal are the same ride. Choose only one of them.'
    seen.add(key)
    if (Object.keys(own).length > 0) errors.byMode[transportType] = own
  }
  return errors
}

/** Returns an error message per invalid field; an empty object means the form is valid. */
export function validateRoute(
  values: RouteFormValues,
  destinationIds: number[],
  transportTypes: string[],
  existing: RouteRecord[],
  /** The id of the route being edited, so it isn't counted as a duplicate of itself. */
  editingId?: number,
): RouteFormErrors {
  const errors: RouteFormErrors = {}

  if (!values.destinationId) errors.destinationId = 'Choose the destination this route goes to.'
  else if (!destinationIds.includes(Number(values.destinationId))) errors.destinationId = 'Choose a destination from the list.'

  if (!values.transportType) errors.transportType = 'Choose a transport type.'
  else if (!transportTypes.includes(values.transportType)) errors.transportType = 'Choose a transport type from the list.'
  else if (
    values.destinationId &&
    existing.some(
      (r) =>
        r.destinationId === Number(values.destinationId) &&
        transportKey(r.transportType) === transportKey(values.transportType) &&
        // When editing a route, its own saved copy is not a duplicate.
        !(editingId !== undefined && r.id === editingId),
    )
  )
    errors.transportType =
      transportKey(values.transportType) === 'Motorcycle'
        ? 'This destination already has Motorcycle or Habal-habal (the same ride). Edit that one instead.'
        : 'This destination already has a route with this transport type.'

  // A personal car is free, so there is no fare to check.
  if (!isFreeTransport(values.transportType)) {
    const min = parseNumber(values.fareMin)
    if (values.fareMin.trim() === '') errors.fareMin = 'Enter the minimum fare.'
    else if (Number.isNaN(min)) errors.fareMin = 'Minimum fare must be a number.'
    else if (min < 0) errors.fareMin = 'Fare cannot be negative.'
    else if (min > 10000) errors.fareMin = 'Fare looks too high.'

    const max = parseNumber(values.fareMax)
    if (values.fareMax.trim() === '') errors.fareMax = 'Enter the maximum fare.'
    else if (Number.isNaN(max)) errors.fareMax = 'Maximum fare must be a number.'
    else if (max < 0) errors.fareMax = 'Fare cannot be negative.'
    else if (max > 10000) errors.fareMax = 'Fare looks too high.'
    else if (!errors.fareMin && max < min) errors.fareMax = 'Maximum fare cannot be lower than the minimum.'
  }

  const duration = values.duration.trim()
  if (!duration) errors.duration = 'Enter the estimated travel time, e.g. 25-40 minutes.'
  else if (duration.length > 60) errors.duration = 'Keep this to 60 characters or fewer.'

  const instructions = values.instructions.trim()
  if (!instructions) errors.instructions = 'Enter the route instructions.'
  else if (instructions.length < 10) errors.instructions = 'Instructions must be at least 10 characters.'
  else if (instructions.length > 1000) errors.instructions = 'Instructions must be 1000 characters or fewer.'

  return errors
}
