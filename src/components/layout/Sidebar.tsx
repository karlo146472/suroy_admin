import { X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import logo from '../../assets/suroy-logo.png'
import { navItems } from './navItems'

interface SidebarProps {
  open: boolean
  /** True while the drawer is closed on a small screen: nothing inside can be focused or read. */
  inert: boolean
  onClose: () => void
}

export default function Sidebar({ open, inert, onClose }: SidebarProps) {
  return (
    <>
      {open && <div className="sidebar__scrim" onClick={onClose} aria-hidden="true" />}
      <aside
        id="sidebar"
        className={`sidebar${open ? ' sidebar--open' : ''}`}
        aria-label="Sidebar"
        inert={inert}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) onClose()
        }}
      >
        <div className="sidebar__brand">
          <img className="sidebar__logo" src={logo} alt="" aria-hidden="true" />
          <span className="sidebar__title">
            SUROY
            <span className="sidebar__subtitle">Tourism Admin</span>
          </span>
          <button type="button" className="icon-button sidebar__close" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar__nav" aria-label="Main">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-link" onClick={onClose}>
              <Icon size={20} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
