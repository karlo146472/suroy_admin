import { Bus, MapPinned, Users } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState, PageHeader, StatCard } from '../components/ui'
import type { MapMarker } from '../components/map/MapView'
import RecentActivity from '../components/dashboard/RecentActivity'
import TopDestinations from '../components/dashboard/TopDestinations'
import { SANTO_TOMAS_CENTER } from '../lib/mapDefaults'
import { fetchDashboard, type DashboardData } from '../lib/dashboard'

// Loaded on demand so the map library isn't part of every page's bundle.
const MapView = lazy(() => import('../components/map/MapView'))

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchDashboard()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the dashboard. Check your connection and try again.')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const markers = useMemo<MapMarker[]>(
    () =>
      (data?.destinations ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        subtitle: `${d.category} · ${d.barangay}`,
        latitude: d.latitude,
        longitude: d.longitude,
      })),
    [data],
  )

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" description="Overview of SUROY tourism data." />
        <EmptyState
          title="Could not load the dashboard"
          description={error}
          action={
            <button
              type="button"
              className="btn"
              onClick={() => {
                setError(null)
                setAttempt((n) => n + 1)
              }}
            >
              Try Again
            </button>
          }
        />
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader title="Dashboard" description="Overview of SUROY tourism data." />
        <LoadingState label="Loading dashboard..." />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of SUROY tourism data." />
      <div className="stat-grid">
        <StatCard label="Total Destinations" value={data.counts.destinations} icon={MapPinned} />
        <StatCard label="Transportation Routes" value={data.counts.routes} icon={Bus} />
        <StatCard label="Registered Users" value={data.counts.users.toLocaleString()} icon={Users} />
      </div>
      <div className="dashboard-split">
        <section className="split-col">
          <h2 className="dashboard-section__title">Destination Map</h2>
          <div className="map-slot">
            <Suspense fallback={<LoadingState label="Loading map..." />}>
              <MapView label="Map of tourist destinations" markers={markers} center={SANTO_TOMAS_CENTER} height="100%" />
            </Suspense>
          </div>
        </section>
        <section className="split-col">
          <h2 className="dashboard-section__title">Top Destinations</h2>
          <TopDestinations destinations={data.destinations} />
        </section>
      </div>
      <section className="dashboard-block">
        <div className="section-head">
          <h2 className="dashboard-section__title">Recent Activity</h2>
          <Link to="/activity-log" className="btn">
            View All
          </Link>
        </div>
        {data.activity ? (
          <RecentActivity entries={data.activity} />
        ) : (
          <EmptyState
            title="Activity is not available"
            description="The activity log could not be read. See the Activity Log page for details."
          />
        )}
      </section>
    </>
  )
}
