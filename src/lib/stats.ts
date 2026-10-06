import { supabase } from './supabase'

type CountedTable =
  | 'destinations'
  | 'transportation_options'
  | 'profiles'
  | 'categories'

/** How many rows a table has. Only the count is requested, not the rows. */
async function countRows(table: CountedTable): Promise<number> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export interface TableCounts {
  destinations: number
  routes: number
  users: number
  categories: number
}

export async function fetchTableCounts(): Promise<TableCounts> {
  const [destinations, routes, users, categories] = await Promise.all([
    countRows('destinations'),
    countRows('transportation_options'),
    countRows('profiles'),
    countRows('categories'),
  ])
  return { destinations, routes, users, categories }
}
