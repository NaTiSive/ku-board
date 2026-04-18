import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
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
      <path
        d="M8 16v-3.2c0-.3.1-.6.3-.8l7.6-7.6a1.2 1.2 0 0 1 1.7 0l1 1a1.2 1.2 0 0 1 0 1.7l-7.6 7.6c-.2.2-.5.3-.8.3H8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14.7 6.2l3.1 3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4.5 19.2h15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconGlasses() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7.8 14.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M16.2 14.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M10.4 12.2h3.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.3-5.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 5v4h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="9" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20c1.6-3 4.3-4.5 7-4.5s5.4 1.5 7 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export default function NavigationBar() {
  const { enterIncognito, exitIncognito, isAdmin, isGuest, isIncognito, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [searchText, setSearchText] = useState('')

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

  useEffect(() => {
    if (location.pathname === '/search') {
      setSearchText(searchParams.get('q') ?? '')
    }
  }, [location.pathname, searchParams])

  const handleSearch = () => {
    const trimmed = searchText.trim()
    if (!trimmed) {
      return
    }

    const inferredType = trimmed.startsWith('#') ? 'hashtag' : trimmed.startsWith('@') ? 'users' : 'posts'
    const query = trimmed.replace(/^[@#]/, '')
    navigate(`/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(inferredType)}`)
  }

  return (
    <nav className="topbar">
      <div className="topbar-inner">
        <div className="topbar-left">
          <Link className="brand" to="/feed">
            <img className="brand-logo" src={KULogo} alt="KU Logo" />
            <span className="brand-name">KUBoard</span>
          </Link>
        </div>
        <div className="topbar-search-wrap">
          <button className="icon-button topbar-refresh" type="button" aria-label="Refresh" onClick={() => window.location.reload()}>
            <IconRefresh />
          </button>
          <div className="topbar-search">
            <input
              className="search-input"
              placeholder="Search posts, #hashtags, or @users"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSearch()
                }
              }}
            />
            <button
              className="icon-button topbar-search-button"
              type="button"
              aria-label="Search"
              onClick={handleSearch}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="topbar-actions">
          <NavLink className="icon-button" to="/feed" aria-label="Home">
            <IconHome />
          </NavLink>
          {isGuest ? (
            <div className="profile-menu" ref={menuRef}>
              <button
                className={`guest-pill ${menuOpen ? 'is-active' : ''}`}
                type="button"
                aria-label={isIncognito ? 'Incognito menu' : 'Guest menu'}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <span className="guest-pill-label">{isIncognito ? 'Incognito' : 'Guest'}</span>
                <span className="guest-pill-icon" aria-hidden="true">
                  <IconGlasses />
                </span>
              </button>
              {menuOpen && (
                <div className="menu-panel">
                  {isIncognito ? (
                    <>
                      <button
                        className="menu-item"
                        type="button"
                        onClick={() => {
                          exitIncognito()
                          setMenuOpen(false)
                        }}
                      >
                        Back to user
                      </button>
                      <button
                        className="menu-item"
                        type="button"
                        onClick={() => {
                          logout()
                          setMenuOpen(false)
                        }}
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link className="menu-item" to="/login" onClick={() => setMenuOpen(false)}>
                      Login
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink className="icon-button" to="/create" aria-label="Create post">
                <IconCreate />
              </NavLink>
              <NavLink className="icon-button" to="/notifications" aria-label="Notifications">
                <IconBell />
              </NavLink>
              <div className="profile-menu" ref={menuRef}>
                <button
                  className={`icon-button ${menuOpen ? 'is-active' : ''}`}
                  type="button"
                  aria-label="Profile menu"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
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
                    {isAdmin && (
                      <Link className="menu-item" to="/admin/accounts" onClick={() => setMenuOpen(false)}>
                        Account Management
                      </Link>
                    )}
                    <button
                      className="menu-item"
                      type="button"
                      onClick={() => {
                        enterIncognito()
                        setMenuOpen(false)
                      }}
                    >
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
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
