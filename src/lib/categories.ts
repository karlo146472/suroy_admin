import { supabase } from './supabase'

export interface CategoryRecord {
  id: number
  name: string
  /** How many destinations are in this category. */
  destinationCount: number
}

interface CategoryRow {
  category_id: number
  category_name: string
  destination_categories: { count: number }[]
}

export async function fetchCategories(): Promise<CategoryRecord[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('category_id, category_name, destination_categories ( count )')
    .order('category_name')
  if (error) throw error

  return (data as unknown as CategoryRow[]).map((row) => ({
    id: row.category_id,
    name: row.category_name,
    destinationCount: row.destination_categories[0]?.count ?? 0,
  }))
}

// 23505 is Postgres' "unique violation": the category name is already taken.
const isDuplicateName = (error: { code?: string }) => error.code === '23505'

export async function createCategory(name: string): Promise<void> {
  const { error } = await supabase.from('categories').insert({ category_name: name.trim() })
  if (error) throw isDuplicateName(error) ? new Error('A category with this name already exists.') : error
}

export async function renameCategory(id: number, name: string): Promise<void> {
  // Asking for the row back matters: when a policy blocks the change, Supabase returns no error and no rows.
  const { data, error } = await supabase
    .from('categories')
    .update({ category_name: name.trim() })
    .eq('category_id', id)
    .select('category_id')
  if (error) throw isDuplicateName(error) ? new Error('A category with this name already exists.') : error
  if (!data || data.length === 0) throw new Error('This category could not be updated. Are you still signed in as an administrator?')
}

export async function deleteCategory(id: number): Promise<void> {
  const { data, error } = await supabase.from('categories').delete().eq('category_id', id).select('category_id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('This category could not be deleted. Are you still signed in as an administrator?')
}
