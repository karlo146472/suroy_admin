import type { ReactNode } from 'react'
import EmptyState from './EmptyState'
import LoadingState from './LoadingState'

export interface Column<T> {
  key: string
  header: string
  /** Defaults to `row[key]` when omitted. */
  render?: (row: T) => ReactNode
  /** Right-align, useful for numbers and action buttons. */
  align?: 'left' | 'right'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string | number
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  /** Names the table for screen readers, e.g. "Destinations". */
  label?: string
  /** Makes rows clickable and keyboard-activatable. */
  onRowClick?: (row: T) => void
  selectedKey?: string | number | null
}

export default function DataTable<T>({
  columns,
  rows,
  getRowKey,
  loading = false,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  label,
  onRowClick,
  selectedKey = null,
}: DataTableProps<T>) {
  if (loading) return <LoadingState />
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />

  return (
    <div className="table-wrap">
      <table className="data-table" aria-label={label}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className={col.align === 'right' ? 'is-right' : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = getRowKey(row)
            return (
            <tr
              key={key}
              data-row-key={key}
              className={[onRowClick ? 'is-clickable' : '', key === selectedKey ? 'is-selected' : ''].join(' ').trim() || undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-current={key === selectedKey ? 'true' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      // Ignore keys pressed on links/buttons inside the row (e.g. an Edit link).
                      if (e.target !== e.currentTarget) return
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onRowClick(row)
                      }
                    }
                  : undefined
              }
            >
              {columns.map((col) => (
                <td key={col.key} className={col.align === 'right' ? 'is-right' : undefined}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
