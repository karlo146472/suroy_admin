/** What kind of on-site cost this is. The mobile app treats a Meal as covering the traveler's food money. */
export const EXPENSE_TYPES = ['Meal', 'Room', 'Activity', 'Other'] as const
export type ExpenseType = (typeof EXPENSE_TYPES)[number]

/** A typical amount a visitor pays on site, per person (a row of the destination_expenses table). */
export interface ExpenseItem {
  type: ExpenseType
  amount: number
  description: string
}

/** Derived from the `featured` flag on the destinations table. */
export type DestinationStatus = 'Featured' | 'Standard'

export interface DestinationRecord {
  id: number
  name: string
  category: string
  barangay: string
  entranceFee: number
  operatingHours: string
  status: DestinationStatus
  latitude: number
  longitude: number
  description?: string
  /** Public URL of the destination's photo, if it has one. */
  imageUrl?: string
  expenses?: ExpenseItem[]
  contactInformation?: string
  activities?: string[]
  facilities?: string[]
}
