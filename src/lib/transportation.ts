import { supabase } from './supabase'

/** Suggested types. Routes already in the database may use others, which are offered too. */
export const TRANSPORT_TYPES = ['Habal-habal', 'Tricycle', 'Jeepney', 'Van', 'Bus']

/** The database has no origin column; like the mobile app, every route starts from the town center. */
export const ROUTE_ORIGIN = 'Poblacion'

export interface RouteRecord {
  id: number
  destinationId: number | null
  destinationName: string
  transportType: string
  fareMin: number
  fareMax: number
  /** Free text, e.g. "25-40 minutes". */
  duration: string
  instructions: string
}

export type RouteInput = Omit<RouteRecord, 'id' | 'destinationName'>

interface RouteRow {
  transportation_id: number
  destination_id: number | null
  transportation_type: string | null
  fare_min: string | number | null
  fare_max: string | number | null
  travel_duration: string | null
  instructions: string | null
  destinations: { name: string } | null
}

// PostgREST sends Postgres `numeric` columns as strings, so the fares are converted here.
function toRecord(row: RouteRow): RouteRecord {
  return {
    id: row.transportation_id,
    destinationId: row.destination_id,
    destinationName: row.destinations?.name ?? 'Unknown destination',
    transportType: row.transportation_type ?? '',
    fareMin: Number(row.fare_min ?? 0),
    fareMax: Number(row.fare_max ?? 0),
    duration: row.travel_duration ?? '',
    instructions: row.instructions ?? '',
  }
}

export async function fetchRoutes(): Promise<RouteRecord[]> {
  const { data, error } = await supabase
    .from('transportation_options')
    .select(
      'transportation_id, destination_id, transportation_type, fare_min, fare_max, travel_duration, instructions, destinations ( name )',
    )
    .order('transportation_id', { ascending: false })
  if (error) throw error
  return (data as unknown as RouteRow[]).map(toRecord)
}

const columnsFrom = (input: RouteInput) => ({
  destination_id: input.destinationId,
  transportation_type: input.transportType,
  fare_min: input.fareMin,
  fare_max: input.fareMax,
  travel_duration: input.duration,
  instructions: input.instructions,
})

export async function createRoute(input: RouteInput): Promise<void> {
  const { error } = await supabase.from('transportation_options').insert(columnsFrom(input))
  if (error) throw error
}

export async function updateRoute(id: number, input: RouteInput): Promise<void> {
  // Asking for the row back matters: when a policy blocks the change, Supabase returns no error and no rows.
  const { data, error } = await supabase
    .from('transportation_options')
    .update(columnsFrom(input))
    .eq('transportation_id', id)
    .select('transportation_id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('This route could not be updated. Are you still signed in as an administrator?')
}

export async function deleteRoute(id: number): Promise<void> {
  const { data, error } = await supabase
    .from('transportation_options')
    .delete()
    .eq('transportation_id', id)
    .select('transportation_id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('This route could not be deleted. Are you still signed in as an administrator?')
}
