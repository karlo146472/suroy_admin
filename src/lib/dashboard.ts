import type { DestinationRecord } from './destinationTypes'
import { fetchActivityLog, type LogEntry } from './activityLog'
import { fetchDestinations } from './destinations'
import { supabase } from './supabase'
import { fetchTableCounts, type TableCounts } from './stats'

export interface DestinationStats {
  id: number
  name: string
  category: string
  barangay: string
  latitude: number
  longitude: number
  /** Times saved to a user's favorites. */
  favorites: number
  /** Times added to a trip itinerary. */
  tripCount: number
  /** Average of approved reviews, or 0 when there are none. */
  avgRating: number
  reviewCount: number
}

export interface DashboardData {
  counts: TableCounts
  destinations: DestinationStats[]
  /** The newest log entries, or null when the activity log could not be read (for example it is not set up yet). */
  activity: LogEntry[] | null
}

/** Counts how many times each destination id appears in a list of rows. */
function countByDestination(rows: { destination_id: number }[]): Map<number, number> {
  const counts = new Map<number, number>()
  rows.forEach((row) => counts.set(row.destination_id, (counts.get(row.destination_id) ?? 0) + 1))
  return counts
}

// Administrators may read every favorite, trip and review (see the row-level security policies), so these
// counts cover all users. Only the destination id (and rating) is requested, never anyone's personal details.
async function fetchDestinationStats(destinations: DestinationRecord[]): Promise<DestinationStats[]> {
  const [favorites, trips, reviews] = await Promise.all([
    supabase.from('favorites').select('destination_id'),
    supabase.from('trip_destinations').select('destination_id'),
    supabase.from('reviews').select('destination_id, rating').eq('status', 'approved'),
  ])
  if (favorites.error) throw favorites.error
  if (trips.error) throw trips.error
  if (reviews.error) throw reviews.error

  const favoriteCounts = countByDestination(favorites.data)
  const tripCounts = countByDestination(trips.data)
  const ratings = new Map<number, number[]>()
  reviews.data.forEach((row) => ratings.set(row.destination_id, [...(ratings.get(row.destination_id) ?? []), row.rating]))

  return destinations.map((d) => {
    const list = ratings.get(d.id) ?? []
    return {
      id: d.id,
      name: d.name,
      category: d.category,
      barangay: d.barangay,
      latitude: d.latitude,
      longitude: d.longitude,
      favorites: favoriteCounts.get(d.id) ?? 0,
      tripCount: tripCounts.get(d.id) ?? 0,
      avgRating: list.length === 0 ? 0 : list.reduce((sum, r) => sum + r, 0) / list.length,
      reviewCount: list.length,
    }
  })
}

export async function fetchDashboard(): Promise<DashboardData> {
  const [counts, destinations, activity] = await Promise.all([
    fetchTableCounts(),
    fetchDestinations(),
    // The rest of the dashboard should still work if the log is unavailable.
    fetchActivityLog(6).catch(() => null),
  ])
  return { counts, destinations: await fetchDestinationStats(destinations), activity }
}
