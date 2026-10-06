import { Heart, MapPin, Route, Star } from 'lucide-react'
import type { DestinationStats } from '../../lib/dashboard'
import { StatusBadge } from '../ui'

interface TopDestinationsProps {
  destinations: DestinationStats[]
  limit?: number
}

/** Ranked by favorites, the closest popularity signal the system records. */
export default function TopDestinations({ destinations, limit = 5 }: TopDestinationsProps) {
  const top = [...destinations].sort((a, b) => b.favorites - a.favorites).slice(0, limit)

  return (
    <ol className="top-list">
      {top.map((d, index) => (
        <li key={d.id} className="top-item">
          <span className="top-item__rank">{index + 1}</span>
          <div className="top-item__body">
            <div className="top-item__head">
              <span className="top-item__name">{d.name}</span>
              <StatusBadge tone="success">{d.category}</StatusBadge>
            </div>
            <span className="top-item__location">
              <MapPin size={14} /> {d.barangay}, Santo Tomas
            </span>
            <div className="top-item__stats">
              <span title="Saved to favorites">
                <Heart size={14} /> <span aria-hidden="true">{d.favorites}</span>
                <span className="visually-hidden">{d.favorites} saves to favorites</span>
              </span>
              <span title="Added to trips">
                <Route size={14} /> <span aria-hidden="true">{d.tripCount}</span>
                <span className="visually-hidden">added to {d.tripCount} trips</span>
              </span>
              <span title={`${d.reviewCount} approved reviews`}>
                <Star size={14} />{' '}
                <span aria-hidden="true">{d.reviewCount === 0 ? 'No reviews' : `${d.avgRating.toFixed(1)} (${d.reviewCount})`}</span>
                <span className="visually-hidden">
                  {d.reviewCount === 0 ? 'no approved reviews' : `rated ${d.avgRating.toFixed(1)} from ${d.reviewCount} reviews`}
                </span>
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
