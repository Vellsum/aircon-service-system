import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import TechnicianSidebar from '../components/technician/TechnicianSidebar'

/**
 * TechnicianLayout Component
 * Base layout wrapper hosting the sidebar and dynamic content area.
 */
function TechnicianLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Format today's date for display
  const todayFormatted = 'Wednesday, 29 Jul 2026'

  return (
    <div className="technician-portal-wrapper">
      {/* Sidebar Navigation */}
      <TechnicianSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Shell */}
      <div className="technician-main-container">
        {/* Top Header Bar */}
        <header className="technician-topbar d-flex align-items-center justify-content-between px-3 px-md-4 py-2.5">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-outline-secondary d-lg-none p-1 px-2 border-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open Navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="topbar-portal-tag">
              <span className="duty-dot-pulse" style={{ width: '5px', height: '5px' }} />
              <span>Technician Operations Hub</span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2.5">
            <div className="topbar-date-pill d-none d-md-flex align-items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{todayFormatted}</span>
            </div>

            {/* Notification / Alert Button */}
            <button
              type="button"
              className="topbar-alert-btn d-flex align-items-center gap-1.5"
              title="System Alerts"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="d-none d-sm-inline">Alerts</span>
              <span className="badge bg-primary rounded-pill ms-1" style={{ fontSize: '0.7rem' }}>2</span>
            </button>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="technician-content-area px-3 px-md-4 py-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default TechnicianLayout
