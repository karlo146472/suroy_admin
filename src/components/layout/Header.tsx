import { LogOut, Menu, User } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentAdmin } from '../../hooks/session'
import { ConfirmDialog } from '../ui'

interface HeaderProps {
  onMenuClick: () => void
  /** Whether the mobile menu drawer is open, so assistive tech can announce the button's state. */
  menuOpen: boolean
}

export default function Header({ onMenuClick, menuOpen }: HeaderProps) {
  const navigate = useNavigate()
  const { admin } = useCurrentAdmin()
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)

  return (
    <header className="header">
      <button
        type="button"
        className="icon-button header__menu"
        onClick={onMenuClick}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        aria-controls="sidebar"
      >
        <Menu size={20} />
      </button>
      <div className="header__spacer" />
      <div className="header__user">
        <span className="header__avatar">
          <User size={20} />
        </span>
        <span className="header__user-text">
          <span className="header__user-name">{admin?.name}</span>
          <span className="header__user-role">{admin?.role}</span>
        </span>
      </div>
      <button
        type="button"
        className="icon-button"
        onClick={() => setConfirmingSignOut(true)}
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut size={20} />
      </button>

      <ConfirmDialog
        open={confirmingSignOut}
        title="Sign Out?"
        message="You will need to sign in again to use the admin dashboard. Anything you have not saved will be lost."
        confirmLabel="Sign Out"
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={() => {
          setConfirmingSignOut(false)
          // Replace this page in history so the Back button can't return to a protected page.
          navigate('/logout', { replace: true })
        }}
      />
    </header>
  )
}
