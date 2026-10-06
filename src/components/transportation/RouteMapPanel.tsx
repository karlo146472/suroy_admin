import { lazy, Suspense, useMemo } from 'react'
import type { DestinationRecord } from '../../lib/destinationTypes'
import { SANTO_TOMAS_CENTER } from '../../lib/mapDefaults'
import { DESTINATION_COLOR, getRouteMapData, ORIGIN_COLOR } from '../../lib/routeMap'
import { ROUTE_ORIGIN, type RouteRecord } from '../../lib/transportation'
import { LoadingState } from '../ui'

// Loaded on demand so the map library isn't part of every page's bundle.
const MapView = lazy(() => import('../map/MapView'))

function LegendItem({ color, children }: { color: string; children: string }) {
  return (
    <li>
      <span className="legend-dot" style={{ background: color }} aria-hidden="true" />
      {children}
    </li>
  )
}

interface RouteMapPanelProps {
  route: RouteRecord | null
  /** All destinations, used to find where the selected route ends. */
  destinations: DestinationRecord[]
}

/** Shows one route on the map: the town center (origin), its destination, and a line between them. */
export default function RouteMapPanel({ route, destinations }: RouteMapPanelProps) {
  const data = useMemo(() => (route ? getRouteMapData(route, destinations) : null), [route, destinations])

  return (
    <div className="route-map-panel">
      <div className="route-map">
        <Suspense fallback={<LoadingState label="Loading map..." />}>
          <MapView
            label="Map of the selected route"
            markers={data?.markers ?? NO_MARKERS}
            center={SANTO_TOMAS_CENTER}
            height="100%"
            line={data?.line ?? null}
          />
        </Suspense>
      </div>
      <div className="route-info" aria-live="polite">
        {!route || !data ? (
          <span>Select a route in the table to see it on the map.</span>
        ) : (
          <>
            <ul className="route-legend">
              <LegendItem color={ORIGIN_COLOR}>{`Origin: ${ROUTE_ORIGIN}`}</LegendItem>
              <LegendItem color={DESTINATION_COLOR}>
                {`Destination: ${route.destinationName}${data.hasDestination ? '' : ' (no longer exists)'}`}
              </LegendItem>
            </ul>
            <span className="route-info__note">
              {data.line
                ? 'The dashed line joins the two ends directly; it is not the road the vehicle takes.'
                : 'The destination for this route could not be found, so only the origin is shown.'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

const NO_MARKERS: never[] = []
