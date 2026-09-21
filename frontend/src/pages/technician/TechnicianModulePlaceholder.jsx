import React from 'react'
import { Link, useLocation } from 'react-router-dom'

/**
 * TechnicianModulePlaceholder Component
 * Clean placeholder for auxiliary technician routes
 */
function TechnicianModulePlaceholder({ title }) {
  const location = useLocation()
  const displayTitle = title || location.pathname.split('/').pop().replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="technician-module-placeholder">
      <div className="page-header-container mb-4">
        <div className="page-kicker">TECHNICIAN</div>
        <h2 className="page-title">{displayTitle}</h2>
        <p className="page-subtitle text-muted mb-0">
          Module prepared for future development phases.
        </p>
      </div>

      <div className="card shadow-sm border-0 p-5 text-center">
        <div className="empty-state-icon mb-3" style={{ fontSize: '2.5rem' }}>⚙️</div>
        <h5 className="fw-bold">{displayTitle}</h5>
        <p className="text-muted mx-auto mb-4" style={{ maxWidth: '450px' }}>
          This feature module is scheduled in the project roadmap.
        </p>
        <div>
          <Link to="/technician/assigned-jobs" className="btn btn-outline-primary px-4">
            Back to Assigned Jobs
          </Link>
        </div>
      </div>
    </div>
  )
}

export default TechnicianModulePlaceholder
