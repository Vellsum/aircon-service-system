import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

function HistoryUnavailableIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
      <path d="M8 3.8 5.6 6.2M16 3.8l2.4 2.4" />
    </svg>
  )
}

function TechnicianJobHistory() {
  const { user } = useAuth()
  const technicianID = user?.technician_ID ?? null
  const hasTechnicianIdentity = technicianID !== null && technicianID !== undefined
  const [searchTerm, setSearchTerm] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const hasActiveFilters = Boolean(searchTerm || fromDate || toDate)
  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate)

  const clearFilters = () => {
    setSearchTerm('')
    setFromDate('')
    setToDate('')
  }

  return (
    <div className="technician-job-history-page cf-history-page">
      <header className="cf-page-header cf-history-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">Service records</span>
          <h1>Job History</h1>
          <p>Review durable completed-work records when technician history data is available.</p>
        </div>
        <div className="cf-history-summary-widget" aria-label="Completed historical jobs unavailable">
          <span className="cf-history-summary-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <span>
            <small>Completed jobs</small>
            <strong>—</strong>
          </span>
        </div>
      </header>

      <section className="cf-history-results-card" aria-labelledby="job-history-list-title">
        <header className="cf-results-header">
          <div>
            <span className="cf-widget-kicker">Completed work</span>
            <h2 id="job-history-list-title">Service Records</h2>
          </div>
          <span className="job-history-availability">History unavailable</span>
        </header>

        <section className="cf-history-filter-card" aria-labelledby="history-filter-title">
          <div className="cf-history-filter-heading">
            <div>
              <h3 id="history-filter-title">Filter records</h3>
              <p>Set filters now; historical results remain unavailable.</p>
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
                  placeholder="Job ID, customer, service..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            <div className="cf-date-filter-field">
              <label htmlFor="job-history-date-from">From date</label>
              <input
                id="job-history-date-from"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                aria-invalid={invalidDateRange}
                aria-describedby={invalidDateRange ? 'job-history-date-error' : undefined}
              />
            </div>
            <div className="cf-date-filter-field">
              <label htmlFor="job-history-date-to">To date</label>
              <input
                id="job-history-date-to"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                aria-invalid={invalidDateRange}
                aria-describedby={invalidDateRange ? 'job-history-date-error' : undefined}
              />
            </div>
            {hasActiveFilters && (
              <div className="job-history-filter-feedback">
                {invalidDateRange && (
                  <p id="job-history-date-error" className="job-history-date-error" role="alert">
                    From date cannot be later than To date.
                  </p>
                )}
                <button type="button" className="cf-history-reset" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="job-history-records-canvas">
          <div className="cf-empty-state" role="status">
            <span aria-hidden="true">
              <HistoryUnavailableIcon />
            </span>
            <h3>
              {hasTechnicianIdentity
                ? 'Job history is currently unavailable.'
                : 'Technician identity is unavailable.'}
            </h3>
            <p>
              {hasTechnicianIdentity
                ? 'A durable technician job-history source is not currently provided by the application.'
                : 'Historical records require a technician identity from the signed-in account.'}
            </p>
          </div>
        </div>

        <footer className="cf-workspace-footer">
          <span>Historical record totals remain unavailable.</span>
        </footer>
      </section>
    </div>
  )
}

export default TechnicianJobHistory
