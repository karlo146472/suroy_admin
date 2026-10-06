import { Heart, Pencil, Route } from 'lucide-react'
import type { UserRecord } from '../../lib/users'
import { StatCard, StatusBadge, type BadgeTone } from '../ui'

const roleTone: Record<UserRecord['role'], BadgeTone> = {
  'Tourism Administrator': 'info',
  Business: 'warning',
  Traveler: 'neutral',
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

/** "today", "yesterday", "12 days ago", "5 months ago", "2 years ago". */
function timeSince(iso: string): string {
  const days = Math.floor((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 60) return `${days} days ago`
  if (days < 730) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

interface UserDetailsProps {
  user: UserRecord
  onEdit: () => void
}

export default function UserDetails({ user, onEdit }: UserDetailsProps) {
  return (
    <div className="details">
      <div className="details__head">
        <span className="details__avatar" aria-hidden="true">
          {initials(user.name)}
        </span>
        <div className="details__who">
          <strong className="details__name">{user.name}</strong>
          <span className="details__email">{user.email}</span>
        </div>
        <button type="button" className="btn btn--small" onClick={onEdit}>
          <Pencil size={14} /> Edit
        </button>
      </div>

      <dl className="details__list">
        <div>
          <dt>Role</dt>
          <dd>
            <StatusBadge tone={roleTone[user.role]}>{user.role}</StatusBadge>
          </dd>
        </div>
        <div>
          <dt>Registered</dt>
          <dd>
            {formatDate(user.registeredAt)} <span className="details__muted">({timeSince(user.registeredAt)})</span>
          </dd>
        </div>
      </dl>

      <div className="details__stats">
        <StatCard label="Saved trips" value={user.tripsCount} icon={Route} />
        <StatCard label="Favorites" value={user.favoritesCount} icon={Heart} />
      </div>
    </div>
  )
}
