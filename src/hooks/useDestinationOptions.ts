import { useEffect, useState } from 'react'
import { ACTIVITY_OPTIONS, FACILITY_OPTIONS } from '../lib/destinationForm'
import { fetchActivityNames, fetchCategoryNames, fetchFacilityNames } from '../lib/destinations'

export interface DestinationOptions {
  categoryNames: string[]
  activityOptions: string[]
  facilityOptions: string[]
}

const unique = (names: string[]) => [...new Set(names)]

/**
 * The choices offered by the destination form, read from the database. The built-in activity and facility
 * suggestions are always included, plus anything already stored, so editing never drops an existing value.
 */
export function useDestinationOptions() {
  const [options, setOptions] = useState<DestinationOptions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchCategoryNames(), fetchActivityNames(), fetchFacilityNames()])
      .then(([categoryNames, activities, facilities]) => {
        if (cancelled) return
        setOptions({
          categoryNames,
          activityOptions: unique([...ACTIVITY_OPTIONS, ...activities]),
          facilityOptions: unique([...FACILITY_OPTIONS, ...facilities]),
        })
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the categories. Check your connection and try again.')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = () => {
    setError(null)
    setOptions(null)
    setAttempt((n) => n + 1)
  }

  return { options, error, retry }
}
