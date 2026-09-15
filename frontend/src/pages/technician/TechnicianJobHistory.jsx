import React, { useMemo, useState } from 'react'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import { selectCurrentTechnicianJobHistoryViewModels } from './data/technicianSelectors'

function TechnicianJobHistory() {
  const [historyJobs] = useState(() =>
    selectCurrentTechnicianJobHistoryViewModels(),
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedJob, setSelectedJob] = useState(null)

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

  if (selectedJob) {
    return (
      <div className="technician-job-history-page technician-job-history-detail">
        <header className="job-history-page-header job-history-detail-header">
          <div>
            <div className="page-kicker">TECHNICIAN · JOB HISTORY</div>
            <h2 className="page-title">Job Report</h2>
            <p className="page-subtitle">
              Review the recorded information for this completed service visit.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary job-history-back-button"
            onClick={() => setSelectedJob(null)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Job History
          </button>
        </header>

        <section className="job-history-report-card" aria-labelledby="job-report-service-title">
          <div className="job-history-report-summary">
            <div className="job-history-service-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <div className="job-history-report-identity">
              <span>Service completed</span>
              <h3 id="job-report-service-title">{selectedJob.serviceType}</h3>
              <p>{selectedJob.id}</p>
            </div>
            <JobStatusBadge status={selectedJob.status} />
          </div>

          <dl className="job-history-report-information">
            <div>
              <dt>Customer</dt>
              <dd>{selectedJob.customerName}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{selectedJob.formattedDate}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{selectedJob.estimatedDuration || '—'}</dd>
            </div>
            <div>
              <dt>AC Model / equipment</dt>
              <dd>{selectedJob.unitType || '—'}</dd>
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

        <section className="job-history-feedback-card" aria-labelledby="customer-feedback-title">
          <div className="job-history-feedback-heading">
            <div>
              <span className="job-history-section-label">CUSTOMER EXPERIENCE</span>
              <h3 id="customer-feedback-title">Customer Feedback</h3>
            </div>
            <div className="job-history-rating-placeholder" aria-label="Customer rating unavailable">
              <span aria-hidden="true">☆☆☆☆☆</span>
              <strong>—</strong>
            </div>
          </div>
          <p>No customer feedback is available for this historical job.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="technician-job-history-page">
      <header className="job-history-page-header">
        <div>
          <div className="page-kicker">TECHNICIAN · JOB HISTORY</div>
          <h2 className="page-title">Job History</h2>
          <p className="page-subtitle">
            Review completed service visits and their available report information.
          </p>
        </div>
        <span className="job-history-record-count">
          <strong>{historyJobs.length}</strong>
          <span>Completed jobs</span>
        </span>
      </header>

      <section className="job-history-list-panel" aria-labelledby="job-history-list-title">
        <div className="job-history-toolbar">
          <div className="job-history-search-field">
            <label htmlFor="job-history-search">Search history</label>
            <div className="job-history-search-control">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="job-history-search"
                type="search"
                value={searchQuery}
                placeholder="Search job, customer, service..."
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear job history search"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          <div className="job-history-date-filters" aria-label="Filter job history by date range">
            <div>
              <label htmlFor="job-history-date-from">From</label>
              <input
                id="job-history-date-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
            <span aria-hidden="true">to</span>
            <div>
              <label htmlFor="job-history-date-to">To</label>
              <input
                id="job-history-date-to"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
            {hasActiveFilters && (
              <button type="button" className="job-history-reset-button" onClick={resetFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="job-history-table-wrapper d-none d-md-block">
          <table className="job-history-table">
            <caption id="job-history-list-title" className="visually-hidden">
              Completed technician jobs
            </caption>
            <thead>
              <tr>
                <th scope="col">Job ID</th>
                <th scope="col">Customer</th>
                <th scope="col">Service</th>
                <th scope="col">Date</th>
                <th scope="col">Rating</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job.job_ID}>
                  <td><span className="job-history-id-chip">{job.id}</span></td>
                  <td>
                    <strong>{job.customerName}</strong>
                    <small>{job.address}</small>
                  </td>
                  <td>
                    <strong>{job.serviceType}</strong>
                    <small>{job.unitType || 'Equipment not available'}</small>
                  </td>
                  <td>
                    <strong>{job.formattedDate}</strong>
                    <small>{job.time}</small>
                  </td>
                  <td><span className="job-history-unavailable-value" aria-label="Rating unavailable">—</span></td>
                  <td>
                    <button type="button" className="job-history-view-button" onClick={() => setSelectedJob(job)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="job-history-mobile-list d-md-none">
          {filteredJobs.map((job) => (
            <article className="job-history-mobile-card" key={job.job_ID}>
              <div className="job-history-mobile-heading">
                <span className="job-history-id-chip">{job.id}</span>
                <JobStatusBadge status={job.status} />
              </div>
              <h3>{job.serviceType}</h3>
              <p>{job.customerName}</p>
              <dl>
                <div>
                  <dt>Date</dt>
                  <dd>{job.formattedDate}</dd>
                </div>
                <div>
                  <dt>Equipment</dt>
                  <dd>{job.unitType || '—'}</dd>
                </div>
                <div>
                  <dt>Rating</dt>
                  <dd>—</dd>
                </div>
              </dl>
              <button type="button" className="job-history-view-button" onClick={() => setSelectedJob(job)}>
                View Job Report
              </button>
            </article>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="job-history-empty-state" role="status">
            <span aria-hidden="true">⌕</span>
            <h3>No historical jobs found</h3>
            <p>Try changing the search text or selected date range.</p>
            {hasActiveFilters && (
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={resetFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}

        <footer className="job-history-list-footer">
          Showing <strong>{filteredJobs.length}</strong> of <strong>{historyJobs.length}</strong> completed jobs
        </footer>
      </section>
    </div>
  )
}

export default TechnicianJobHistory
