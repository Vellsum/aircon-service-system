// =============================================================================
// TechnicianJobHistory.jsx — Job History page connected to backend
//
// FIXES:
//   1. Replaced static selectors with live data from context
//   2. Filters for Completed jobs only (job history = past work)
//   3. Fetches service report details from API when viewing a job
//   4. Added loading state and error handling
//   5. Date formatting helper
// =============================================================================

import React, { useMemo, useState, useEffect } from 'react'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'

const API_BASE_URL = 'http://localhost:5000'

function ViewDetailsIcon() {
  return (
    <svg
      className="job-history-view-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Helper: Format date for display
// ---------------------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
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
function TechnicianJobHistory() {
  // ---- Get live data from context ----
  const { assignedJobs, loading } = useTechnicianWorkflow()

  // ---- Filter for completed jobs only (job history) ----
  const historyJobs = useMemo(() => {
    return assignedJobs
      .filter((job) => {
        const status = (job.status || '').toLowerCase()
        return status === 'completed'
      })
      .map((job) => ({
        ...job,
        formattedDate: formatDate(job.date),
      }))
  }, [assignedJobs])

  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedJob, setSelectedJob] = useState(null)

  // ---- Fetch service report when viewing job details ----
  const [jobReport, setJobReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    if (!selectedJob) {
      setJobReport(null)
      return
    }

    // Fetch the service report for this job from the API
    const fetchReport = async () => {
      setReportLoading(true)
      try {
        const token = localStorage.getItem('token') || ''
        const headers = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        // Find report by job_ID
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
        const techId = storedUser.technician_ID || storedUser.id || storedUser.user_ID || 1
        
        const res = await fetch(
          `${API_BASE_URL}/api/technician/reports?techId=${techId}`,
          { headers }
        )
        const data = await res.json()

        if (res.ok && data.success && Array.isArray(data.reports)) {
          // Find the report matching this job
          const match = data.reports.find(
            (r) => r.job_ID === selectedJob.job_ID
          )
          setJobReport(match || null)
        } else {
          setJobReport(null)
        }
      } catch (err) {
        console.error('[JobHistory] Failed to fetch report:', err)
        setJobReport(null)
      } finally {
        setReportLoading(false)
      }
    }

    fetchReport()
  }, [selectedJob])

  // ---- Filtered results ----
  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return historyJobs.filter((job) => {
      if (dateFrom && job.date < dateFrom) return false
      if (dateTo && job.date > dateTo) return false
      if (!normalizedQuery) return true

      return [
        job.id,
        job.customerName,
        job.serviceType,
        job.unitType,
        job.address,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery))
    })
  }, [dateFrom, dateTo, historyJobs, searchQuery])

  const hasActiveFilters = Boolean(searchQuery || dateFrom || dateTo)

  const resetFilters = () => {
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
  }

  // ====================================================================
  // DETAIL VIEW — when a job is selected
  // ====================================================================
    // ====================================================================
  // DETAIL VIEW — when a job is selected
  // ====================================================================
  if (selectedJob) {
    // ---- Format the completed datetime from service report ----
    const formatCompletedTime = (isoStr) => {
      if (!isoStr) return '—'
      try {
        const d = new Date(isoStr)
        if (isNaN(d.getTime())) return isoStr
        return d.toLocaleString('en-SG', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      } catch {
        return isoStr
      }
    }

    return (
      <div className="technician-job-history-page technician-job-history-detail cf-history-detail">
        <header className="cf-page-header cf-history-detail-header">
          <div className="cf-page-heading">
            <span className="cf-eyebrow">Completed service record</span>
            <h1>Job Report</h1>
            <p>Review the available information for this completed service visit.</p>
          </div>
          <button
            type="button"
            className="cf-button cf-button-secondary job-history-back-button"
            onClick={() => setSelectedJob(null)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Job History
          </button>
        </header>

        {/* ---- Hero Banner ---- */}
        <section className="cf-history-report-hero" aria-labelledby="job-report-service-title">
          <div className="cf-history-report-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div className="cf-history-report-identity">
            <span>Service completed</span>
            <h2 id="job-report-service-title">{selectedJob.serviceType}</h2>
            <p>{selectedJob.id}</p>
          </div>
          <JobStatusBadge status={selectedJob.status} />
        </section>

        {/* ---- Two-Column Detail Grid ---- */}
        <div className="cf-history-detail-grid">
          {/* ============================================================
               LEFT: Service Information
               ============================================================ */}
          <section className="cf-widget cf-history-information-card" aria-labelledby="service-information-title">
            <header className="cf-widget-header cf-widget-header-compact">
              <div>
                <span className="cf-widget-kicker">Visit overview</span>
                <h2 id="service-information-title">Service Information</h2>
              </div>
            </header>
            <dl className="cf-history-information-grid">
              <div>
                <dt>Customer</dt>
                <dd>{selectedJob.customerName}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{selectedJob.formattedDate}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{selectedJob.time || '—'}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{selectedJob.estimatedDuration || '—'}</dd>
              </div>
              <div>
                <dt>AC Model / Equipment</dt>
                <dd>{selectedJob.unitType || '—'}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{selectedJob.address || '—'}</dd>
              </div>
              <div>
                <dt>Rating</dt>
                <dd aria-label="Per-job rating unavailable">—</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd aria-label="Job amount unavailable">—</dd>
              </div>
            </dl>
          </section>

          {/* ============================================================
               RIGHT: Service Report (from API)
               ============================================================ */}
          <section className="cf-widget cf-history-feedback-card" aria-labelledby="service-report-details-title">
            <header className="cf-widget-header cf-widget-header-compact">
              <div>
                <span className="cf-widget-kicker">Field report</span>
                <h2 id="service-report-details-title">Service Report</h2>
              </div>
            </header>

            {reportLoading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>
                <span aria-hidden="true">⏳</span> Loading report details...
              </div>
            ) : jobReport ? (
              <dl className="cf-history-information-grid">
                {/* Report ID */}
                <div>
                  <dt>Report ID</dt>
                  <dd>
                    <span style={{
                      display: 'inline-block',
                      background: '#e8f5e9',
                      color: '#2e7d32',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '0.85em',
                      fontWeight: 600,
                    }}>
                      #{jobReport.reportID}
                    </span>
                  </dd>
                </div>

                {/* Findings */}
                <div>
                  <dt>Findings</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>
                    {jobReport.findings || '—'}
                  </dd>
                </div>

                {/* AC Condition */}
                <div>
                  <dt>AC Condition</dt>
                  <dd>
                    <span style={{
                      display: 'inline-block',
                      background:
                        jobReport.AC_condition === 'Excellent' ? '#e8f5e9' :
                        jobReport.AC_condition === 'Good' ? '#e3f2ed' :
                        jobReport.AC_condition === 'Fair' ? '#fff8e1' :
                        jobReport.AC_condition === 'Poor' ? '#fbe9e7' :
                        '#f3e5f5',
                      color:
                        jobReport.AC_condition === 'Excellent' ? '#2e7d32' :
                        jobReport.AC_condition === 'Good' ? '#388e3c' :
                        jobReport.AC_condition === 'Fair' ? '#f57f17' :
                        jobReport.AC_condition === 'Poor' ? '#d32f2f' :
                        '#7b1fa2',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '0.85em',
                      fontWeight: 600,
                    }}>
                      {jobReport.AC_condition || '—'}
                    </span>
                  </dd>
                </div>

                {/* Actions Taken */}
                <div>
                  <dt>Actions Taken</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>
                    {jobReport.actionsTaken || '—'}
                  </dd>
                </div>

                {/* Materials Cost */}
                <div>
                  <dt>Materials Cost</dt>
                  <dd>
                    {jobReport.materialsTotal && Number(jobReport.materialsTotal) > 0
                      ? `$${Number(jobReport.materialsTotal).toFixed(2)}`
                      : '—'}
                  </dd>
                </div>

                {/* Recommendations / Follow-up */}
                <div>
                  <dt>Recommendations</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>
                    {jobReport.recommendations || '—'}
                  </dd>
                </div>

                {/* Checklist */}
                <div>
                  <dt>Checklist</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>
                    {jobReport.serviceChecklist || '—'}
                  </dd>
                </div>

                {/* ✅ FIXED: Completed Time — formatted from ISO string */}
                <div>
                  <dt>Completed</dt>
                  <dd>{formatCompletedTime(jobReport.completedDateTime)}</dd>
                </div>

                {/* Customer Acknowledged */}
                <div>
                  <dt>Customer Acknowledged</dt>
                  <dd>
                    {jobReport.customerAcknowledged ? (
                      <span style={{ color: '#2e7d32', fontWeight: 600 }}>
                        ✓ Yes
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>No</span>
                    )}
                  </dd>
                </div>

                {/* Internal Notes */}
                {jobReport.notes && (
                  <div>
                    <dt>Internal Notes</dt>
                    <dd style={{
                      whiteSpace: 'pre-wrap',
                      background: '#f5f5f5',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.9em',
                      borderLeft: '3px solid #ccc',
                    }}>
                      {jobReport.notes}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <>
                <div className="cf-history-rating-placeholder" aria-label="No service report found">
                  <span aria-hidden="true">📋</span>
                  <strong>—</strong>
                </div>
                <p style={{ color: '#888', fontSize: '0.9em' }}>
                  No service report was submitted for this job.
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    )
  }

  // ====================================================================
  // LIST VIEW — main job history table
  // ====================================================================
  return (
    <div className="technician-job-history-page cf-history-page">
      <header className="cf-page-header cf-history-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">Service records</span>
          <h1>Job History</h1>
          <p>Review completed visits and open their available service report information.</p>
        </div>
        <div className="cf-history-summary-widget">
          <span className="cf-history-summary-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <span>
            <small>Completed jobs</small>
            <strong>{historyJobs.length}</strong>
          </span>
        </div>
      </header>

      {/* ---- Filters ---- */}
      <section className="cf-history-filter-card" aria-labelledby="history-filter-title">
        <div className="cf-history-filter-heading">
          <span className="cf-filter-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </span>
          <div>
            <h2 id="history-filter-title">Filter records</h2>
            <p>Search by job details or narrow results by service date.</p>
          </div>
        </div>

        <div className="cf-history-filter-grid">
          <div className="job-history-search-field">
            <label htmlFor="job-history-search">Search history</label>
            <div className="job-history-search-control">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="job-history-search"
                type="search"
                value={searchQuery}
                placeholder="Job ID, customer, service..."
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear job history search">
                  &times;
                </button>
              )}
            </div>
          </div>

          <div className="cf-date-filter-field">
            <label htmlFor="job-history-date-from">From date</label>
            <input
              id="job-history-date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className="cf-date-filter-field">
            <label htmlFor="job-history-date-to">To date</label>
            <input
              id="job-history-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
          {hasActiveFilters && (
            <button type="button" className="cf-button cf-button-quiet cf-history-reset" onClick={resetFilters}>
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* ---- Results ---- */}
      <section className="cf-history-results-card" aria-labelledby="job-history-list-title">
        <header className="cf-results-header">
          <div>
            <span className="cf-widget-kicker">Completed work</span>
            <h2 id="job-history-list-title">Service Records</h2>
          </div>
          <span>{filteredJobs.length} of {historyJobs.length} records</span>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <p>Loading job history from database...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="job-history-table-wrapper d-none d-lg-block">
              <table className="job-history-table">
                <thead>
                  <tr>
                    <th scope="col">Job ID</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Service</th>
                    <th scope="col">Date</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.job_ID}>
                      <td><span className="job-history-id-chip">{job.id}</span></td>
                      <td><strong>{job.customerName}</strong><small>{job.address}</small></td>
                      <td><strong>{job.serviceType}</strong><small>{job.unitType || 'Equipment not available'}</small></td>
                      <td><strong>{job.formattedDate}</strong><small>{job.time}</small></td>
                      <td>
                        <button
                          type="button"
                          className="job-history-view-button"
                          aria-label={`View details for ${job.id}`}
                          onClick={() => setSelectedJob(job)}
                        >
                          <ViewDetailsIcon />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="job-history-mobile-list d-lg-none">
              {filteredJobs.map((job) => (
                <article className="job-history-mobile-card" key={job.job_ID}>
                  <div className="job-history-mobile-heading">
                    <span className="job-history-id-chip">{job.id}</span>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <h3>{job.serviceType}</h3>
                  <p>{job.customerName}</p>
                  <dl>
                    <div><dt>Date</dt><dd>{job.formattedDate}</dd></div>
                    <div><dt>Equipment</dt><dd>{job.unitType || '—'}</dd></div>
                  </dl>
                  <button
                    type="button"
                    className="job-history-view-button"
                    aria-label={`View details for ${job.id}`}
                    onClick={() => setSelectedJob(job)}
                  >
                    <ViewDetailsIcon />
                    View Details
                  </button>
                </article>
              ))}
            </div>

            {filteredJobs.length === 0 && (
              <div className="cf-empty-state" role="status">
                <span aria-hidden="true">⌕</span>
                <h3>No historical jobs found</h3>
                <p>Try changing the search text or selected date range.</p>
                {hasActiveFilters && (
                  <button type="button" className="cf-button cf-button-secondary" onClick={resetFilters}>
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <footer className="cf-workspace-footer">
          <span>
            Showing <strong>{filteredJobs.length}</strong> of <strong>{historyJobs.length}</strong> completed jobs
          </span>
        </footer>
      </section>
    </div>
  )
}

export default TechnicianJobHistory