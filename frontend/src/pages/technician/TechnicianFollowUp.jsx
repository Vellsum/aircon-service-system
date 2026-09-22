// =============================================================================
// TechnicianFollowUp.jsx — Follow-Up page connected to backend
//
// FIXES:
//   1. Replaced static selectors with live API data via context
//   2. Filters assigned jobs where isFollowup === true
//   3. Maps API fields to component's expected format
//   4. Added loading state and error handling
//   5. Auto-refreshes when context jobs update
// =============================================================================

import React, { useMemo, useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'

const FOLLOW_UP_STATUSES = ['Upcoming', 'In Progress', 'Completed']
const FOLLOW_UP_GROUPS = [
  {
    status: 'Upcoming',
    title: 'Upcoming Return Visits',
    description: 'Scheduled return visits that have not started.',
    tone: 'upcoming',
  },
  {
    status: 'In Progress',
    title: 'In Progress Follow-Ups',
    description: 'Return service currently being handled.',
    tone: 'progress',
  },
  {
    status: 'Completed',
    title: 'Completed Follow-Ups',
    description: 'Return visits that have been completed.',
    tone: 'completed',
  },
]

function FollowUpSummaryIcon({ type }) {
  if (type === 'upcoming') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
        <line x1="3" y1="11" x2="21" y2="11" />
        <circle cx="16" cy="16" r="3" />
        <path d="M16 14.5V16l1 1" />
      </svg>
    )
  }
  if (type === 'progress') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
        <path d="M4.5 5.5 7 3M17 3l2.5 2.5" />
      </svg>
    )
  }
  if (type === 'completed') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.6 2.6L16.5 9" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M7 7h10a4 4 0 0 1 4 4v1" />
      <path d="m18 9 3 3-3 3" />
      <path d="M17 17H7a4 4 0 0 1-4-4v-1" />
      <path d="m6 15-3-3 3-3" />
    </svg>
  )
}

