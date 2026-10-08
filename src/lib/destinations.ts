import { EXPENSE_TYPES, type DestinationRecord, type ExpenseType } from './destinationTypes'
import { removeDestinationImage, uploadDestinationImage } from './destinationImages'
import { supabase } from './supabase'

// Reads and writes the same tables the mobile app uses. Writes only succeed for a signed-in
// "Tourism Administrator" because of the row-level security policies in supabase/schema.sql.

interface DestinationRow {
  destination_id: number
  name: string
  barangay: string | null
  description: string | null
  operating_hours: string | null
  entrance_fee: string | number | null
  contact_information: string | null
  latitude: string | number | null
  longitude: string | number | null
  featured: boolean
  image_url: string | null
  destination_categories: { categories: { category_name: string } | null }[]
  destination_activities: { activities: { activity_name: string } | null }[]
  destination_facilities: { facilities: { facility_name: string } | null }[]
  destination_expenses: { expense_type: string | null; estimated_amount: string | number | null; description: string | null }[]
}

const isName = (name: string | undefined): name is string => Boolean(name)

// PostgREST sends Postgres `numeric` columns as strings, so the numbers are converted here.
function toRecord(row: DestinationRow): DestinationRecord {
  return {
    id: row.destination_id,
    name: row.name,
    category: row.destination_categories[0]?.categories?.category_name ?? 'Uncategorized',
    barangay: row.barangay ?? '',
    entranceFee: Number(row.entrance_fee ?? 0),
    operatingHours: row.operating_hours ?? '',
    status: row.featured ? 'Featured' : 'Standard',
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    description: row.description ?? '',
    imageUrl: row.image_url ?? undefined,
    expenses: row.destination_expenses.map((expense) => ({
      // An unknown or missing type (for example one typed by hand in the database) is shown as "Other".
      type: (EXPENSE_TYPES as readonly string[]).includes(expense.expense_type ?? '') ? (expense.expense_type as ExpenseType) : 'Other',
      amount: Number(expense.estimated_amount ?? 0),
      description: expense.description ?? '',
    })),
    contactInformation: row.contact_information ?? undefined,
    activities: row.destination_activities.map((link) => link.activities?.activity_name).filter(isName),
    facilities: row.destination_facilities.map((link) => link.facilities?.facility_name).filter(isName),
  }
}

export async function fetchDestinations(): Promise<DestinationRecord[]> {
  const { data, error } = await supabase
    .from('destinations')
    .select(
      `destination_id, name, barangay, description, operating_hours, entrance_fee,
       contact_information, latitude, longitude, featured, image_url,
       destination_categories ( categories ( category_name ) ),
       destination_activities ( activities ( activity_name ) ),
       destination_facilities ( facilities ( facility_name ) ),
       destination_expenses ( expense_type, estimated_amount, description )`,
    )
    .order('destination_id', { ascending: false })

  if (error) throw error
  return (data as unknown as DestinationRow[]).map(toRecord)
}

async function fetchNames(table: 'categories' | 'activities' | 'facilities', column: string): Promise<string[]> {
  const { data, error } = await supabase.from(table).select(column).order(column)
  if (error) throw error
  return (data as unknown as Record<string, string>[]).map((row) => row[column])
}

export const fetchCategoryNames = () => fetchNames('categories', 'category_name')
export const fetchActivityNames = () => fetchNames('activities', 'activity_name')
export const fetchFacilityNames = () => fetchNames('facilities', 'facility_name')

type DestinationInput = Omit<DestinationRecord, 'id'>

// The columns shared by insert and update. input.imageUrl is the photo to keep (undefined = no photo).
const columnsFrom = (input: DestinationInput) => ({
  name: input.name,
  barangay: input.barangay,
  description: input.description ?? null,
  operating_hours: input.operatingHours,
  entrance_fee: input.entranceFee,
  contact_information: input.contactInformation ?? null,
  latitude: input.latitude,
  longitude: input.longitude,
  featured: input.status === 'Featured',
  image_url: input.imageUrl ?? null,
})

