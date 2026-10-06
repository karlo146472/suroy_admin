import type { LogAction, LogEntry } from '../../lib/activityLog'
import { EmptyState, StatusBadge, type BadgeTone } from '../ui'

const actionTone: Record<LogAction, BadgeTone> = {
  Added: 'success',
  Edited: 'info',
  Deleted: 'error',
}

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

interface RecentActivityProps {
  entries: readonly LogEntry[]
  limit?: number
}

export default function RecentActivity({ entries, limit = 6 }: RecentActivityProps) {
  if (entries.length === 0) {
    return <EmptyState title="No recent activity" description="Administrator actions will appear here." />
  }

  return (
    <ul className="activity-list">
      {entries.slice(0, limit).map((entry) => (
        <li key={entry.id} className="activity-item">
          <div className="activity-item__body">
            <span>
              <strong>{entry.admin}</strong> · {entry.description}
            </span>
            <span className="activity-item__time">{timeAgo(entry.timestamp)}</span>
          </div>
          <StatusBadge tone={actionTone[entry.action]}>{entry.action}</StatusBadge>
        </li>
      ))}
    </ul>
  )
}
