import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  /** Small line under the value, e.g. "+12 this week". */
  hint?: string
}

export default function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card__body">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value}</span>
        {hint && <span className="stat-card__hint">{hint}</span>}
      </div>
      {Icon && (
        <span className="stat-card__icon">
          <Icon size={20} />
        </span>
      )}
    </div>
  )
}
