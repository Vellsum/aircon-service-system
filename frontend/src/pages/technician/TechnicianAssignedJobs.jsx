// =============================================================================
// TechnicianAssignedJobs.jsx — Fixed Start Button + Date/Time
//
// FIXES:
//   1. Start/Complete now use context directly (single API call)
//   2. Context hook called properly (no try/catch around hook)
//   3. Jobs come from context (single source of truth)
//   4. formattedDate used for display
// =============================================================================

import React, { useMemo, useRef, useState } from 'react'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import FilterTabs from '../../components/technician/FilterTabs'
import JobRow from '../../components/technician/JobRow'
import JobCard from '../../components/technician/JobCard'
import JobDetailsModal from '../../components/technician/JobDetailsModal'

const todayStr = new Date().toISOString().split('T')[0]

const isTodayJob = (job) =>
  job.timeframe === 'today' ||
  (job.date && job.date.includes(todayStr)) ||
  job.status === 'In Progress'

const isThisWeekJob = (job) =>
  job.timeframe === 'today' ||
  job.timeframe === 'this-week' ||
  isTodayJob(job)

function AssignedJobsSummaryIcon({ type }) {
  const icons = {
    today: '📅',
    progress: '⏳',
    upcoming: '📋',
    completed: '✅'
  }
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
  // ====================================================================
  // ✅ FIXED: Use context properly — hook called unconditionally
  // Context provides: assignedJobs, startService, completeService, loading
  // This is the SINGLE SOURCE OF TRUTH for job data
  // ====================================================================
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
    const handlePrimaryAction = (job) => {
    const status = (job.status || '').toLowerCase()
    if (status === 'in progress' || status === 'completed') {
      openJobDetails(job)
    } else {
      // Start the service directly
      if (typeof startService === 'function') {
        startService(job.job_ID)
      }
    }
  }

  // ====================================================================
  // ✅ FIXED: Start Service — uses context's startService directly
  // Context handles: API call + local state update + optimistic UI
  // No duplicate API calls
  // ====================================================================
  const handleStartService = async (jobToStart) => {
    setActionError(null)
    try {
      // Context's startService does:
      // 1. Optimistic local state update (instant UI)
      // 2. PUT API call to persist in database
      if (typeof startService === 'function') {
        startService(jobToStart.job_ID)
      }
      closeJobDetails()
    } catch (err) {
      console.error('Error starting service:', err)
      setActionError('Failed to start service. Please try again.')
    }
  }

  // ====================================================================
  // ✅ FIXED: Complete Service — uses context's completeService directly
  // ====================================================================
  const handleCompleteService = async (jobToComplete) => {
    setActionError(null)
    try {
      if (typeof completeService === 'function') {
        completeService(jobToComplete.job_ID)
      }
      closeJobDetails()
    } catch (err) {
      console.error('Error completing service:', err)
      setActionError('Failed to complete service. Please try again.')
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
    upcomingCount: jobs.filter(
      (j) => j.status === 'Upcoming' || j.status === 'Assigned' || j.status === 'Pending'
    ).length,
    completedCount: jobs.filter((j) => j.status === 'Completed').length,
  }), [jobs])

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return jobs.filter((job) => {
      if (activeTab === 'today' && !isTodayJob(job)) return false
      if (activeTab === 'this-week' && !isThisWeekJob(job)) return false

      if (statusFilter !== 'ALL' && job.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false
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
            <p>Review your workload, begin scheduled service, and track active jobs.</p>
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
            {/* Action Error */}
            {actionError && (
              <div style={{ padding: '12px 24px', background: '#fff3f3', border: '1px solid #fcc', borderRadius: '8px', marginBottom: '16px', color: '#c33' }}>
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

        {/* Job Details Modal */}
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