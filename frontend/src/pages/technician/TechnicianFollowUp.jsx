// =============================================================================
// TechnicianFollowUp.jsx — return visits created from service reports
// Updated: 6 Oct 2026
//   1. [FIX] 'Scheduled' now counts as Upcoming (real DB status — was missing,
//      so Scheduled follow-ups never appeared in the Upcoming group).
//   2. [DATA] Follow-up bookings are auto-created when a report flags
//      "follow-up required" (technicianReportController). This page shows
//      bookings where isFollowup = 1, grouped by their status.
//   3. [TRIM] Removed verbose icon components, dead fields and duplicate
//      mapping. Same CSS classes — styling untouched.
// =============================================================================
import React, { useMemo, useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'

// Statuses meaning "not started yet" ('Upcoming' itself doesn't exist in the DB)
const UPCOMING_STATUSES = ['pending', 'assigned', 'scheduled', 'upcoming']

function formatDate(dateStr) {
  if (!dateStr) return 'TBD'
  const d = new Date(String(dateStr).length === 10 ? dateStr + 'T00:00:00' : dateStr)
  return isNaN(d.getTime()) ? String(dateStr)
    : d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /><line x1="3" y1="11" x2="21" y2="11" />
  </svg>
)
const LoopIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18" aria-hidden="true">
    <path d="M7 7h10a4 4 0 0 1 4 4v1" /><path d="m18 9 3 3-3 3" />
    <path d="M17 17H7a4 4 0 0 1-4-4v-1" /><path d="m6 15-3-3 3-3" />
  </svg>
)
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
)
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.6L16.5 9" />
  </svg>
)

const GROUPS = [
  { status: 'Upcoming',   title: 'Upcoming Return Visits',     description: 'Scheduled return visits that have not started.', tone: 'upcoming',   Icon: CalendarIcon },
  { status: 'In Progress', title: 'In Progress Follow-Ups',    description: 'Return service currently being handled.',        tone: 'progress',   Icon: ClockIcon },
  { status: 'Completed',  title: 'Completed Follow-Ups',       description: 'Return visits that have been completed.',        tone: 'completed',  Icon: CheckIcon },
]

