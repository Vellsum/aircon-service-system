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

const normalizeStatus = (status) => String(status || '').trim().replace(/\s+/g, ' ').toLowerCase()
const isUpcomingStatus = (status) => ['upcoming', 'assigned', 'pending'].includes(normalizeStatus(status))

function parseCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''))
  if (!match) return null

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, monthIndex, day)

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function startOfLocalDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function isTodayJob(job, referenceDate = new Date()) {
  const jobDate = parseCalendarDate(job.date)
  if (!jobDate) return false

  return jobDate.getTime() === startOfLocalDay(referenceDate).getTime()
}

function isThisWeekJob(job, referenceDate = new Date()) {
  const jobDate = parseCalendarDate(job.date)
  if (!jobDate) return false

  const referenceDay = startOfLocalDay(referenceDate)
  const mondayOffset = (referenceDay.getDay() + 6) % 7
  const weekStart = new Date(referenceDay)
  weekStart.setDate(referenceDay.getDate() - mondayOffset)
  const nextWeek = new Date(weekStart)
  nextWeek.setDate(weekStart.getDate() + 7)

  return jobDate >= weekStart && jobDate < nextWeek
}

function AssignedJobsSummaryIcon({ type }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {type === 'today' && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 15h3" /></>}
      {type === 'progress' && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
      {type === 'upcoming' && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M9 15h6m-2-2 2 2-2 2" /></>}
      {type === 'completed' && <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>}
    </svg>
  )
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
          <h3>Assigned jobs could not be displayed.</h3>
          <p>Please try rendering the workspace again.</p>
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
    technicianID,
    canMutateTechnicianData,
    assignedJobs,
    startService,
    completeService,
    loading,
    error,
    dataAvailable,
    refreshJobs,
    isTransitionPending,
  } = useTechnicianWorkflow()
  const hasTechnicianIdentity = technicianID !== null && technicianID !== undefined
  const requestSucceeded = hasTechnicianIdentity && dataAvailable && !error

  const jobs = useMemo(() => {
    if (!requestSucceeded) return []

    return assignedJobs.map((job) => ({
      ...job,
      // These fields are currently constants in the backend mapper rather
      // than values joined from service/equipment data.
      serviceType: 'Service unavailable',
      serviceCategory: null,
      unitType: 'Equipment unavailable',
      estimatedDuration: null,
      postalCode: null,
      notes: job.notes === 'No special instructions.' ? null : job.notes,
    }))
  }, [assignedJobs, requestSucceeded])

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
    const status = normalizeStatus(job.status)
    if (status === 'in progress' || status === 'completed') {
      openJobDetails(job)
    } else if (isUpcomingStatus(job.status)) {
      void handleStartService(job)
    } else {
      openJobDetails(job)
    }
  }

  // ====================================================================
  // ✅ FIXED: Start Service — uses context's startService directly
  // Context handles: API persistence followed by a confirmed local update
  // No duplicate API calls
  // ====================================================================
  const handleStartService = async (jobToStart) => {
    setActionError(null)
    if (!canMutateTechnicianData) {
      setActionError('Status updates require an authenticated Technician session.')
      return
    }
    if (!isUpcomingStatus(jobToStart.status)) {
      setActionError('This booking cannot be started from its current status.')
      return
    }

    try {
      await startService(jobToStart.job_ID)
      closeJobDetails()
    } catch (err) {
      console.error('Error starting service:', err)
      setActionError(err?.message || 'Service could not be started. Please try again.')
    }
  }

  // ====================================================================
  // ✅ FIXED: Complete Service — uses context's completeService directly
  // ====================================================================
  const handleCompleteService = async (jobToComplete) => {
    setActionError(null)
    if (!canMutateTechnicianData) {
      setActionError('Status updates require an authenticated Technician session.')
      return
    }
    if (normalizeStatus(jobToComplete.status) !== 'in progress') {
      setActionError('Only an in-progress booking can be completed.')
      return
    }

    try {
      await completeService(jobToComplete.job_ID)
      closeJobDetails()
    } catch (err) {
      console.error('Error completing service:', err)
      setActionError(err?.message || 'Service could not be completed. Please try again.')
    }
  }

  // ---- Computed values ----
  const tabCounts = useMemo(() => requestSucceeded
    ? {
        today: jobs.filter((job) => isTodayJob(job)).length,
        thisWeek: jobs.filter((job) => isThisWeekJob(job)).length,
        all: jobs.length,
      }
    : { today: '—', thisWeek: '—', all: '—' },
  [jobs, requestSucceeded])

  const metrics = useMemo(() => ({
    todayCount: jobs.filter((job) => isTodayJob(job)).length,
    inProgressCount: jobs.filter((job) => normalizeStatus(job.status) === 'in progress').length,
    upcomingCount: jobs.filter((job) => isUpcomingStatus(job.status)).length,
    completedCount: jobs.filter((job) => normalizeStatus(job.status) === 'completed').length,
  }), [jobs])

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return jobs.filter((job) => {
      if (activeTab === 'today' && !isTodayJob(job)) return false
      if (activeTab === 'this-week' && !isThisWeekJob(job)) return false

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Upcoming') {
          if (!isUpcomingStatus(job.status)) return false
        } else if (normalizeStatus(job.status) !== normalizeStatus(statusFilter)) {
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
    { label: 'Today', value: requestSucceeded ? metrics.todayCount : '—', tone: 'mint', icon: 'today' },
    { label: 'In Progress', value: requestSucceeded ? metrics.inProgressCount : '—', tone: 'amber', icon: 'progress' },
    { label: 'Upcoming', value: requestSucceeded ? metrics.upcomingCount : '—', tone: 'blue', icon: 'upcoming' },
    { label: 'Completed', value: requestSucceeded ? metrics.completedCount : '—', tone: 'green', icon: 'completed' },
  ]
  const hasActiveFilters = Boolean(searchQuery.trim()) || statusFilter !== 'ALL' || activeTab !== 'all'

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
            {requestSucceeded && <span className="duty-dot-pulse" aria-hidden="true" />}
            <span>
              <small>Field sync</small>
              <strong>
                {loading ? 'Checking' : requestSucceeded ? 'Available' : 'Unavailable'}
              </strong>
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
            <span className="cf-count-pill">
              {requestSucceeded ? `${filteredJobs.length} shown` : '— shown'}
            </span>
          </header>

          <div className="cf-jobs-toolbar jobs-toolbar">
            <div className="cf-jobs-tabs">
              <div className="assigned-jobs-toolbar-caption">
                <span className="cf-toolbar-label">Timeframe</span>
                {hasActiveFilters && (
                  <button type="button" className="cf-button cf-button-quiet assigned-jobs-reset-button" onClick={resetFilters}>
                    Reset Filters
                  </button>
                )}
              </div>
              <FilterTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
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
                    placeholder="Booking ID, customer, service..."
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
                  <option value="ALL">All Status</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="cf-jobs-results assigned-jobs-records-canvas">
            {/* Action Error */}
            {actionError && (
              <div style={{ padding: '12px 24px', background: '#fff3f3', border: '1px solid #fcc', borderRadius: '8px', marginBottom: '16px', color: '#c33' }}>
                <strong>⚠️</strong> {actionError}
              </div>
            )}

            {loading || !requestSucceeded || filteredJobs.length === 0 ? (
              <div className="cf-empty-state assigned-jobs-state" role={!loading && !requestSucceeded ? 'alert' : undefined}>
                <span aria-hidden="true">{loading ? '…' : !requestSucceeded ? '!' : '⌕'}</span>
                <h3>
                  {loading
                    ? 'Loading field assignments…'
                    : !requestSucceeded
                      ? hasTechnicianIdentity ? 'Assigned job data is currently unavailable.' : 'Technician identity is unavailable.'
                      : jobs.length === 0 ? 'No assigned jobs available.' : 'No jobs match these filters.'}
                </h3>
                <p>
                  {loading
                    ? 'Checking for assigned bookings.'
                    : !requestSucceeded
                      ? hasTechnicianIdentity
                        ? 'We could not retrieve assigned bookings. Please try again.'
                        : 'Assigned bookings require a technician identity from the signed-in account.'
                      : jobs.length === 0
                        ? 'No bookings were returned.'
                        : 'Try another timeframe, search, or status.'}
                </p>
                {!loading && !requestSucceeded && hasTechnicianIdentity && (
                  <button type="button" className="cf-button cf-button-secondary" onClick={refreshJobs}>Retry</button>
                )}
              </div>
            ) : (
              <>
                <div className="assigned-jobs-table-view d-none d-lg-block">
                  <div className="table-responsive">
                    <table className="table job-table mb-0">
                      <thead>
                        <tr>
                          <th scope="col" className="ps-4">BOOKING ID</th>
                          <th scope="col">CUSTOMER</th>
                          <th scope="col">SERVICE &amp; EQUIPMENT</th>
                          <th scope="col">DATE &amp; TIME</th>
                          <th scope="col">STATUS</th>
                          <th scope="col" className="text-end pe-4">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredJobs.map((job) => (
                          <JobRow
                            key={job.id || job.job_ID}
                            job={job}
                            onView={openJobDetails}
                            onPrimaryAction={handlePrimaryAction}
                            isActionPending={isTransitionPending(job.job_ID)}
                            actionReadOnly={!canMutateTechnicianData}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="assigned-jobs-mobile-view d-lg-none">
                  {filteredJobs.map((job) => (
                    <JobCard
                      key={job.id || job.job_ID}
                      job={job}
                      onView={openJobDetails}
                      onPrimaryAction={handlePrimaryAction}
                      isActionPending={isTransitionPending(job.job_ID)}
                      actionReadOnly={!canMutateTechnicianData}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <footer className="cf-workspace-footer jobs-card-footer">
            <span>
              {requestSucceeded ? (
                <>Showing <strong>{filteredJobs.length}</strong> of <strong>{jobs.length}</strong> assigned bookings</>
              ) : (
                <>Showing <strong>—</strong> assigned bookings</>
              )}
            </span>
            <span className="d-none d-sm-flex">
              {requestSucceeded && <span className="duty-dot-pulse" aria-hidden="true" />}
              {loading ? 'Loading assignments' : requestSucceeded ? 'Booking data available' : 'Booking data unavailable'}
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
            actionPending={isTransitionPending(selectedJob.job_ID)}
            actionReadOnly={!canMutateTechnicianData}
            actionError={actionError}
          />
        )}
      </div>
    </JobListErrorBoundary>
  )
}

export default TechnicianAssignedJobs
