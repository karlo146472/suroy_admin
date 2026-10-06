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
  contactInformation?: string
  activities?: string[]
  facilities?: string[]
}
