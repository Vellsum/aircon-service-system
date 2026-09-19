import React from 'react'
import Modal from 'react-bootstrap/Modal'
import JobStatusBadge from './JobStatusBadge'

function JobDetailsModal({ job, show, onHide, onStartService }) {
  if (!job) return null

  const initials = job.customerName
    ? job.customerName
        .split(' ')
        .map((name) => name[0])
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
      contentClassName="job-details-modal-content cf-job-modal"
    >
      <Modal.Header closeButton className="cf-job-modal-header">
        <div className="cf-job-modal-heading">
          <span className="cf-eyebrow">Assigned job</span>
          <div>
            <h2>{job.serviceType}</h2>
            <span className="job-id-chip">{job.id}</span>
            <JobStatusBadge status={job.status} />
            {job.priority && job.priority !== 'Normal' && (
              <span className={`cf-priority-badge cf-priority-${job.priority.toLowerCase()}`}>
                {job.priority} priority
              </span>
            )}
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="cf-job-modal-body">
        <section className="cf-modal-customer-card" aria-labelledby="modal-customer-title">
          <div className="customer-avatar-lg" aria-hidden="true">{initials}</div>
          <div className="cf-modal-customer-copy">
            <span>Customer</span>
            <h3 id="modal-customer-title">{job.customerName}</h3>
            <div className="cf-modal-contact-row">
              {job.customerPhone && (
                <a href={`tel:${job.customerPhone}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {job.customerPhone}
                </a>
              )}
              {job.customerEmail && (
                <a href={`mailto:${job.customerEmail}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  {job.customerEmail}
                </a>
              )}
            </div>
          </div>
        </section>

        <div className="cf-modal-detail-grid">
          <section className="cf-modal-detail-card">
            <span className="cf-modal-detail-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <div><span>Appointment</span><strong>{job.formattedDate}</strong><small>{job.time} {job.estimatedDuration ? `· Est. ${job.estimatedDuration}` : ''}</small></div>
          </section>
          <section className="cf-modal-detail-card">
            <span className="cf-modal-detail-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <div><span>Service location</span><strong>{job.address}</strong><small>{job.postalCode ? `Singapore ${job.postalCode}` : 'Singapore'}</small></div>
          </section>
          <section className="cf-modal-detail-card">
            <span className="cf-modal-detail-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M7 15h10M8 9h8" />
              </svg>
            </span>
            <div><span>Equipment</span><strong>{job.unitType || 'Standard Split Units'}</strong><small>{job.serviceCategory || 'Air-conditioning service'}</small></div>
          </section>
          <section className="cf-modal-detail-card">
            <span className="cf-modal-detail-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </span>
            <div><span>Service type</span><strong>{job.serviceType}</strong><small>Assigned field visit</small></div>
          </section>
        </div>

        {job.notes && (
          <section className="cf-modal-notes">
            <span>Technician Instructions &amp; Notes</span>
            <p>{job.notes}</p>
          </section>
        )}
      </Modal.Body>

      <Modal.Footer className="cf-job-modal-footer">
        <button type="button" className="cf-button cf-button-quiet" onClick={onHide}>Close</button>
        {job.status === 'Upcoming' && (
          <button type="button" className="cf-button cf-button-primary" onClick={() => (onStartService ? onStartService(job) : onHide())}>
            Start Service
          </button>
        )}
        {job.status === 'In Progress' && (
          <button type="button" className="cf-button cf-button-primary cf-button-progress" onClick={onHide}>Continue Service</button>
        )}
        {job.status === 'Completed' && (
          <button type="button" className="cf-button cf-button-secondary" onClick={onHide}>Completed Record</button>
        )}
      </Modal.Footer>
    </Modal>
  )
}

export default JobDetailsModal
