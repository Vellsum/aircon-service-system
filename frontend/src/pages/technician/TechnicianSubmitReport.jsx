import React from 'react'
import { Link } from 'react-router-dom'

/**
 * TechnicianSubmitReport Component (Placeholder)
 * Prepared for the subsequent Service Report implementation task.
 */
function TechnicianSubmitReport() {
  return (
    <div className="technician-submit-report-placeholder">
      <div className="page-header-container mb-4">
        <div className="page-kicker">TECHNICIAN</div>
        <h2 className="page-title">Submit Service Report</h2>
        <p className="page-subtitle text-muted mb-0">
          Document completed service details, parts used, checklist verification, and customer signature.
        </p>
      </div>

      <div className="card shadow-sm border-0 p-5 text-center">
        <div className="empty-state-icon mb-3" style={{ fontSize: '2.5rem' }}>📝</div>
        <h5 className="fw-bold">Service Report Module</h5>
        <p className="text-muted mx-auto mb-4" style={{ maxWidth: '500px' }}>
          This section is prepared for the upcoming Service Report task. You can currently manage and inspect your job assignments under Assigned Jobs.
        </p>
        <div>
          <Link to="/technician/assigned-jobs" className="btn btn-primary px-4">
            Go to Assigned Jobs
          </Link>
        </div>
      </div>
    </div>
  )
}

export default TechnicianSubmitReport
