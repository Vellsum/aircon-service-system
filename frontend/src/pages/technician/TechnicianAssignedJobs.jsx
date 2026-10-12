// =============================================================================
// TechnicianAssignedJobs.jsx
// -----------------------------------------------------------------------------
// CHANGELOG — 6 Oct 2026:
//   1. [RULE] Start is gated by utils/jobSchedule.evaluateJobStart — future-
//      dated (or later-today) jobs show why they're locked instead of starting.
//      Backend enforces the same rule, so this cannot be bypassed.
//   2. [FIX] "Upcoming" filter/status now maps to real DB statuses
//      (Scheduled / Pending / Assigned) — the old filter matched a status that
//      never exists, so it always showed 0 jobs.
//   3. [FIX] todayStr uses the LOCAL date (was toISOString/UTC).
//   4. [FIX] handleCompleteService refreshes jobs after completion so counts
//      stay in sync with the database.
// =============================================================================

import React, { useMemo, useRef, useState } from 'react'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import { evaluateJobStart } from '../../utils/jobSchedule'   // 6 Oct 2026: shared start gate
import FilterTabs from '../../components/technician/FilterTabs'
import JobRow from '../../components/technician/JobRow'
import JobCard from '../../components/technician/JobCard'
import JobDetailsModal from '../../components/technician/JobDetailsModal'

// 6 Oct 2026: LOCAL date (toISOString() was UTC — wrong before 8am SGT)
const getTodayStr = () => new Date().toLocaleDateString('en-CA')

// Statuses that mean "not started yet" in our DB. 6 Oct 2026: there is no
// 'Upcoming' status in the database — the UI label maps to these.
const OPEN_FUTURE_STATUSES = ['Pending', 'Assigned', 'Scheduled', 'Upcoming']

const isTodayJob = (job) => {
  if (job.status === 'In Progress') return true
  if (job.timeframe === 'today') return true
  return Boolean(job.date) && String(job.date).slice(0, 10) === getTodayStr()
}

// 6 Oct 2026: future-dated open job (the "Upcoming" concept)
const isUpcomingJob = (job) => {
  if (['Completed', 'Cancelled', 'In Progress'].includes(job.status)) return false
  const today = getTodayStr()
  const d = job.date ? String(job.date).slice(0, 10) : null
  return (d && d > today) || OPEN_FUTURE_STATUSES.includes(job.status)
}

const isThisWeekJob = (job) => isTodayJob(job) || isUpcomingJob(job) || job.timeframe === 'this-week'

function AssignedJobsSummaryIcon({ type }) {
  const icons = { today: '📅', progress: '⏳', upcoming: '📋', completed: '✅' }
  const icon = icons[type] || '📌'
  return <span className="summary-icon" aria-hidden="true">{icon}</span>
}

class JobListErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('[TechnicianAssignedJobs] Rendering error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="cf-error-state" style={{ padding: '32px', textAlign: 'center' }}>
          <span aria-hidden="true" style={{ fontSize: '2rem' }}>⚠️</span>
          <h3>Something went wrong</h3>
          <p><small>{this.state.error?.message}</small></p>
          <button
            type="button"
            className="cf-button cf-button-secondary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function TechnicianAssignedJobs() {
  const {
    assignedJobs: jobs,
    startService,
    completeService,
    loading,
    refreshJobs,
  } = useTechnicianWorkflow()

  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedJob, setSelectedJob] = useState(null)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [actionError, setActionError] = useState(null)
  const jobDetailsTriggerRef = useRef(null)

  const openJobDetails = (job) => {
    jobDetailsTriggerRef.current = document.activeElement
    setSelectedJob(job)
    setShowJobDetails(true)
    setActionError(null)
  }

  const closeJobDetails = () => {
    setShowJobDetails(false)
    setActionError(null)
  }

  /* -------------------------------------------------------------------------
   * 6 Oct 2026 — START GATE (date + time)
   * evaluateJobStart() returns { allowed, reason, kind }. Blocked starts show
   * WHY in the banner. The backend enforces the identical rule, so even a
   * crafted request can't start a future job.
   * ---------------------------------------------------------------------- */
  const handleStartService = (jobToStart) => {
    const gate = evaluateJobStart(jobToStart)
    if (!gate.allowed) {
      setActionError(`"${jobToStart.id || `#BK${jobToStart.job_ID}`}" is ${gate.reason} — Start unlocks then.`)
      closeJobDetails()
      return
    }
    setActionError(null)
    try {
      if (typeof startService === 'function') startService(jobToStart.job_ID)
      closeJobDetails()
    } catch (err) {
      console.error('Error starting service:', err)
      setActionError('Failed to start service. Please try again.')
    }
  }

  const handlePrimaryAction = (job) => {
    const status = (job.status || '').toLowerCase()
    if (status === 'in progress' || status === 'completed') {
      openJobDetails(job)
    } else {
      handleStartService(job)   // 6 Oct 2026: goes through the gate
    }
  }

  const handleCompleteService = async (jobToComplete) => {
    setActionError(null)
    try {
      if (typeof completeService === 'function') completeService(jobToComplete.job_ID)
      closeJobDetails()
      // 6 Oct 2026: re-sync with the DB so counts/lists reflect the completion
      if (typeof refreshJobs === 'function') refreshJobs()
    } catch (err) {
      console.error('Error completing service:', err)
      setActionError(err?.message || 'Failed to complete service. Please try again.')
    }
  }

  // ---- Computed values ----
  const tabCounts = useMemo(() => ({
    today: jobs.filter(isTodayJob).length,
    thisWeek: jobs.filter(isThisWeekJob).length,
    all: jobs.length,
  }), [jobs])

  const metrics = useMemo(() => ({
    todayCount: jobs.filter(isTodayJob).length,
    inProgressCount: jobs.filter((j) => j.status === 'In Progress').length,
    // 6 Oct 2026 [FIX]: map "Upcoming" to real DB statuses + future dates
    upcomingCount: jobs.filter(isUpcomingJob).length,
    completedCount: jobs.filter((j) => j.status === 'Completed').length,
  }), [jobs])

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return jobs.filter((job) => {
      if (activeTab === 'today' && !isTodayJob(job)) return false
      if (activeTab === 'this-week' && !isThisWeekJob(job)) return false

      // 6 Oct 2026 [FIX]: "Upcoming" matches Scheduled/Pending/Assigned/future
      if (statusFilter !== 'ALL') {
        const jobStatus = (job.status || '').toLowerCase()
        const filterLower = statusFilter.toLowerCase()
        if (filterLower === 'upcoming') {
          if (!isUpcomingJob(job)) return false
        } else if (jobStatus !== filterLower) {
          return false
        }
      }

      if (normalizedQuery !== '') {
        return [
          job.id, job.job_ID, job.customerName, job.customer_name,
          job.serviceType, job.service_name, job.unitType, job.address
        ].some((value) =>
          String(value ?? '').toLowerCase().includes(normalizedQuery)
        )
      }

      return true
    })
  }, [jobs, activeTab, statusFilter, searchQuery])

  const summaryItems = [
    { label: 'Today', value: metrics.todayCount, tone: 'mint', icon: 'today' },
    { label: 'In Progress', value: metrics.inProgressCount, tone: 'amber', icon: 'progress' },
    { label: 'Upcoming', value: metrics.upcomingCount, tone: 'blue', icon: 'upcoming' },
    { label: 'Completed', value: metrics.completedCount, tone: 'green', icon: 'completed' },
  ]

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
    setActiveTab('all')
  }

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <JobListErrorBoundary>
      <div className="technician-page-content technician-assigned-jobs-page cf-jobs-page">
        <header className="cf-page-header">
          <div className="cf-page-heading">
            <span className="cf-eyebrow">Work management</span>
            <h1>Assigned Jobs</h1>
            <p>Review your workload, begin scheduled service, and track active jobs. Future-dated jobs unlock on their date.</p>
          </div>
          <div className="cf-page-header-status">
            <span className="duty-dot-pulse" aria-hidden="true" />
            <span>
              <small>Field sync</small>
              <strong>Active now</strong>
            </span>
          </div>
        </header>

        <section className="cf-jobs-stat-grid" aria-label="Assigned jobs summary">
          {summaryItems.map((item) => (
            <article className="cf-job-stat-card" key={item.label}>
              <span className={`cf-job-stat-dot cf-job-stat-dot-${item.tone}`} aria-hidden="true" />
              <span>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </span>
              <span className={`cf-job-stat-icon cf-job-stat-icon-${item.tone}`}>
                <AssignedJobsSummaryIcon type={item.icon} />
              </span>
            </article>
          ))}
        </section>

        <section className="cf-workspace-card" aria-labelledby="assigned-jobs-workspace-title">
          <header className="cf-workspace-heading">
            <div>
              <span className="cf-widget-kicker">Operational queue</span>
              <h2 id="assigned-jobs-workspace-title">Job Workspace</h2>
              <p>Filter assignments and open the next service task.</p>
            </div>
            <span className="cf-count-pill">{filteredJobs.length} shown</span>
          </header>

          <div className="cf-jobs-toolbar jobs-toolbar">
            <div className="cf-jobs-tabs">
              <span className="cf-toolbar-label">Timeframe</span>
              <FilterTabs
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab)}
                counts={tabCounts}
              />
            </div>

            <div className="assigned-jobs-filter-controls cf-job-filter-controls">
              <div className="assigned-jobs-toolbar-field assigned-jobs-search-field">
                <label htmlFor="assigned-jobs-search">Search jobs</label>
                <div className="search-input-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="search-icon" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    id="assigned-jobs-search"
                    type="text"
                    className="form-control search-input"
                    placeholder="Job ID, customer, service..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    aria-label="Search assigned jobs"
                  />
                  {searchQuery && (
                    <button type="button" className="search-clear-btn" onClick={() => setSearchQuery('')} aria-label="Clear search">
                      &times;
                    </button>
                  )}
                </div>
              </div>

              <div className="assigned-jobs-toolbar-field assigned-jobs-status-field">
                <label htmlFor="assigned-jobs-status">Status</label>
                <select
                  id="assigned-jobs-status"
                  className="form-select status-select-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by job status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="cf-jobs-results">
            {actionError && (
              <div style={{ padding: '12px 24px', background: '#fff8e1', border: '1px solid #f0d060', borderRadius: '8px', marginBottom: '16px', color: '#8a6d00' }}>
                <strong>⚠️</strong> {actionError}
              </div>
            )}

            {/* Desktop Table */}
            <div className="assigned-jobs-table-view d-none d-lg-block">
              <div className="table-responsive">
                <table className="table job-table mb-0">
                  <thead>
                    <tr>
                      <th scope="col" className="ps-4">JOB ID</th>
                      <th scope="col">CUSTOMER</th>
                      <th scope="col">SERVICE &amp; EQUIPMENT</th>
                      <th scope="col">DATE &amp; TIME</th>
                      <th scope="col">STATUS</th>
                      <th scope="col" className="text-end pe-4">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                          Loading field assignments...
                        </td>
                      </tr>
                    ) : filteredJobs.length > 0 ? (
                      filteredJobs.map((job) => (
                        <JobRow
                          key={job.id || job.job_ID}
                          job={job}
                          onView={openJobDetails}
                          onPrimaryAction={handlePrimaryAction}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6">
                          <div className="cf-empty-state">
                            <span aria-hidden="true">⌕</span>
                            <h3>No assigned jobs found</h3>
                            <p>
                              {searchQuery || statusFilter !== 'ALL'
                                ? 'No jobs match your active search and filter criteria.'
                                : 'You have no scheduled jobs in this selected timeframe.'}
                            </p>
                            {(searchQuery || statusFilter !== 'ALL' || activeTab !== 'all') && (
                              <button type="button" className="cf-button cf-button-secondary" onClick={resetFilters}>
                                Reset Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="assigned-jobs-mobile-view d-lg-none">
              {loading ? (
                <p style={{ textAlign: 'center', padding: '24px' }}>Loading jobs...</p>
              ) : filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <JobCard
                    key={job.id || job.job_ID}
                    job={job}
                    onView={openJobDetails}
                    onPrimaryAction={handlePrimaryAction}
                  />
                ))
              ) : (
                <div className="cf-empty-state">
                  <span aria-hidden="true">⌕</span>
                  <h3>No assigned jobs found</h3>
                  <p>Try adjusting your search or active filters.</p>
                  <button type="button" className="cf-button cf-button-secondary" onClick={resetFilters}>
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          <footer className="cf-workspace-footer jobs-card-footer">
            <span>
              Showing <strong>{filteredJobs.length}</strong> of <strong>{jobs.length}</strong> assigned jobs
            </span>
            <span className="d-none d-sm-flex">
              <span className="duty-dot-pulse" aria-hidden="true" /> Field sync active
            </span>
          </footer>
        </section>

        {showJobDetails && selectedJob && (
          <JobDetailsModal
            show={showJobDetails}
            job={selectedJob}
            onHide={closeJobDetails}
            onStartService={handleStartService}
            onCompleteService={handleCompleteService}
            returnFocusRef={jobDetailsTriggerRef}
          />
        )}
      </div>
    </JobListErrorBoundary>
  )
}

export default TechnicianAssignedJobs