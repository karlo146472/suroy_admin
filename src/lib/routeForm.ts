import type { RouteInput, RouteRecord } from './transportation'

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
  return {
    destinationId: Number(values.destinationId),
    transportType: values.transportType,
    fareMin: Number(values.fareMin),
    fareMax: Number(values.fareMax),
    duration: values.duration.trim(),
    instructions: values.instructions.trim(),
  }
}

const parseNumber = (text: string) => (text.trim() === '' ? NaN : Number(text))

/** Returns an error message per invalid field; an empty object means the form is valid. */
export function validateRoute(
  values: RouteFormValues,
  destinationIds: number[],
  transportTypes: string[],
  existing: RouteRecord[],
): RouteFormErrors {
  const errors: RouteFormErrors = {}

  if (!values.destinationId) errors.destinationId = 'Choose the destination this route goes to.'
  else if (!destinationIds.includes(Number(values.destinationId))) errors.destinationId = 'Choose a destination from the list.'

  if (!values.transportType) errors.transportType = 'Choose a transport type.'
  else if (!transportTypes.includes(values.transportType)) errors.transportType = 'Choose a transport type from the list.'
  else if (
    values.destinationId &&
    existing.some((r) => r.destinationId === Number(values.destinationId) && r.transportType === values.transportType)
  )
    errors.transportType = 'This destination already has a route with this transport type.'

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

  const duration = values.duration.trim()
  if (!duration) errors.duration = 'Enter the estimated travel time, e.g. 25-40 minutes.'
  else if (duration.length > 60) errors.duration = 'Keep this to 60 characters or fewer.'

  const instructions = values.instructions.trim()
  if (!instructions) errors.instructions = 'Enter the route instructions.'
  else if (instructions.length < 10) errors.instructions = 'Instructions must be at least 10 characters.'
  else if (instructions.length > 1000) errors.instructions = 'Instructions must be 1000 characters or fewer.'

  return errors
}
