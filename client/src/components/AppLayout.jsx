import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ROLES } from '../constants'
import { useAuth } from '../context/useAuth'

const navigationItems = [
  {
    label: 'Home',
    to: '/',
    roles: [ROLES.ADMINISTRATOR, ROLES.SALES],
  },
  {
    label: 'Fruits',
    to: '/fruits',
    roles: [ROLES.ADMINISTRATOR, ROLES.SALES],
  },
  {
    label: 'Box Sizes and Products',
    to: '/products',
    roles: [ROLES.ADMINISTRATOR, ROLES.SALES],
  },
  {
    label: 'Stock',
    to: '/stock',
    roles: [ROLES.ADMINISTRATOR],
  },
  {
    label: 'Suppliers',
    to: '/suppliers',
    roles: [ROLES.ADMINISTRATOR],
  },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const visibleItems = navigationItems.filter((item) =>
    item.roles.includes(user.role),
  )
  const pageTitle =
    navigationItems.find((item) => item.to === location.pathname)?.label ??
    'Home'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-layout">
      {isMenuOpen && (
        <button
          aria-label="Close navigation"
          className="sidebar-backdrop"
          onClick={() => setIsMenuOpen(false)}
          type="button"
        />
      )}
      <aside
        aria-label="Main navigation"
        className={`sidebar${isMenuOpen ? ' sidebar--open' : ''}`}
        id="main-sidebar"
      >
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            BF
          </span>
          <span className="brand-name">Batloung Fruits</span>
        </div>
        <nav className="sidebar-navigation">
          <p className="navigation-label">Workspace</p>
          {visibleItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `navigation-link${isActive ? ' navigation-link--active' : ''}`
              }
              end={item.to === '/'}
              key={item.to}
              onClick={() => setIsMenuOpen(false)}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-account">
          <div className="account-details">
            <span className="account-name">{user.fullName}</span>
            <span className="account-role">{user.role}</span>
          </div>
          <button
            className="logout-button"
            onClick={handleLogout}
            type="button"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="top-bar">
          <button
            aria-controls="main-sidebar"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
            className="menu-button"
            onClick={() => setIsMenuOpen((open) => !open)}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="page-title">{pageTitle}</h1>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
