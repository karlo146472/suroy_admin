import { Clock, Lock, SearchX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  DataTable,
  EmptyState,
  FilterSelect,
  LoadingState,
  PageHeader,
  Pagination,
  SearchBar,
  StatusBadge,
  Toolbar,
  type BadgeTone,
  type Column,
} from '../components/ui'
import {
  fetchActivityLog,
  isActivityLogMissing,
  LOG_ACTIONS,
  LOG_MODULES,
  type LogAction,
  type LogEntry,
} from '../lib/activityLog'

const PAGE_SIZE = 10

const actionOptions = LOG_ACTIONS.map((a) => ({ value: a, label: a }))
const moduleOptions = LOG_MODULES.map((m) => ({ value: m, label: m }))

const actionTone: Record<LogAction, BadgeTone> = {
  Added: 'success',
  Edited: 'info',
  Deleted: 'error',
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
/** The entry's calendar day in local time as YYYY-MM-DD, comparable with a date input's value. */
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA')

const ActionBadge = ({ action }: { action: LogAction }) => <StatusBadge tone={actionTone[action]}>{action}</StatusBadge>

const columns: Column<LogEntry>[] = [
  { key: 'admin', header: 'Administrator', render: (e) => <strong>{e.admin}</strong> },
  { key: 'action', header: 'Action', render: (e) => <ActionBadge action={e.action} /> },
  { key: 'module', header: 'Module' },
  { key: 'description', header: 'Description', render: (e) => <span className="cell-wrap">{e.description}</span> },
  { key: 'date', header: 'Date', render: (e) => formatDate(e.timestamp) },
  { key: 'time', header: 'Time', render: (e) => formatTime(e.timestamp) },
]

export default function ActivityLog() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // 'setup' = the activity_log table does not exist yet; 'load' = any other failure.
  const [loadError, setLoadError] = useState<'setup' | 'load' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState('')
  const [admin, setAdmin] = useState('')
  const [action, setAction] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    fetchActivityLog()
      .then((list) => {
        if (!cancelled) setEntries(list)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(isActivityLogMissing(error) ? 'setup' : 'load')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const adminOptions = useMemo(
    () => [...new Set(entries.map((e) => e.admin))].sort().map((a) => ({ value: a, label: a })),
    [entries],
  )

  // Changing any filter goes back to the first page.
  const filter =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value)
      setPage(1)
    }

  const dateRangeInvalid = Boolean(from && to && from > to)
  const hasFilters = Boolean(search || admin || action || moduleName || from || to)

  // Newest first.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...entries]
      .filter(
        (e) =>
          (!admin || e.admin === admin) &&
          (!action || e.action === action) &&
          (!moduleName || e.module === moduleName) &&
          (!from || dayKey(e.timestamp) >= from) &&
          (!to || dayKey(e.timestamp) <= to) &&
          (!query || `${e.admin} ${e.description}`.toLowerCase().includes(query)),
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [entries, search, admin, action, moduleName, from, to])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const clearFilters = () => {
    setSearch('')
    setAdmin('')
    setAction('')
    setModuleName('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Activity Log"
        description="A record of changes administrators have made, newest first. Entries are recorded automatically and cannot be edited or deleted."
        actions={
          <StatusBadge tone="neutral">
            <Lock size={12} aria-hidden="true" /> Read-only
          </StatusBadge>
        }
      />
      <Toolbar>
        <SearchBar value={search} onChange={filter(setSearch)} placeholder="Search activity..." />
        <FilterSelect label="Administrator" value={admin} options={adminOptions} onChange={filter(setAdmin)} />
        <FilterSelect label="Action" value={action} options={actionOptions} onChange={filter(setAction)} />
        <FilterSelect label="Module" value={moduleName} options={moduleOptions} onChange={filter(setModuleName)} />
        <label className="date-filter">
          <span>From</span>
          <input
            type="date"
            aria-label="From date"
            className="filter-select"
            value={from}
            max={to || undefined}
            aria-invalid={dateRangeInvalid || undefined}
            onChange={(e) => filter(setFrom)(e.target.value)}
          />
        </label>
        <label className="date-filter">
          <span>To</span>
          <input
            type="date"
            aria-label="To date"
            className="filter-select"
            value={to}
            min={from || undefined}
            aria-invalid={dateRangeInvalid || undefined}
            onChange={(e) => filter(setTo)(e.target.value)}
          />
        </label>
        {hasFilters && (
          <button type="button" className="btn btn--small" onClick={clearFilters}>
            Clear Filters
          </button>
        )}
        <span className="toolbar__count" aria-live="polite">
          {filtered.length} of {entries.length} entries match
        </span>
      </Toolbar>

      {isLoading ? (
        <LoadingState label="Loading activity..." />
      ) : loadError ? (
        <EmptyState
          title={loadError === 'setup' ? 'The activity log is not set up yet' : 'Could not load the activity log'}
          description={
            loadError === 'setup'
              ? 'Run supabase/admin-dashboard.sql in the Supabase SQL editor to create it, then reload this page.'
              : 'Check your connection and try again.'
          }
          action={
            loadError === 'load' ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setLoadError(null)
                  setIsLoading(true)
                  setAttempt((n) => n + 1)
                }}
              >
                Try Again
              </button>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No activity found"
          description={
            dateRangeInvalid ? 'The start date is after the end date.' : 'Try a different search or clear the filters.'
          }
          action={
            <button type="button" className="btn" onClick={clearFilters}>
              Clear Filters
            </button>
          }
        />
      ) : (
        <>
          <div className="responsive-table">
            <DataTable label="Activity log" columns={columns} rows={pageRows} getRowKey={(e) => e.id} />
          </div>
          <ul className="card-list">
            {pageRows.map((e) => (
              <li key={e.id} className="record-card">
                <div className="record-card__head">
                  <strong>{e.admin}</strong>
                  <ActionBadge action={e.action} />
                </div>
                <span>{e.description}</span>
                <div className="record-card__row">
                  <span className="record-card__meta">{e.module}</span>
                  <span className="record-card__meta">
                    <Clock size={14} /> {formatDate(e.timestamp)}, {formatTime(e.timestamp)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </>
      )}
    </>
  )
}
