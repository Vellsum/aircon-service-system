import React, { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import TechnicianSidebar from '../components/technician/TechnicianSidebar'
import CoolFixLogo from '../components/technician/CoolFixLogo'
import { TechnicianWorkflowProvider } from '../context/TechnicianWorkflowContext'

/**
 * TechnicianLayout Component
 * Base layout wrapper hosting the sidebar and dynamic content area.
 */
function TechnicianLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const restoreMenuFocusRef = useRef(false)

  // Format today's date for display
  const todayFormatted = 'Wednesday, 29 Jul 2026'

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Cool Fix | Technician Portal'

    return () => {
      document.title = previousTitle
    }
  }, [])

  useEffect(() => {
    if (!sidebarOpen && restoreMenuFocusRef.current) {
      restoreMenuFocusRef.current = false
      menuButtonRef.current?.focus()
    }
  }, [sidebarOpen])

  const closeSidebar = () => {
    if (sidebarOpen) {
      restoreMenuFocusRef.current = true
    }
    setSidebarOpen(false)
  }

  return (
    <div className="technician-portal-wrapper">
      {/* Sidebar Navigation */}
      <TechnicianSidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      {/* Main Content Shell */}
      <div className="technician-main-container">
        <header className="technician-topbar cf-admin-topbar">
          <div className="cf-topbar-leading">
            <button
              ref={menuButtonRef}
              type="button"
              className="topbar-menu-button btn d-lg-none"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open Navigation"
              aria-controls="technician-sidebar-navigation"
              aria-expanded={sidebarOpen}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="topbar-mobile-brand d-lg-none">
              <CoolFixLogo className="cool-fix-mobile-logo" />
            </div>
            <div className="cf-topbar-context d-none d-lg-flex">
              <span className="cf-topbar-context-label">Field operations</span>
              <span className="cf-topbar-context-date">{todayFormatted}</span>
            </div>
          </div>

          <div className="topbar-actions cf-topbar-actions">
            <span className="topbar-duty-status cf-shift-status d-none d-sm-flex">
              <span className="duty-dot-pulse" />
              <span className="cf-shift-copy">
                <small>Shift status</small>
                <strong>On Shift / Active</strong>
              </span>
            </span>

            <button
              type="button"
              className="topbar-alert-btn cf-topbar-alert"
              title="System Alerts"
              aria-label="System alerts, 2 notifications"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="topbar-alert-count" aria-hidden="true">2</span>
            </button>
          </div>
        </header>

        <TechnicianWorkflowProvider>
          <main className="technician-content-area">
            <Outlet />
          </main>
        </TechnicianWorkflowProvider>
      </div>
    </div>
  )
}

export default TechnicianLayout