function TechnicianFollowUp() {
  const { assignedJobs, loading } = useTechnicianWorkflow()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)

  // Bookings flagged as follow-ups, mapped to the display shape
  const followUps = useMemo(
    () => assignedJobs
      .filter((job) => job.isFollowup === true)
      .map((job) => ({
        bookingID: job.job_ID,
        id: job.id || `#BK${String(job.job_ID).padStart(3, '0')}`,
        customerName: job.customerName || 'Guest Customer',
        customerID: job.customer_ID,
        serviceName: job.serviceType || 'Aircon Servicing',
        location: job.address || 'Singapore',
        date: job.date,
        formattedDate: formatDate(job.date),
        time: job.time || '',
        status: job.status || 'Pending',
        technicianID: job.technician_ID,
      })),
    [assignedJobs],
  )

  const matchesGroup = (status, group) => {
    const s = String(status || '').toLowerCase()
    return group === 'Upcoming' ? UPCOMING_STATUSES.includes(s) : s === group.toLowerCase()
  }

  const metrics = useMemo(() => ({
    total: followUps.length,
    upcoming: followUps.filter((r) => matchesGroup(r.status, 'Upcoming')).length,
    inProgress: followUps.filter((r) => matchesGroup(r.status, 'In Progress')).length,
    completed: followUps.filter((r) => matchesGroup(r.status, 'Completed')).length,
  }), [followUps])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return followUps.filter((r) => {
      if (statusFilter !== 'ALL' && !matchesGroup(r.status, statusFilter)) return false
      if (!q) return true
      return [r.id, r.bookingID, r.customerName, r.serviceName, r.location]
        .some((v) => String(v ?? '').toLowerCase().includes(q))
    })
  }, [followUps, searchQuery, statusFilter])

  const visibleGroups = statusFilter === 'ALL' ? GROUPS : GROUPS.filter((g) => g.status === statusFilter)
  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter !== 'ALL')

  return (
    <div className="technician-follow-up-page">
      <header className="cf-page-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">TECHNICIAN · FOLLOW-UP</span>
          <h1>Follow-Up</h1>
          <p>Return visits created when a service report flags “follow-up required”.</p>
        </div>
        <div className="follow-up-assignment-status" aria-label="Follow-up assignment status">
          <span className="follow-up-assignment-icon"><LoopIcon /></span>
          <span><small>Assigned visits</small><strong>{metrics.total}</strong></span>
        </div>
      </header>

      {/* Summary cards */}
      <section className="follow-up-summary-grid" aria-label="Follow-up visit summary">
        <article className="follow-up-summary-card">
          <span className="follow-up-summary-icon-follow-up-summary-icon-mint"><LoopIcon /></span>
          <span className="follow-up-summary-copy"><small>Total Follow-Ups</small><strong>{metrics.total}</strong><span>Assigned return visits</span></span>
        </article>
        <article className="follow-up-summary-card">
          <span className="follow-up-summary-icon-follow-up-summary-icon-blue"><CalendarIcon /></span>
          <span className="follow-up-summary-copy"><small>Upcoming</small><strong>{metrics.upcoming}</strong><span>Waiting for service</span></span>
        </article>
        <article className="follow-up-summary-card">
          <span className="follow-up-summary-icon-follow-up-summary-icon-amber"><ClockIcon /></span>
          <span className="follow-up-summary-copy"><small>In Progress</small><strong>{metrics.inProgress}</strong><span>Currently being handled</span></span>
        </article>
        <article className="follow-up-summary-card">
          <span className="follow-up-summary-icon-follow-up-summary-icon-green"><CheckIcon /></span>
          <span className="follow-up-summary-copy"><small>Completed</small><strong>{metrics.completed}</strong><span>Return visits completed</span></span>
        </article>
      </section>

      {/* Search & filter */}
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
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input id="follow-up-search" type="search" value={searchQuery}
                placeholder="Search booking, customer, service, location..."
                onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear follow-up search">&times;</button>
              )}
            </div>
          </div>
          <div className="follow-up-status-field">
            <label htmlFor="follow-up-status">Status</label>
            <select id="follow-up-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              {GROUPS.map((g) => <option value={g.status} key={g.status}>{g.status}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <button type="button" className="cf-button cf-button-quiet follow-up-reset-button"
              onClick={() => { setSearchQuery(''); setStatusFilter('ALL') }}>
              Clear filters
            </button>
          )}
        </div>
        <span className="follow-up-result-count" aria-live="polite">
          <strong>{filtered.length}</strong> of {followUps.length} visits shown
        </span>
      </section>

      {/* States */}
      {loading ? (
        <section className="follow-up-empty-state follow-up-empty-state-page" role="status">
          <h3>Loading follow-up visits from database...</h3>
        </section>
      ) : followUps.length === 0 ? (
        <section className="follow-up-empty-state follow-up-empty-state-page" role="status">
          <span className="follow-up-empty-icon" aria-hidden="true"><LoopIcon /></span>
          <h3>No follow-up visits yet.</h3>
          <p>Flag “Follow-up required” when submitting a service report — the return visit is created automatically and appears here.</p>
        </section>
      ) : filtered.length === 0 ? (
        <section className="follow-up-empty-state follow-up-empty-state-page" role="status">
          <span className="follow-up-empty-icon" aria-hidden="true"><CalendarIcon /></span>
          <h3>No follow-up visits match your filters.</h3>
          <button type="button" className="cf-button cf-button-secondary"
            onClick={() => { setSearchQuery(''); setStatusFilter('ALL') }}>
            Clear filters
          </button>
        </section>
      ) : (
        /* Groups */
        <div className="follow-up-groups">
          {visibleGroups.map((group) => {
            const records = filtered.filter((r) => matchesGroup(r.status, group.status))
            return (
              <section className={`follow-up-group follow-up-group-${group.tone}`}
                aria-labelledby={`follow-up-group-${group.tone}`} key={group.status}>
                <header className="follow-up-group-header">
                  <span className="follow-up-group-marker" aria-hidden="true"><group.Icon /></span>
                  <div>
                    <h2 id={`follow-up-group-${group.tone}`}>{group.title}</h2>
                    <p>{group.description}</p>
                  </div>
                  <span className="follow-up-group-count">
                    {records.length} {records.length === 1 ? 'visit' : 'visits'}
                  </span>
                </header>

                {records.length > 0 ? (
                  <div className="follow-up-visit-grid">
                    {records.map((record) => (
                      <article className="follow-up-visit-card" key={record.bookingID}>
                        <header className="follow-up-visit-card-header">
                          <div>
                            <span className="follow-up-card-kicker">Return service visit</span>
                            <strong>{record.customerName}</strong>
                          </div>
                          <JobStatusBadge status={record.status} />
                        </header>

                        <div className="follow-up-visit-content">
                          <div className="follow-up-return-schedule">
                            <span className="follow-up-return-icon" aria-hidden="true"><CalendarIcon /></span>
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
                            <span className="follow-up-report-context"><span aria-hidden="true" /> Follow-up flagged</span>
                          </div>
                          <button type="button" className="follow-up-view-button" onClick={() => setSelected(record)}>
                            View Details
                          </button>
                        </footer>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="follow-up-group-empty" role="status">
                    <span aria-hidden="true">—</span>
                    <p>No {group.status.toLowerCase()} follow-up visits.</p>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      <footer className="follow-up-page-footer">
        <span>Showing <strong>{filtered.length}</strong> of <strong>{followUps.length}</strong> return visits</span>
        <span><span className="duty-dot-pulse" aria-hidden="true" /> Live sync active</span>
      </footer>

      {/* Detail modal */}
      <Modal show={Boolean(selected)} onHide={() => setSelected(null)} centered size="lg"
        aria-labelledby="follow-up-detail-title" contentClassName="follow-up-detail-modal">
        {selected && (
          <>
            <Modal.Header closeButton>
              <div className="follow-up-detail-heading">
                <span className="cf-eyebrow">Follow-up visit</span>
                <Modal.Title id="follow-up-detail-title">{selected.serviceName}</Modal.Title>
                <div><span>{selected.id}</span> <JobStatusBadge status={selected.status} /></div>
              </div>
            </Modal.Header>
            <Modal.Body>
              <div className="follow-up-detail-grid">
                <section>
                  <span>Customer</span>
                  <strong>{selected.customerName}</strong>
                  <small>Customer #{selected.customerID ?? '—'}</small>
                </section>
                <section>
                  <span>Schedule</span>
                  <strong>{selected.formattedDate}</strong>
                  <small>{selected.time || 'Time to be confirmed'}</small>
                </section>
                <section>
                  <span>Location</span>
                  <strong>{selected.location}</strong>
                  <small>Follow-up booking location</small>
                </section>
                <section>
                  <span>Booking</span>
                  <strong>#{selected.bookingID}</strong>
                  <small>Assigned to technician #{selected.technicianID ?? '—'}</small>
                </section>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <button type="button" className="cf-button cf-button-secondary" onClick={() => setSelected(null)}>Close</button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  )
}

export default TechnicianFollowUp