/** Replaces a destination's activities (or facilities), adding any new names to the lookup table first. */
async function linkNames(
  lookup: { table: 'activities' | 'facilities'; nameColumn: string; idColumn: string },
  junctionTable: 'destination_activities' | 'destination_facilities',
  destinationId: number,
  names: string[],
) {
  const { error: clearError } = await supabase.from(junctionTable).delete().eq('destination_id', destinationId)
  if (clearError) throw clearError
  if (names.length === 0) return

  const { data, error } = await supabase
    .from(lookup.table)
    .upsert(
      names.map((name) => ({ [lookup.nameColumn]: name })),
      { onConflict: lookup.nameColumn },
    )
    .select(lookup.idColumn)
  if (error) throw error

  const ids = (data as unknown as Record<string, number>[]).map((row) => row[lookup.idColumn])
  const { error: linkError } = await supabase
    .from(junctionTable)
    .insert(ids.map((id) => ({ destination_id: destinationId, [lookup.idColumn]: id })))
  if (linkError) throw linkError
}

async function linkCategory(destinationId: number, categoryName: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('category_id')
    .eq('category_name', categoryName)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`The category "${categoryName}" no longer exists.`)

  const { error: clearError } = await supabase.from('destination_categories').delete().eq('destination_id', destinationId)
  if (clearError) throw clearError
  const { error: linkError } = await supabase
    .from('destination_categories')
    .insert({ destination_id: destinationId, category_id: data.category_id })
  if (linkError) throw linkError
}

/** Replaces the destination's recorded on-site costs with the given list. */
async function linkExpenses(destinationId: number, expenses: DestinationInput['expenses']) {
  const { error: clearError } = await supabase.from('destination_expenses').delete().eq('destination_id', destinationId)
  if (clearError) throw clearError
  if (!expenses || expenses.length === 0) return

  const { error } = await supabase.from('destination_expenses').insert(
    expenses.map((expense) => ({
      destination_id: destinationId,
      expense_type: expense.type,
      estimated_amount: expense.amount,
      description: expense.description || null,
    })),
  )
  if (error) throw error
}

async function linkAll(destinationId: number, input: DestinationInput) {
  await linkCategory(destinationId, input.category)
  await linkNames(
    { table: 'activities', nameColumn: 'activity_name', idColumn: 'activity_id' },
    'destination_activities',
    destinationId,
    input.activities ?? [],
  )
  await linkNames(
    { table: 'facilities', nameColumn: 'facility_name', idColumn: 'facility_id' },
    'destination_facilities',
    destinationId,
    input.facilities ?? [],
  )
  await linkExpenses(destinationId, input.expenses)
}

/** `newImage` is a photo chosen in the form; it is uploaded and becomes the destination's photo. */
export async function createDestination(input: DestinationInput, newImage: File | null): Promise<number> {
  const imageUrl = newImage ? await uploadDestinationImage(newImage) : input.imageUrl
  const toSave = { ...input, imageUrl }

  const { data, error } = await supabase.from('destinations').insert(columnsFrom(toSave)).select('destination_id').single()
  if (error) {
    await removeDestinationImage(imageUrl)
    throw error
  }

  try {
    await linkAll(data.destination_id, toSave)
  } catch (linkError) {
    // Don't leave a half-saved destination behind (for example one without its category).
    await supabase.from('destinations').delete().eq('destination_id', data.destination_id)
    await removeDestinationImage(imageUrl)
    throw linkError
  }
  return data.destination_id
}

/**
 * `previousImageUrl` is the photo the destination had before editing. If the photo was replaced or removed,
 * the old file is deleted once the change has been saved.
 */
export async function updateDestination(
  id: number,
  input: DestinationInput,
  newImage: File | null,
  previousImageUrl: string | undefined,
): Promise<void> {
  const imageUrl = newImage ? await uploadDestinationImage(newImage) : input.imageUrl
  const toSave = { ...input, imageUrl }

  try {
    // Asking for the row back matters: when a policy blocks the change, Supabase returns no error and no rows.
    const { data, error } = await supabase
      .from('destinations')
      .update(columnsFrom(toSave))
      .eq('destination_id', id)
      .select('destination_id')
    if (error) throw error
    if (!data || data.length === 0) throw new Error('This destination could not be updated. Are you still signed in as an administrator?')

    await linkAll(id, toSave)
  } catch (error) {
    // The new photo was never attached to the destination, so don't leave it behind.
    if (newImage) await removeDestinationImage(imageUrl)
    throw error
  }

  if (previousImageUrl && previousImageUrl !== imageUrl) await removeDestinationImage(previousImageUrl)
}

export async function deleteDestination(id: number): Promise<void> {
  const { data, error } = await supabase.from('destinations').delete().eq('destination_id', id).select('destination_id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('This destination could not be deleted. Are you still signed in as an administrator?')
}
