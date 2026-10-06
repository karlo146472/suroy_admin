import type { ReactNode } from 'react'

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface StatusBadgeProps {
  tone?: BadgeTone
  children: ReactNode
}

export default function StatusBadge({ tone = 'neutral', children }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>
}
