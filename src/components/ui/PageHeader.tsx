import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  /** Buttons or other controls shown on the right, e.g. an "Add" button. */
  actions?: ReactNode
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-header__title">{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  )
}
