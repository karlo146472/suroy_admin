import { supabase } from './supabase'

/** Matches the role check on the profiles table. */
export const USER_ROLES = ['Traveler', 'Business', 'Tourism Administrator'] as const
export type UserRole = (typeof USER_ROLES)[number]

export interface UserRecord {
  id: string
  name: string
  email: string
  role: UserRole
  /** The day the account was created, as YYYY-MM-DD in local time. */
  registeredAt: string
  /** Rows in trips for this user. */
  tripsCount: number
  /** Rows in favorites for this user. */
  favoritesCount: number
}

interface ProfileRow {
  id: string
  name: string
  email: string
  role: UserRole
  created_at: string
}

function countByUser(rows: { user_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>()
  rows.forEach((row) => counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1))
  return counts
}

// Administrators may read every profile, trip and favorite (see the row-level security policies). Only the
// owner's id is requested for trips and favorites, to count them.
export async function fetchUsers(): Promise<UserRecord[]> {
  const [profiles, trips, favorites] = await Promise.all([
    supabase.from('profiles').select('id, name, email, role, created_at').order('created_at', { ascending: false }),
    supabase.from('trips').select('user_id'),
    supabase.from('favorites').select('user_id'),
  ])
  if (profiles.error) throw profiles.error
  if (trips.error) throw trips.error
  if (favorites.error) throw favorites.error

  const tripCounts = countByUser(trips.data)
  const favoriteCounts = countByUser(favorites.data)

  return (profiles.data as ProfileRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    registeredAt: new Date(row.created_at).toLocaleDateString('en-CA'),
    tripsCount: tripCounts.get(row.id) ?? 0,
    favoritesCount: favoriteCounts.get(row.id) ?? 0,
  }))
}

/**
 * Changes a person's name and role. The database enforces the rules: only an administrator may do this, and
 * the last administrator cannot be demoted. Their error message is passed on as-is.
 */
export async function updateUser(id: string, input: { name: string; role: UserRole }): Promise<void> {
  // Asking for the row back matters: when a policy blocks the change, Supabase returns no error and no rows.
  const { data, error } = await supabase
    .from('profiles')
    .update({ name: input.name.trim(), role: input.role })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('This user could not be updated. Has supabase/admin-dashboard.sql been run in the database?')
  }
}
