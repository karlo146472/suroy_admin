import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  /** Optional call to action, e.g. an "Add destination" button. */
  action?: ReactNode
}

export default function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="state-box">
      <span className="state-box__icon">
        <Icon size={24} />
      </span>
      <span className="state-box__title">{title}</span>
      {description && <span className="state-box__text">{description}</span>}
      {action}
    </div>
  )
}
