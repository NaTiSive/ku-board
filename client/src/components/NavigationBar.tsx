import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import KULogo from '../assets/ku-logo.svg'

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconCreate() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 1 0-9 0v4.5L6 17Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4.5 7.5 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="9" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20c1.6-3 4.3-4.5 7-4.5s5.4 1.5 7 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export default function NavigationBar() {
  const { logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current || !(event.target instanceof Node)) return
      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <nav className="topbar">
      <div className="topbar-inner">
        <div className="topbar-left">
          <Link className="brand" to="/feed">
            <img className="brand-logo" src={KULogo} alt="KU Logo" />
            <span className="brand-name">KUBoard</span>
          </Link>
        </div>
        <div className="topbar-search">
          <input className="search-input" placeholder="Hinted search text" />
          <button className="icon-button" type="button" aria-label="Search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="topbar-actions">
          <NavLink className="icon-button" to="/feed" aria-label="Home">
            <IconHome />
          </NavLink>
          <NavLink className="icon-button" to="/create" aria-label="Create post">
            <IconCreate />
          </NavLink>
          <NavLink className="icon-button" to="/notifications" aria-label="Notifications">
            <IconBell />
          </NavLink>
          <NavLink className="icon-button" to="/messages" aria-label="Messages">
            <IconMail />
          </NavLink>
          <div className="profile-menu" ref={menuRef}>
            <button
              className={`icon-button ${menuOpen ? 'is-active' : ''}`}
              type="button"
              aria-label="Profile menu"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <IconUser />
            </button>
            {menuOpen && (
              <div className="menu-panel">
                <Link className="menu-item" to="/profile" onClick={() => setMenuOpen(false)}>
                  View Profile
                </Link>
                <Link className="menu-item" to="/settings" onClick={() => setMenuOpen(false)}>
                  Settings
                </Link>
                <Link className="menu-item" to="/admin/accounts" onClick={() => setMenuOpen(false)}>
                  Account Management
                </Link>
                <button className="menu-item" type="button">
                  Incognito Mode
                </button>
                <Link
                  className="menu-item"
                  to="/"
                  onClick={() => {
                    logout()
                    setMenuOpen(false)
                  }}
                >
                  Logout
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
