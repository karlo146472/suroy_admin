import type { MapMarker } from '../components/map/MapView'
import type { DestinationRecord } from './destinationTypes'
import { SANTO_TOMAS_CENTER } from './mapDefaults'
import { ROUTE_ORIGIN, type RouteRecord } from './transportation'

export const ORIGIN_COLOR = '#2E7D32'
export const DESTINATION_COLOR = '#D32F2F'

export interface RouteMapData {
  markers: MapMarker[]
  line: [number, number][] | null
  /** False when the route's destination no longer exists, so only the origin can be shown. */
  hasDestination: boolean
}

/** Builds the markers and line for a route: the town center (origin) and the destination the route serves. */
export function getRouteMapData(route: RouteRecord, destinations: DestinationRecord[]): RouteMapData {
  const [originLng, originLat] = SANTO_TOMAS_CENTER
  const destination = destinations.find((d) => d.id === route.destinationId)

  const markers: MapMarker[] = [
    { id: 'origin', name: ROUTE_ORIGIN, subtitle: 'Origin', color: ORIGIN_COLOR, latitude: originLat, longitude: originLng },
  ]
  if (destination) {
    markers.push({
      id: 'destination',
      name: destination.name,
      subtitle: `Destination · ${destination.category} · ${destination.barangay}`,
      color: DESTINATION_COLOR,
      latitude: destination.latitude,
      longitude: destination.longitude,
    })
  }

  const line: [number, number][] | null = destination
    ? [[originLng, originLat], [destination.longitude, destination.latitude]]
    : null

  return { markers, line, hasDestination: Boolean(destination) }
}
