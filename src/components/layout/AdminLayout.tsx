import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import Header from './Header'
import { pageTitleFor } from './navItems'
import Sidebar from './Sidebar'

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const [lastPath, setLastPath] = useState(pathname)
  const [announcement, setAnnouncement] = useState('')
  // Same breakpoint as the CSS: below it the sidebar is a slide-in drawer instead of a docked column.
  const drawerMode = useMediaQuery('(max-width: 1024px)')
  const title = pageTitleFor(pathname)

  useDocumentTitle(`${title} · SUROY Admin`)

  // On every route change: close the mobile drawer, and tell screen readers where they are.
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setSidebarOpen(false)
    setAnnouncement(`${title} page`)
  }

  // Move focus into the drawer when it opens and back to the menu button when it closes.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (sidebarOpen) document.querySelector<HTMLElement>('.sidebar__close')?.focus()
    else if (wasOpen.current) document.querySelector<HTMLElement>('.header__menu')?.focus()
    wasOpen.current = sidebarOpen
  }, [sidebarOpen])

  return (
    <div className="admin-shell">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          // Focus the page area directly rather than changing the address with a #hash.
          e.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        Skip to main content
      </a>
      {/* While the drawer is closed (or hidden off-screen) its links must not be reachable by keyboard. */}
      <Sidebar open={sidebarOpen} inert={drawerMode && !sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* While the drawer is open, keyboard focus stays inside it. */}
      <div className="admin-main" inert={drawerMode && sidebarOpen}>
        <Header menuOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(true)} />
        <main id="main-content" tabIndex={-1} className="content">
          <Outlet />
        </main>
      </div>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  )
}
