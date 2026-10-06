import { LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, PageHeader } from '../components/ui'

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page Not Found" description="The page you were looking for does not exist or has moved." />
      <EmptyState
        title="Nothing to see here"
        description="Check the address, or go back to the dashboard."
        action={
          <Link to="/" className="btn btn--primary">
            <LayoutDashboard size={16} /> Back to Dashboard
          </Link>
        }
      />
    </>
  )
}
