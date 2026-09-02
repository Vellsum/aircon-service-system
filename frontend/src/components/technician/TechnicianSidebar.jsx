import React from 'react'
import { NavLink } from 'react-router-dom'

/**
 * TechnicianSidebar Component
 * Refined dark navy navigation sidebar for the AirCon Care Technician Portal.
 */
function TechnicianSidebar({ isOpen, onClose }) {
  const navItems = [
    {
      to: '/technician/dashboard',
      label: 'Dashboard',
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

      <aside className={`technician-sidebar ${isOpen ? 'show' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-header">
          <div className="d-flex align-items-center gap-3">
            <div className="brand-logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                <path d="M12 12v9"/>
                <path d="m8 17 4 4 4-4"/>
              </svg>
            </div>
            <div>
              <div className="brand-title">AirCon Care</div>
              <div className="brand-subtitle">Technician Portal</div>
            </div>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white d-lg-none"
            aria-label="Close sidebar"
            onClick={onClose}
          />
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav-menu">
          <ul className="list-unstyled mb-0">
            {navItems.map((item) => (
              <li key={item.to} className="nav-item">
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `nav-link d-flex align-items-center gap-3 ${
                      isActive ? 'active' : ''
                    }`
                  }
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Technician Profile Card in Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-profile-card d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2 overflow-hidden">
              <div className="tech-avatar">ML</div>
              <div className="overflow-hidden">
                <div className="tech-name text-truncate">Marcus Lee</div>
                <div className="tech-role text-truncate">Field Technician</div>
              </div>
            </div>
            <div className="duty-status-badge">
              <span className="duty-dot-pulse" />
              <span>On Duty</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default TechnicianSidebar
