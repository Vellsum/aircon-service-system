import React from 'react'
import JobStatusBadge from './JobStatusBadge'

/**
 * JobRow Component
 * High-polish desktop table row for Assigned Jobs.
 */
function JobRow({ job, onView }) {
  const initials = job.customerName
    ? job.customerName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CU'

  return (
    <tr className="job-table-row align-middle">
      {/* JOB ID */}
      <td className="ps-4">
        <span className="job-id-chip">{job.id}</span>
      </td>

      {/* CUSTOMER */}
      <td>
        <div className="d-flex align-items-center gap-3">
          <div className="customer-avatar-sm" aria-hidden="true">
            {initials}
          </div>
          <div>
            <div className="fw-bold text-dark">{job.customerName}</div>
            <div className="text-muted small d-flex align-items-center gap-1 mt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="text-truncate" style={{ maxWidth: '190px' }}>
                {job.address}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* SERVICE & EQUIPMENT */}
      <td>
        <div className="d-flex align-items-center gap-2 mb-1">
          <span className="fw-semibold text-dark">{job.serviceType}</span>
          {job.serviceCategory && (
            <span className="service-category-tag">{job.serviceCategory}</span>
          )}
        </div>
        {job.unitType && (
          <div className="text-muted small text-truncate" style={{ maxWidth: '240px' }}>
            {job.unitType}
          </div>
        )}
      </td>

      {/* DATE & TIME */}
      <td>
        <div className="text-dark fw-semibold">{job.formattedDate}</div>
        <div className="text-muted small d-flex align-items-center gap-1 mt-0.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 14 14"/>
          </svg>
          <span>{job.time}</span>
        </div>
      </td>

      {/* STATUS */}
      <td>
        <JobStatusBadge status={job.status} />
      </td>

      {/* ACTIONS */}
      <td className="text-end pe-4">
        <button
          type="button"
          className="action-view-btn"
          onClick={() => onView(job)}
          title={`View details for ${job.id}`}
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
          <span>View</span>
        </button>
      </td>
    </tr>
  )
}

export default JobRow
