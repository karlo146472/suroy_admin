import { useEffect, useState } from 'react'
import { fetchTableCounts, type TableCounts } from '../../lib/stats'

export default function SystemInformation() {
  // null while loading, 'error' if the counts could not be read.
  const [counts, setCounts] = useState<TableCounts | 'error' | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTableCounts()
      .then((result) => {
        if (!cancelled) setCounts(result)
      })
      .catch(() => {
        if (!cancelled) setCounts('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const countText = (pick: (c: TableCounts) => number) =>
    counts === null ? 'Loading...' : counts === 'error' ? 'Unavailable' : String(pick(counts))

  const rows: [string, string][] = [
    ['Application', 'SUROY Tourism Admin'],
    ['Environment', import.meta.env.DEV ? 'Development' : 'Production'],
    ['Data source', 'Supabase'],
    ['Map provider', 'OpenFreeMap tiles with MapLibre GL'],
    ['Time zone', Intl.DateTimeFormat().resolvedOptions().timeZone],
    ['Browser language', navigator.language],
    ['Destinations', countText((c) => c.destinations)],
    ['Transportation routes', countText((c) => c.routes)],
    ['Users', countText((c) => c.users)],
    ['Categories', countText((c) => c.categories)],
  ]

  return (
    <section className="form-card" aria-labelledby="system-title">
      <h2 id="system-title" className="form-card__title">
        System Information
      </h2>
      <p className="form-card__desc">Read-only details about this dashboard. Share them when reporting a problem.</p>
      <dl className="details__list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
