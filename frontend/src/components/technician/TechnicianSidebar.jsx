import React, { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import CoolFixLogo from './CoolFixLogo'
import { useAuth } from '../../context/AuthContext'

/**
 * TechnicianSidebar Component
 * Navigation sidebar for the Cool Fix Technician Portal.
 */
function TechnicianSidebar({ isOpen, onClose }) {
  const {user} = useAuth()
  const closeButtonRef = useRef(null)
  

  useEffect(() => {
    if (!isOpen) return undefined

    closeButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const navItems = [
    {
      to: '/technician/dashboard',
      label: 'Dashboard',
      section: 'Workspace',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      to: '/technician/assigned-jobs',
      label: 'Assigned Jobs',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
    },
    {
      to: '/technician/submit-report',
      label: 'Submit Report',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
    },
    {
      to: '/technician/follow-up',
      label: 'Follow-Up',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      ),
    },
    {
      to: '/technician/job-history',
      label: 'Job History',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 14 14"/>
        </svg>
      ),
    },
    {
      to: '/technician/parts-log',
      label: 'Parts Log',
      section: 'Operations',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      ),
    },
    {
      to: '/technician/performance',
      label: 'Performance',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
    },
    {
      to: '/technician/profile',
      label: 'Profile',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ]

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop d-lg-none"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="technician-sidebar-navigation"
        className={`technician-sidebar cf-sidebar ${isOpen ? 'show' : ''}`}
      >
        <div className="sidebar-brand-header cf-sidebar-brand">
          <div className="sidebar-brand-lockup cf-sidebar-brand-lockup">
            <CoolFixLogo className="cool-fix-sidebar-logo" />
            <div className="brand-subtitle">Technician Portal</div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="btn-close d-lg-none"
            aria-label="Close sidebar"
            onClick={onClose}
          />
        </div>

        <nav className="sidebar-nav-menu cf-sidebar-nav" aria-label="Technician navigation">
          <ul className="list-unstyled mb-0">
            {navItems.map((item) => (
              <React.Fragment key={item.to}>
                {item.section && (
                  <li className="sidebar-nav-section" aria-hidden="true">
                    {item.section}
                  </li>
                )}
                <li className="nav-item">
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `nav-link d-flex align-items-center gap-3 ${
                        isActive ? 'active' : ''
                      }`
                    }
                  >
                    <span className="nav-icon cf-nav-icon">{item.icon}</span>
                    <span className="nav-label cf-nav-label">{item.label}</span>
                  </NavLink>
                </li>
              </React.Fragment>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer cf-sidebar-footer">
          <div className="sidebar-profile-card cf-profile-card">
            <div className="cf-profile-identity">
            <div className="tech-avatar">
              {(user?.username || user?.role || 'T').charAt(0).toUpperCase()}
            </div>
            <div className="cf-profile-copy">
              <div className="tech-name text-truncate">
                {user?.username || 'Technician'}
              </div>
              <div className="tech-role text-truncate">Field Technician</div>
            </div>
            </div>
            <div className="cf-profile-status" aria-label="On duty">
              <span className="duty-dot-pulse" />
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default TechnicianSidebar