import React from 'react'
import JobStatusBadge from './JobStatusBadge'

/**
 * JobCard Component
 * Refined mobile and tablet card view for Assigned Jobs.
 */
function JobCard({ job, onView }) {
  const initials = job.customerName
    ? job.customerName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CU'

  return (
    <div className="job-mobile-card mb-3 p-3">
      {/* Header: ID + Status */}
      <div className="d-flex justify-content-between align-items-center mb-2.5">
        <span className="job-id-chip">{job.id}</span>
        <JobStatusBadge status={job.status} />
      </div>

      {/* Customer Info */}
      <div className="d-flex align-items-center gap-2.5 mb-2.5">
        <div className="customer-avatar-sm" aria-hidden="true">
          {initials}
        </div>
        <div>
          <div className="fw-bold text-dark">{job.customerName}</div>
          <div className="text-muted small d-flex align-items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="text-truncate" style={{ maxWidth: '230px' }}>
              {job.address}
            </span>
          </div>
        </div>
      </div>

      {/* Service & Equipment Box */}
      <div className="bg-light p-2.5 rounded-3 mb-2.5 border">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bold text-dark">{job.serviceType}</span>
            {job.serviceCategory && (
              <span className="service-category-tag">{job.serviceCategory}</span>
            )}
          </div>
          <span className="text-muted small fw-medium">{job.time}</span>
        </div>
        <div className="text-muted small text-truncate">
          {job.unitType}
        </div>
      </div>

      {/* Date & Action */}
      <div className="d-flex justify-content-between align-items-center pt-2 border-top">
        <span className="text-secondary small fw-semibold">{job.formattedDate}</span>
        <button
          type="button"
          className="action-view-btn px-3"
          onClick={() => onView(job)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>View Details</span>
        </button>
      </div>
    </div>
  )
}

export default JobCard
