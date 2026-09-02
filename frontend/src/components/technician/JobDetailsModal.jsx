import React from 'react'
import Modal from 'react-bootstrap/Modal'
import JobStatusBadge from './JobStatusBadge'

/**
 * JobDetailsModal Component
 * Interactive modal dialog for inspecting complete job information and unit specifications.
 */
function JobDetailsModal({ job, show, onHide }) {
  if (!job) return null

  // Initials for avatar
  const initials = job.customerName
    ? job.customerName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CU'

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      contentClassName="job-details-modal-content"
    >
      <Modal.Header closeButton className="border-bottom pb-3 pt-4 px-4 bg-light-subtle">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <span className="job-id-chip fs-6">{job.id}</span>
          <JobStatusBadge status={job.status} />
          {job.priority && job.priority !== 'Normal' && (
            <span className={`badge ${job.priority === 'Urgent' ? 'bg-danger' : 'bg-warning text-dark'} px-2.5 py-1`}>
              {job.priority} Priority
            </span>
          )}
        </div>
      </Modal.Header>

      <Modal.Body className="px-4 py-4">
        {/* Customer Information Card */}
        <div className="job-modal-section-card mb-3">
          <div className="section-subtitle">Customer Details</div>
          <div className="d-flex align-items-center gap-3">
            <div className="customer-avatar-lg">
              {initials}
            </div>
            <div className="flex-grow-1">
              <h5 className="mb-1 fw-bold text-dark">{job.customerName}</h5>
              <div className="d-flex flex-wrap gap-3 text-muted small mt-1">
                {job.customerPhone && (
                  <a href={`tel:${job.customerPhone}`} className="text-decoration-none text-secondary d-flex align-items-center gap-1.5 fw-medium">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <span>{job.customerPhone}</span>
                  </a>
                )}
                {job.customerEmail && (
                  <a href={`mailto:${job.customerEmail}`} className="text-decoration-none text-secondary d-flex align-items-center gap-1.5 fw-medium">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span>{job.customerEmail}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Location */}
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <div className="job-modal-section-card h-100">
              <div className="section-subtitle">Appointment Schedule</div>
              <div className="d-flex align-items-start gap-3">
                <div className="info-icon-box text-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div>
                  <div className="fw-bold text-dark">{job.formattedDate}</div>
                  <div className="text-muted small mt-0.5">{job.time} {job.estimatedDuration ? `• Est. ${job.estimatedDuration}` : ''}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="job-modal-section-card h-100">
              <div className="section-subtitle">Service Location</div>
              <div className="d-flex align-items-start gap-3">
                <div className="info-icon-box text-danger">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <div className="fw-bold text-dark">{job.address}</div>
                  {job.postalCode && <div className="text-muted small mt-0.5">Singapore {job.postalCode}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment Specs */}
        <div className="job-modal-section-card mb-3">
          <div className="section-subtitle">Equipment & Service Details</div>
          <div className="row g-3">
            <div className="col-sm-6">
              <div className="text-muted small">Service Type</div>
              <div className="fw-bold text-dark mt-0.5">{job.serviceType}</div>
            </div>
            <div className="col-sm-6">
              <div className="text-muted small">Air-Con Equipment</div>
              <div className="fw-bold text-dark mt-0.5">{job.unitType || 'Standard Split Units'}</div>
            </div>
          </div>
        </div>

        {/* Technician Notes */}
        {job.notes && (
          <div className="job-modal-section-card">
            <div className="section-subtitle">Technician Instructions & Notes</div>
            <div className="p-3 bg-white rounded-3 border text-secondary small lh-base">
              {job.notes}
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-top pt-3 px-4 pb-4 bg-light-subtle">
        <button type="button" className="btn btn-outline-secondary px-4 fw-medium" onClick={onHide}>
          Close
        </button>
        {job.status === 'Upcoming' && (
          <button type="button" className="btn btn-primary px-4 fw-semibold" onClick={onHide}>
            Start Service
          </button>
        )}
        {job.status === 'In Progress' && (
          <button type="button" className="btn btn-warning px-4 text-dark fw-bold" onClick={onHide}>
            Continue Service
          </button>
        )}
        {job.status === 'Completed' && (
          <button type="button" className="btn btn-success px-4 fw-semibold" onClick={onHide}>
            Completed Record
          </button>
        )}
      </Modal.Footer>
    </Modal>
  )
}

export default JobDetailsModal
