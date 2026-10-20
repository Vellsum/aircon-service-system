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

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import { evaluateJobStart } from '../../utils/jobSchedule'   // 6 Oct 2026: shared start gate
import FilterTabs from '../../components/technician/FilterTabs'
import JobRow from '../../components/technician/JobRow'
import JobCard from '../../components/technician/JobCard'
import JobDetailsModal from '../../components/technician/JobDetailsModal'
import { Icon } from '../../components/customer/CustomerIcons'

// 6 Oct 2026: LOCAL date (toISOString() was UTC — wrong before 8am SGT)
const getTodayStr = () => new Date().toLocaleDateString('en-CA')

function getLocalDateKey(date = new Date()) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getAppointmentDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1) return null
  const date = new Date(2000, 0, 1, 12)
  date.setFullYear(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? value : null
}

function useCalendarDay() {
  const [today, setToday] = useState(() => getLocalDateKey())
  useEffect(() => {
    let timer
    let active = true
    const syncDay = () => {
      if (!active) return
      window.clearTimeout(timer)
      const now = new Date()
      setToday(getLocalDateKey(now))
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      timer = window.setTimeout(syncDay, Math.max(1, midnight.getTime() - now.getTime()))
    }
    const onVisible = () => { if (document.visibilityState === 'visible') syncDay() }
    window.addEventListener('focus', syncDay)
    document.addEventListener('visibilitychange', onVisible)
    syncDay()
    return () => {
      active = false
      window.clearTimeout(timer)
      window.removeEventListener('focus', syncDay)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return today
}

function getWeekKeys(today) {
  const [year, month, day] = today.split('-').map(Number)
  const monday = new Date(2000, 0, 1, 12)
  monday.setFullYear(year, month - 1, day)
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  return { weekStart: getLocalDateKey(monday), weekEnd: getLocalDateKey(sunday) }
}

// Statuses that mean "not started yet" in our DB. 6 Oct 2026: there is no
// 'Upcoming' status in the database — the UI label maps to these.
const OPEN_FUTURE_STATUSES = ['Pending', 'Assigned', 'Scheduled', 'Upcoming']

const isTodayJob = (job, today) => getAppointmentDateKey(job.date) === today

// 6 Oct 2026: future-dated open job (the "Upcoming" concept)
const isUpcomingJob = (job) => {
  if (['Completed', 'Cancelled', 'In Progress'].includes(job.status)) return false
  const today = getTodayStr()
  const d = job.date ? String(job.date).slice(0, 10) : null
  return (d && d > today) || OPEN_FUTURE_STATUSES.includes(job.status)
}

const isThisWeekJob = (job, weekStart, weekEnd) => {
  const date = getAppointmentDateKey(job.date)
  return date !== null && date >= weekStart && date <= weekEnd
}

function AssignedJobsSummaryIcon({ type }) {
  const icons = { today: 'calendar', progress: 'clock', upcoming: 'calendarPlus', completed: 'checkCircle' }
  return <span className="summary-icon" aria-hidden="true"><Icon name={icons[type] || 'calendar'} size={20} strokeWidth={2} /></span>
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
    isTransitionPending,
    canMutateTechnicianData,
    error: jobsError,
    dataAvailable,
    technicianID,
  } = useTechnicianWorkflow()

  const todayStr = useCalendarDay()
  const { weekStart, weekEnd } = useMemo(() => getWeekKeys(todayStr), [todayStr])
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedJobID, setSelectedJobID] = useState(null)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [statusSaved, setStatusSaved] = useState(false)
  const [refreshError, setRefreshError] = useState(null)
  const jobDetailsTriggerRef = useRef(null)
  const actionJobIDsRef = useRef(new Set())
  const jobsAvailable = !loading && !jobsError && dataAvailable
  const jobsUnavailable = !loading && !jobsAvailable
  const canRetryJobs = Boolean(technicianID)
  const savedRefreshMessage = 'The booking status was saved, but assignments could not be refreshed. Retry reloads the list; do not repeat the status change.'
  const refreshWarning = refreshError || (statusSaved && jobsUnavailable ? savedRefreshMessage : null)
  const selectedJob = useMemo(
    () => jobs.find((job) => job.job_ID === selectedJobID) || null,
    [jobs, selectedJobID],
  )

  useEffect(() => {
    if (jobsAvailable) {
      setStatusSaved(false)
      setRefreshError(null)
    }
  }, [jobsAvailable])

  const openJobDetails = (job) => {
    jobDetailsTriggerRef.current = document.activeElement
    setSelectedJobID(job.job_ID)
    setShowJobDetails(true)
    setActionError(null)
  }

  const closeJobDetails = () => {
    setShowJobDetails(false)
    setActionError(null)
  }

  const persistJobTransition = async (job, transition, failureMessage) => {
    const jobID = job.job_ID
    if (actionJobIDsRef.current.has(jobID) || isTransitionPending(jobID)) return
    if (!canMutateTechnicianData || !jobsAvailable) {
      setActionError('Status updates require an authenticated Technician session and available assignments.')
      return
    }

    actionJobIDsRef.current.add(jobID)
    setActionError(null)
    setStatusSaved(false)
    setRefreshError(null)
    try {
      if (typeof transition !== 'function') throw new Error('Status transition unavailable')
      const result = await transition(jobID)
      if (result?.success !== true) throw new Error('Status transition was not confirmed')
      setStatusSaved(true)
      if (selectedJobID === jobID) closeJobDetails()
    } catch (err) {
      console.error('Error updating booking status:', err)
      setActionError(failureMessage)
      return
    } finally {
      actionJobIDsRef.current.delete(jobID)
    }

    // Context-reported GET failures are rendered separately from mutation errors.
    try {
      await refreshJobs()
    } catch (err) {
      console.error('Error refreshing assignments after saved status:', err)
      setRefreshError(savedRefreshMessage)
    }
  }

  /* -------------------------------------------------------------------------
   * 6 Oct 2026 — START GATE (date + time)
   * evaluateJobStart() returns { allowed, reason, kind }. Blocked starts show
   * WHY in the banner. The backend enforces the identical rule, so even a
   * crafted request can't start a future job.
   * ---------------------------------------------------------------------- */
  const handleStartService = async (jobToStart) => {
    const gate = evaluateJobStart(jobToStart)
    if (!gate.allowed) {
      setActionError(`"${jobToStart.id || `#BK${jobToStart.job_ID}`}" is ${gate.reason} — Start unlocks then.`)
      return
    }
    await persistJobTransition(jobToStart, startService, 'Service could not be started. Please try again.')
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
    await persistJobTransition(jobToComplete, completeService, 'Service could not be completed. Please try again.')
  }

  // ---- Computed values ----
  const tabCounts = useMemo(() => ({
    today: jobs.filter((job) => isTodayJob(job, todayStr)).length,
    thisWeek: jobs.filter((job) => isThisWeekJob(job, weekStart, weekEnd)).length,
    all: jobs.length,
  }), [jobs, todayStr, weekStart, weekEnd])

  const metrics = useMemo(() => ({
    todayCount: jobs.filter((job) => isTodayJob(job, todayStr)).length,
    inProgressCount: jobs.filter((j) => j.status === 'In Progress').length,
    // 6 Oct 2026 [FIX]: map "Upcoming" to real DB statuses + future dates
    upcomingCount: jobs.filter(isUpcomingJob).length,
    completedCount: jobs.filter((j) => j.status === 'Completed').length,
  }), [jobs, todayStr])

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return jobs.filter((job) => {
      if (activeTab === 'today' && !isTodayJob(job, todayStr)) return false
      if (activeTab === 'this-week' && !isThisWeekJob(job, weekStart, weekEnd)) return false

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
  }, [jobs, activeTab, statusFilter, searchQuery, todayStr, weekStart, weekEnd])

  const summaryItems = [
    { label: 'Today’s Appointments', value: metrics.todayCount, tone: 'mint', icon: 'today' },
    { label: 'In Progress', value: metrics.inProgressCount, tone: 'amber', icon: 'progress' },
    { label: 'Upcoming', value: metrics.upcomingCount, tone: 'blue', icon: 'upcoming' },
    { label: 'Completed', value: metrics.completedCount, tone: 'green', icon: 'completed' },
  ]

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
    setActiveTab('all')
  }

  const unavailableContent = (
    <div className="cf-empty-state" role="alert">
      <h3>Assigned job data unavailable</h3>
      <p>{technicianID ? 'Assignments could not be loaded. Retry reloads the list only.' : 'Technician identity is unavailable. Sign in with a Technician account.'}</p>
      {canRetryJobs && (
        <button type="button" className="cf-button cf-button-secondary" onClick={() => refreshJobs()}>Retry</button>
      )}
    </div>
  )

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
              <strong>{loading ? 'Loading' : jobsAvailable ? 'Active now' : 'Unavailable'}</strong>
            </span>
          </div>
        </header>

        <section className="cf-jobs-stat-grid" aria-label="Assigned jobs summary">
          {summaryItems.map((item) => (
            <article className="cf-job-stat-card" key={item.label}>
              <span className={`cf-job-stat-dot cf-job-stat-dot-${item.tone}`} aria-hidden="true" />
              <span>
                <small>{item.label}</small>
                <strong>{jobsAvailable ? item.value : '—'}</strong>
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
              <p>Filter assignments and open the next service task. Summary and timeframe counts cover all returned bookings; the shown count includes search and status filters.</p>
            </div>
            <span className="cf-count-pill">{jobsAvailable ? filteredJobs.length : '—'} shown</span>
          </header>

          <div className="cf-jobs-toolbar jobs-toolbar">
            <div className="cf-jobs-tabs">
              <span className="cf-toolbar-label">Timeframe</span>
              <FilterTabs
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab)}
                counts={jobsAvailable ? tabCounts : { today: '—', thisWeek: '—', all: '—' }}
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
            {(actionError || refreshWarning) && (
              <div role="alert" style={{ padding: '12px 24px', background: '#fff8e1', border: '1px solid #f0d060', borderRadius: '8px', marginBottom: '16px', color: '#8a6d00' }}>
                <strong>⚠️</strong> {actionError || refreshWarning}
                {refreshWarning && jobsAvailable && canRetryJobs && (
                  <button type="button" className="cf-button cf-button-secondary" onClick={() => refreshJobs()}>Retry</button>
                )}
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
                    ) : jobsUnavailable ? (
                      <tr><td colSpan="6">{unavailableContent}</td></tr>
                    ) : filteredJobs.length > 0 ? (
                      filteredJobs.map((job) => (
                        <JobRow
                          key={job.id || job.job_ID}
                          job={job}
                          onView={openJobDetails}
                          onPrimaryAction={handlePrimaryAction}
                          isActionPending={isTransitionPending(job.job_ID)}
                          actionReadOnly={!canMutateTechnicianData}
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
                                : 'No appointments fall within the selected timeframe.'}
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
              ) : jobsUnavailable ? unavailableContent : filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <JobCard
                    key={job.id || job.job_ID}
                    job={job}
                    onView={openJobDetails}
                    onPrimaryAction={handlePrimaryAction}
                    isActionPending={isTransitionPending(job.job_ID)}
                    actionReadOnly={!canMutateTechnicianData}
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
              Showing <strong>{jobsAvailable ? filteredJobs.length : '—'}</strong> of <strong>{jobsAvailable ? jobs.length : '—'}</strong> assigned jobs
            </span>
            <span className="d-none d-sm-flex">
              <span className="duty-dot-pulse" aria-hidden="true" /> {loading ? 'Loading assignments' : jobsAvailable ? 'Field sync active' : 'Data unavailable'}
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
            actionPending={isTransitionPending(selectedJob.job_ID)}
            actionReadOnly={!canMutateTechnicianData || !jobsAvailable}
            actionError={actionError}
          />
        )}
      </div>
    </JobListErrorBoundary>
  )
}

export default TechnicianAssignedJobs
