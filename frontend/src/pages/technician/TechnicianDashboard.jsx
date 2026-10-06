import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import JobDetailsModal from '../../components/technician/JobDetailsModal'
import PortalWelcomeBanner from '../../components/common/PortalWelcomeBanner'
import "../../styles/technician.css";
import { useAuth } from '../../context/AuthContext'

/**
 * Helper: Formats current date to full readable string (e.g. "Monday, 21 Sep 2026")
 */
const getFormattedLiveDate = () => {
  const options = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
  return new Date().toLocaleDateString('en-GB', options);
};

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getJobDateKey = (jobDate) => {
  if (typeof jobDate !== 'string') return null
  const match = jobDate.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

function TechnicianDashboard() {
  const { token } = useAuth()
  const [selectedJob, setSelectedJob] = useState(null)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [profileName, setProfileName] = useState({ technicianID: null, name: null })
  const jobDetailsTriggerRef = useRef(null)
  const {
    technicianID,
    assignedJobs: technicianJobs,
    loading,
    error,
    dataAvailable,
    startService,
    completeService,
    isTransitionPending,
    canMutateTechnicianData,
  } = useTechnicianWorkflow()

  useEffect(() => {
    if (technicianID === null || technicianID === undefined) return undefined

    setProfileName({ technicianID, name: null })
    const controller = new AbortController()
    const loadProfileName = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const response = await fetch(
          `http://localhost:5000/api/technician/profile?techId=${encodeURIComponent(technicianID)}`,
          { headers, signal: controller.signal },
        )
        if (!response.ok) return

        const payload = await response.json()
        const profile = payload?.profile
        const name = typeof profile?.technicianName === 'string'
          ? profile.technicianName.trim()
          : ''
        if (payload?.success === true && String(profile?.technicianID) === String(technicianID) && name) {
          setProfileName({ technicianID, name })
        }
      } catch {
        // Keep the generic greeting when profile data is unavailable.
      }
    }

    loadProfileName()
    return () => controller.abort()
  }, [technicianID, token])

  const greetingName = profileName.technicianID === technicianID
    ? profileName.name || 'Technician'
    : 'Technician'

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

  const handleStartService = async (jobToStart) => {
    setActionError(null)
    if (!canMutateTechnicianData) {
      setActionError('Status updates require an authenticated Technician session.')
      return
    }
    try {
      await startService(jobToStart.job_ID)
      closeJobDetails()
    } catch (err) {
      console.error('[Technician Dashboard] Unable to start service:', err)
      setActionError(err?.message || 'Service could not be started. Please try again.')
    }
  }

  const handleCompleteService = async (jobToComplete) => {
    setActionError(null)
    if (!canMutateTechnicianData) {
      setActionError('Status updates require an authenticated Technician session.')
      return
    }
    try {
      await completeService(jobToComplete.job_ID)
      closeJobDetails()
    } catch (err) {
      console.error('[Technician Dashboard] Unable to complete service:', err)
      setActionError(err?.message || 'Service could not be completed. Please try again.')
    }
  }

  const todayStr = getLocalDateKey()
  
  const todayJobs = technicianJobs.filter((job) => getJobDateKey(job.date) === todayStr)
  const todayJobsValue = dataAvailable ? todayJobs.length : '—'

  const summaryItems = [
    {
      label: "Today's Jobs",
      value: todayJobsValue,
      context: dataAvailable
        ? `${todayJobs.filter((job) => job.status === 'In Progress').length} in progress`
        : 'Schedule data unavailable',
      tone: 'mint',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      label: 'Historical Completed',
      value: '—',
      context: 'Job history data unavailable',
      tone: 'green',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      label: 'Report-ready Jobs',
      value: '—',
      context: 'Report lifecycle unavailable',
      tone: 'amber',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      label: 'Rating',
      value: '—',
      context: 'Technician rating unavailable',
      tone: 'violet',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
  ]

  return (
    <div className="technician-dashboard-page cf-dashboard-page">
      <PortalWelcomeBanner
        as="header"
        className="portal-welcome-technician"
        eyebrow={(
          <span className="tech-dash-context">
            <span className="tech-dash-context-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M3 12h18" />
              </svg>
            </span>
            Field Operations
          </span>
        )}
        title={<>Good day, {greetingName}</>}
        subtitle={<>Here is today&apos;s field schedule and your latest service performance.</>}
        rightContent={(
          <div className="tech-dash-date" aria-label="Current date">
            <span className="tech-dash-date-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span className="tech-dash-date-copy">
              <small>Current date</small>
              <strong>{getFormattedLiveDate()}</strong>
            </span>
          </div>
        )}
      />

      <section className="tech-dash-overview" aria-labelledby="today-overview-title">
        <header className="tech-dash-overview-header">
          <div>
            <span className="tech-dash-section-kicker">Today overview</span>
            <h2 id="today-overview-title">Current operational picture</h2>
          </div>
          <p>Schedule, completion, reporting and service-quality availability.</p>
        </header>
        <div className="tech-dash-metric-grid" aria-label="Today's work summary">
          {summaryItems.map((item) => (
            <article className={`tech-dash-metric tech-dash-metric-${item.tone}`} key={item.label}>
              <div className="tech-dash-metric-heading">
                <span className={`tech-dash-metric-icon tech-dash-metric-icon-${item.tone}`}>{item.icon}</span>
                <span className="tech-dash-metric-label">{item.label}</span>
              </div>
              <strong className="tech-dash-metric-value">{item.value}</strong>
              <span className="tech-dash-metric-context">{item.context}</span>
            </article>
          ))}
        </div>
      </section>

      <div className="tech-dash-workspace-heading">
        <div>
          <span className="tech-dash-section-kicker">Operations workspace</span>
          <h2>Today&apos;s field activity</h2>
        </div>
        <p>Review assigned visits and open the tools needed for service work.</p>
      </div>

      <div className="tech-dash-workspace">
        <section className="tech-dash-panel tech-dash-schedule" aria-labelledby="today-schedule-title">
          <header className="tech-dash-panel-header tech-dash-schedule-header">
            <div>
              <span className="tech-dash-panel-kicker">Primary workspace</span>
              <div className="tech-dash-panel-title-row">
                <h2 id="today-schedule-title">Today&apos;s Schedule</h2>
                <span className="tech-dash-availability">{dataAvailable ? `${todayJobs.length} jobs` : 'Unavailable'}</span>
              </div>
              <p>{getFormattedLiveDate()} · Assigned service visits for this date</p>
            </div>
            <Link to="/technician/assigned-jobs" className="tech-dash-view-link">
              View all jobs
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </header>

          <div className="tech-dash-schedule-body">
            {actionError && (
              <div className="alert alert-danger mx-4 mt-3 mb-0" role="alert">
                {actionError}
              </div>
            )}
            {loading ? (
              <div className="cf-dashboard-state" role="status">
                <span className="cf-dashboard-state-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4" />
                    <path d="m16.24 7.76 2.83-2.83" />
                    <path d="M18 12h4" />
                    <path d="m16.24 16.24 2.83 2.83" />
                    <path d="M12 18v4" />
                    <path d="m4.93 19.07 2.83-2.83" />
                    <path d="M2 12h4" />
                    <path d="m4.93 4.93 2.83 2.83" />
                  </svg>
                </span>
                <span className="cf-dashboard-state-label">Schedule sync</span>
                <h3>Loading today&apos;s schedule</h3>
                <p>Retrieving assigned service visits from the current workflow.</p>
              </div>
            ) : error ? (
              <div className="cf-dashboard-state cf-dashboard-state-unavailable" role="status">
                <span className="cf-dashboard-state-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <line x1="8" y1="3" x2="8" y2="7" />
                    <line x1="16" y1="3" x2="16" y2="7" />
                    <line x1="3" y1="11" x2="21" y2="11" />
                    <line x1="9" y1="16" x2="15" y2="16" />
                  </svg>
                </span>
                <span className="cf-dashboard-state-label">Schedule unavailable</span>
                <h3>Today&apos;s assigned visits cannot be displayed</h3>
                <p>{error}</p>
              </div>
            ) : todayJobs.length > 0 ? (
              todayJobs.map((job, index) => {
                // Formatting time display safely
                const displayTime = (job.time && !job.time.includes('1970')) ? job.time : '—';
                const normalizedStatus = String(job.status || '').trim().replace(/\s+/g, ' ').toLowerCase()
                const canStart = ['upcoming', 'assigned', 'pending'].includes(normalizedStatus)
                const canContinue = normalizedStatus === 'in progress'
                const actionPending = isTransitionPending(job.job_ID)

                return (
                  <article className="cf-schedule-row" key={job.id}>
                    <div className="cf-schedule-time">
                      <span className="cf-schedule-index">{String(index + 1).padStart(2, '0')}</span>
                      <strong>{displayTime}</strong>
                      <small>{job.estimatedDuration || 'Duration unavailable'}</small>
                    </div>
                    <div className="cf-schedule-details">
                      <div className="cf-schedule-title-row">
                        <div>
                          <span className="cf-job-code">{job.id || 'Booking unavailable'}</span>
                          <h3>{job.serviceType || 'Service unavailable'}</h3>
                        </div>
                        <JobStatusBadge status={job.status} />
                      </div>
                      <p className="cf-schedule-customer">{job.customerName || 'Customer unavailable'}</p>
                      <div className="cf-schedule-meta">
                        <span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {job.address || 'Location unavailable'}{job.postalCode ? ` · Postal code ${job.postalCode}` : ''}
                        </span>
                        <span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <path d="M7 15h10M8 9h8" />
                          </svg>
                          {job.unitType || 'Equipment unavailable'}
                        </span>
                      </div>
                    </div>
                    <div className="cf-schedule-actions">
                      {canStart && (
                        <button
                          type="button"
                          className="cf-button cf-button-primary"
                          onClick={() => handleStartService(job)}
                          disabled={actionPending || !canMutateTechnicianData}
                          aria-busy={actionPending}
                          title={!canMutateTechnicianData ? 'Status updates require an authenticated Technician session.' : undefined}
                        >
                          {actionPending ? 'Starting…' : 'Start Service'}
                        </button>
                      )}
                      {canContinue && (
                        <button
                          type="button"
                          className="cf-button cf-button-primary cf-button-progress"
                          onClick={() => openJobDetails(job)}
                        >
                          Continue Service
                        </button>
                      )}
                      <button type="button" className="cf-button cf-button-quiet" onClick={() => openJobDetails(job)}>
                        View Details
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="cf-dashboard-state">
                <span className="cf-dashboard-state-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <line x1="8" y1="3" x2="8" y2="7" />
                    <line x1="16" y1="3" x2="16" y2="7" />
                    <line x1="3" y1="11" x2="21" y2="11" />
                    <polyline points="9 16 11 18 15 14" />
                  </svg>
                </span>
                <span className="cf-dashboard-state-label">Schedule clear</span>
                <h3>No active jobs scheduled for today</h3>
                <p>Assigned service visits for this date will appear here.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="tech-dash-rail">
          <section className="tech-dash-panel tech-dash-quick-panel" aria-labelledby="quick-actions-title">
            <header className="tech-dash-panel-header">
              <div>
                <span className="tech-dash-panel-kicker">Service tools</span>
                <h2 id="quick-actions-title">Quick Actions</h2>
                <p>Open common field-service workflows.</p>
              </div>
            </header>
            <div className="tech-dash-actions">
              <Link to="/technician/submit-report" className="tech-dash-action tech-dash-action-primary">
                <span className="tech-dash-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="8" y1="13" x2="16" y2="13" />
                  </svg>
                </span>
                <span className="tech-dash-action-copy"><strong>Submit Service Report</strong><small>Document completed work</small></span>
                <span className="tech-dash-action-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </Link>
              <Link to="/technician/parts-log" className="tech-dash-action">
                <span className="tech-dash-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                </span>
                <span className="tech-dash-action-copy"><strong>Parts Log</strong><small>View recorded parts usage</small></span>
                <span className="tech-dash-action-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </Link>
              <Link to="/technician/follow-up" className="tech-dash-action">
                <span className="tech-dash-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <line x1="8" y1="3" x2="8" y2="7" />
                    <line x1="16" y1="3" x2="16" y2="7" />
                    <line x1="3" y1="11" x2="21" y2="11" />
                  </svg>
                </span>
                <span className="tech-dash-action-copy"><strong>Follow-Up Bookings</strong><small>View existing follow-up bookings</small></span>
                <span className="tech-dash-action-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </Link>
            </div>
          </section>

          <section className="tech-dash-panel tech-dash-readiness-panel" aria-labelledby="readiness-title">
            <header className="tech-dash-panel-header">
              <div>
                <span className="tech-dash-panel-kicker">Service quality</span>
                <h2 id="readiness-title">Performance &amp; Readiness</h2>
                <p>Operational indicators from recorded service data.</p>
              </div>
            </header>
            <div className="tech-dash-status-list" role="list">
              <div className="tech-dash-status-row" role="listitem">
                <span className="tech-dash-status-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                </span>
                <span className="tech-dash-status-copy"><strong>On-time arrival</strong><small>Arrival data unavailable</small></span>
                <span className="tech-dash-status-value" aria-label="Not available">—</span>
              </div>
              <div className="tech-dash-status-row" role="listitem">
                <span className="tech-dash-status-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
                </span>
                <span className="tech-dash-status-copy"><strong>Customer satisfaction</strong><small>Rating data unavailable</small></span>
                <span className="tech-dash-status-value" aria-label="Not available">—</span>
              </div>
              <div className="tech-dash-status-row" role="listitem">
                <span className="tech-dash-status-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </span>
                <span className="tech-dash-status-copy"><strong>Historical completed</strong><small>Job history data unavailable</small></span>
                <span className="tech-dash-status-value" aria-label="Not available">—</span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <JobDetailsModal
        show={showJobDetails}
        job={selectedJob}
        onHide={closeJobDetails}
        onStartService={handleStartService}
        onCompleteService={handleCompleteService}
        returnFocusRef={jobDetailsTriggerRef}
        actionPending={selectedJob ? isTransitionPending(selectedJob.job_ID) : false}
        actionReadOnly={!canMutateTechnicianData}
        actionError={actionError}
      />
    </div>
  )
}

export default TechnicianDashboard
