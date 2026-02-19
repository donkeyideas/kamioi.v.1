import { useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext.tsx'

interface NavLink {
  label: string
  to: string
}

const NAV_LINKS: NavLink[] = [
  { label: 'Features', to: '/features' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Learn', to: '/learn' },
  { label: 'Blog', to: '/blog' },
]

/**
 * PublicNav - Responsive navigation bar for public (non-dashboard) pages.
 * Glass background, sticky positioning, gradient logo, mobile hamburger menu.
 */
export function PublicNav() {
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleToggleMobile = useCallback(() => {
    setMobileOpen(prev => !prev)
  }, [])

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false)
  }, [])

  return (
    <>
      <nav className="aurora-public-nav" role="navigation" aria-label="Main navigation">
        <div className="aurora-public-nav__inner">
          {/* Logo */}
          <Link to="/" className="aurora-public-nav__logo" aria-label="Kamioi home">
            Kamioi
          </Link>

          {/* Desktop nav links */}
          <ul className="aurora-public-nav__links">
            {NAV_LINKS.map(link => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`aurora-public-nav__link${
                    location.pathname === link.to ? ' aurora-public-nav__link--active' : ''
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right actions */}
          <div className="aurora-public-nav__actions">
            {/* Theme toggle */}
            <button
              type="button"
              className="aurora-public-nav__theme-btn"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Sign In */}
            <Link to="/login" className="aurora-public-nav__sign-in">
              Sign In
            </Link>

            {/* Get Started CTA */}
            <Link to="/register" className="aurora-public-nav__cta">
              Get Started
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="aurora-public-nav__hamburger"
              onClick={handleToggleMobile}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="aurora-public-nav__overlay"
          onClick={handleCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-out menu */}
      <div
        className={`aurora-public-nav__mobile${mobileOpen ? ' aurora-public-nav__mobile--open' : ''}`}
        role="dialog"
        aria-label="Mobile navigation"
      >
        <ul className="aurora-public-nav__mobile-links">
          {NAV_LINKS.map(link => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`aurora-public-nav__mobile-link${
                  location.pathname === link.to ? ' aurora-public-nav__mobile-link--active' : ''
                }`}
                onClick={handleCloseMobile}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="aurora-public-nav__mobile-actions">
          <Link
            to="/login"
            className="aurora-public-nav__mobile-sign-in"
            onClick={handleCloseMobile}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="aurora-public-nav__mobile-cta"
            onClick={handleCloseMobile}
          >
            Get Started
          </Link>
        </div>
      </div>
    </>
  )
}