// =============================================================================
// Helper: Format date string for display
// =============================================================================
function formatDate(dateStr) {
  if (!dateStr) return 'TBD'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-SG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// =============================================================================
// Main Component
// =============================================================================
function TechnicianFollowUp() {
  // ---- Get live data from context ----
  const { assignedJobs, loading } = useTechnicianWorkflow()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedFollowUp, setSelectedFollowUp] = useState(null)

  // ====================================================================
  // Map assigned jobs → follow-up records
  // Only include jobs where isFollowup === true
  // Maps API field names to component's expected format
  // ====================================================================
  const followUps = useMemo(() => {
    return assignedJobs
      .filter((job) => job.isFollowup === true)
      .map((job) => ({
        // Identity fields
        bookingID: job.job_ID,
        jobID: job.job_ID,
        id: job.id || `#BK${String(job.job_ID).padStart(3, '0')}`,

        // Customer & service info
        customerName: job.customerName || 'Guest Customer',
        customerID: job.customer_ID || job.customerId,
        serviceName: job.serviceType || 'Aircon Servicing',
        serviceID: job.service_ID,
        location: job.address || 'Singapore',

        // Scheduling
        date: job.date,
        formattedDate: formatDate(job.date),
        time: job.time || '09:00 AM',

        // Status & flags
        status: job.status || 'Upcoming',
        technicianID: job.technician_ID,
        isFollowupReport: job.isFollowup === true,
      }))
  }, [assignedJobs])

  // ---- Metrics ----
  const metrics = useMemo(
    () => ({
      total: followUps.length,
      upcoming: followUps.filter((r) => r.status === 'Upcoming' || r.status === 'Pending' || r.status === 'Assigned').length,
      inProgress: followUps.filter((r) => r.status === 'In Progress').length,
      completed: followUps.filter((r) => r.status === 'Completed').length,
    }),
    [followUps],
  )

  // ---- Filtered results ----
  const filteredFollowUps = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return followUps.filter((record) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const filterLower = statusFilter.toLowerCase()
        const recordStatus = (record.status || '').toLowerCase()

        // Map "Upcoming" filter to also match Pending/Assigned
        if (filterLower === 'upcoming') {
          if (recordStatus !== 'upcoming' && recordStatus !== 'pending' && recordStatus !== 'assigned') {
            return false
          }
        } else if (recordStatus !== filterLower) {
          return false
        }
      }

      // Search filter
      if (!normalizedQuery) return true

      return [
        record.bookingID,
        record.jobID,
        record.id,
        record.customerName,
        record.serviceName,
        record.location,
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(normalizedQuery),
      )
    })
  }, [followUps, searchQuery, statusFilter])

  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter !== 'ALL')
  const visibleGroups = statusFilter === 'ALL'
    ? FOLLOW_UP_GROUPS
    : FOLLOW_UP_GROUPS.filter((group) => group.status === statusFilter)

  const summaryItems = [
    {
      label: 'Total Follow-Ups',
      value: metrics.total,
      tone: 'mint',
      icon: 'total',
      supportingText: 'Assigned return visits',
    },
    {
      label: 'Upcoming',
      value: metrics.upcoming,
      tone: 'blue',
      icon: 'upcoming',
      supportingText: 'Waiting for service',
    },
    {
      label: 'In Progress',
      value: metrics.inProgress,
      tone: 'amber',
      icon: 'progress',
      supportingText: 'Currently being handled',
    },
    {
      label: 'Completed',
      value: metrics.completed,
      tone: 'green',
      icon: 'completed',
      supportingText: 'Return visits completed',
    },
  ]

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
  }

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <div className="technician-follow-up-page">
      <header className="cf-page-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">TECHNICIAN · FOLLOW-UP</span>
          <h1>Follow-Up</h1>
          <p>Review assigned return visits that require additional service attention.</p>
        </div>
        <div className="follow-up-assignment-status" aria-label="Follow-up assignment status">
          <span className="follow-up-assignment-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <line x1="8" y1="3" x2="8" y2="7" />
              <line x1="16" y1="3" x2="16" y2="7" />
              <line x1="3" y1="11" x2="21" y2="11" />
            </svg>
          </span>
          <span>
            <small>Assigned visits</small>
            <strong>{metrics.total}</strong>
          </span>
        </div>
      </header>

      {/* ---- Summary Cards ---- */}
      <section className="follow-up-summary-grid" aria-label="Follow-up visit summary">
        {summaryItems.map((item) => (
          <article className="follow-up-summary-card" key={item.label}>
            <span className={`follow-up-summary-icon follow-up-summary-icon-${item.tone}`}>
              <FollowUpSummaryIcon type={item.icon} />
            </span>
            <span className="follow-up-summary-copy">
              <small>{item.label}</small>
              <strong>{item.value}</strong>
              <span>{item.supportingText}</span>
            </span>
          </article>
        ))}
      </section>

      {/* ---- Search & Filter Controls ---- */}
      <section className="follow-up-controls" aria-labelledby="follow-up-controls-title">
        <div className="follow-up-controls-copy">
          <span className="cf-widget-kicker">Return-service tracking</span>
          <h2 id="follow-up-controls-title">Find a follow-up visit</h2>
        </div>
        <div className="follow-up-toolbar">
          <div className="follow-up-search-field">
            <label htmlFor="follow-up-search">Search follow-ups</label>
            <div className="follow-up-search-control">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="follow-up-search"
                type="search"
                value={searchQuery}
                placeholder="Search booking, job, customer, service, location..."
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear follow-up search">
                  &times;
                </button>
              )}
            </div>
          </div>

          <div className="follow-up-status-field">
            <label htmlFor="follow-up-status">Status</label>
            <select
              id="follow-up-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All Statuses</option>
              {FOLLOW_UP_STATUSES.map((status) => (
                <option value={status} key={status}>{status}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button type="button" className="cf-button cf-button-quiet follow-up-reset-button" onClick={resetFilters}>
              Clear filters
            </button>
          )}
        </div>
        <span className="follow-up-result-count" aria-live="polite">
          <strong>{filteredFollowUps.length}</strong> of {followUps.length} visits shown
        </span>
      </section>

      {/* ---- Loading State ---- */}
      {loading ? (
        <section className="follow-up-empty-state follow-up-empty-state-page" role="status">
          <h3>Loading follow-up visits from database...</h3>
        </section>
      ) : followUps.length === 0 ? (
        /* ---- Empty State ---- */
        <section className="follow-up-empty-state follow-up-empty-state-page" role="status">
          <span className="follow-up-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <line x1="8" y1="3" x2="8" y2="7" />
              <line x1="16" y1="3" x2="16" y2="7" />
              <line x1="3" y1="11" x2="21" y2="11" />
              <path d="M9 16h6" />
            </svg>
          </span>
          <h3>No follow-up visits assigned.</h3>
          <p>Follow-up bookings flagged during service reports will appear here.</p>
        </section>
      ) : filteredFollowUps.length === 0 ? (
        /* ---- No Filter Results ---- */
        <section className="follow-up-empty-state follow-up-empty-state-page" role="status">
          <span className="follow-up-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.2" y2="16.2" />
            </svg>
          </span>
          <h3>No follow-up visits match your filters.</h3>
          <p>Clear the search or status filter to review all assigned follow-ups.</p>
          <button type="button" className="cf-button cf-button-secondary" onClick={resetFilters}>
            Clear filters
          </button>
        </section>
      ) : (
        /* ---- Follow-Up Groups ---- */
        <div className="follow-up-groups">
          {visibleGroups.map((group) => {
            // Map "Upcoming" group to also include Pending/Assigned jobs
            const groupRecords = filteredFollowUps.filter((record) => {
              if (group.status === 'Upcoming') {
                return (
                  record.status === 'Upcoming' ||
                  record.status === 'Pending' ||
                  record.status === 'Assigned'
                )
              }
              return record.status === group.status
            })

            return (
              <section
                className={`follow-up-group follow-up-group-${group.tone}`}
                aria-labelledby={`follow-up-group-${group.tone}`}
                key={group.status}
              >
                <header className="follow-up-group-header">
                  <span className="follow-up-group-marker" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <line x1="8" y1="3" x2="8" y2="7" />
                      <line x1="16" y1="3" x2="16" y2="7" />
                      <line x1="3" y1="11" x2="21" y2="11" />
                    </svg>
                  </span>
                  <div>
                    <h2 id={`follow-up-group-${group.tone}`}>{group.title}</h2>
                    <p>{group.description}</p>
                  </div>
                  <span className="follow-up-group-count">
                    {groupRecords.length} {groupRecords.length === 1 ? 'visit' : 'visits'}
                  </span>
                </header>

                {groupRecords.length > 0 ? (
                  <div className="follow-up-visit-grid">
                    {groupRecords.map((record) => (
                      <article className="follow-up-visit-card" key={`${record.bookingID}:${record.jobID}`}>
                        <header className="follow-up-visit-card-header">
                          <div>
                            <span className="follow-up-card-kicker">Return service visit</span>
                            <strong>{record.customerName}</strong>
                          </div>
                          <JobStatusBadge status={record.status} />
                        </header>

                        <div className="follow-up-visit-content">
                          <div className="follow-up-return-schedule">
                            <span className="follow-up-return-icon" aria-hidden="true">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                                <rect x="3" y="5" width="18" height="16" rx="2" />
                                <line x1="8" y1="3" x2="8" y2="7" />
                                <line x1="16" y1="3" x2="16" y2="7" />
                                <line x1="3" y1="11" x2="21" y2="11" />
                              </svg>
                            </span>
                            <div>
                              <span>Scheduled return</span>
                              <time dateTime={record.date}>
                                <strong>{record.formattedDate}</strong>
                                <small>{record.time}</small>
                              </time>
                            </div>
                          </div>
                          <dl className="follow-up-visit-details">
                            <div><dt>Customer</dt><dd>{record.customerName}</dd></div>
                            <div><dt>Service</dt><dd>{record.serviceName}</dd></div>
                            <div className="follow-up-visit-location"><dt>Location</dt><dd>{record.location}</dd></div>
                          </dl>
                        </div>

                        <footer className="follow-up-visit-footer">
                          <div className="follow-up-visit-references">
                            <span>Booking #{record.bookingID}</span>
                            <span>{record.id}</span>
                            <span>Job #{record.jobID}</span>
                            {record.isFollowupReport && (
                              <span className="follow-up-report-context">
                                <span aria-hidden="true" />
                                Follow-up flagged
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="follow-up-view-button"
                            onClick={() => setSelectedFollowUp(record)}
                          >
                            View Details
                          </button>
                        </footer>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="follow-up-group-empty" role="status">
                    <span aria-hidden="true">—</span>
                    <p>
                      {hasActiveFilters
                        ? `No ${group.status.toLowerCase()} follow-up visits match your filters.`
                        : `No ${group.status.toLowerCase()} follow-up visits assigned.`}
                    </p>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* ---- Footer ---- */}
      <footer className="follow-up-page-footer">
        <span>
          Showing <strong>{filteredFollowUps.length}</strong> of <strong>{followUps.length}</strong> return visits
        </span>
        <span>
          <span className="duty-dot-pulse" aria-hidden="true" />
          Live sync active
        </span>
      </footer>

      {/* ---- Detail Modal ---- */}
      <Modal
        show={Boolean(selectedFollowUp)}
        onHide={() => setSelectedFollowUp(null)}
        centered
        size="lg"
        aria-labelledby="follow-up-detail-title"
        contentClassName="follow-up-detail-modal"
      >
        {selectedFollowUp && (
          <>
            <Modal.Header closeButton>
              <div className="follow-up-detail-heading">
                <span className="cf-eyebrow">Follow-up visit</span>
                <Modal.Title id="follow-up-detail-title">{selectedFollowUp.serviceName}</Modal.Title>
                <div>
                  <span>{selectedFollowUp.id}</span>
                  <JobStatusBadge status={selectedFollowUp.status} />
                </div>
              </div>
            </Modal.Header>
            <Modal.Body>
              <div className="follow-up-detail-grid">
                <section>
                  <span>Customer</span>
                  <strong>{selectedFollowUp.customerName}</strong>
                  <small>Customer #{selectedFollowUp.customerID}</small>
                </section>
                <section>
                  <span>Schedule</span>
                  <strong>{selectedFollowUp.formattedDate}</strong>
                  <small>{selectedFollowUp.time}</small>
                </section>
                <section>
                  <span>Location</span>
                  <strong>{selectedFollowUp.location}</strong>
                  <small>Follow-up booking location</small>
                </section>
                <section>
                  <span>Service</span>
                  <strong>{selectedFollowUp.serviceName}</strong>
                  <small>
                    {selectedFollowUp.serviceID !== undefined
                      ? `Service #${selectedFollowUp.serviceID}`
                      : 'Assigned service'}
                  </small>
                </section>
                <section>
                  <span>Booking</span>
                  <strong>#{selectedFollowUp.bookingID}</strong>
                  <small>Assigned to technician #{selectedFollowUp.technicianID}</small>
                </section>
                <section>
                  <span>Job</span>
                  <strong>#{selectedFollowUp.jobID}</strong>
                  <small>{selectedFollowUp.isFollowupReport ? 'Service report flagged follow-up' : 'Follow-up booking'}</small>
                </section>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <button type="button" className="cf-button cf-button-secondary" onClick={() => setSelectedFollowUp(null)}>
                Close
              </button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  )
}

export default TechnicianFollowUp