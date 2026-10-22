// =============================================================================
// TechnicianDashboard.jsx
// -----------------------------------------------------------------------------
// Last updated: 6 Oct 2026
//
// CHANGELOG — 6 Oct 2026:
//   1. [BUG] Empty "Today's Schedule" — we sent user_ID (e.g. 10) to the API,
//      but bookings link to technician_ID (e.g. 104). Priority is now
//      technician_ID FIRST. (Exposed by the earlier fix that stopped showing
//      unassigned jobs to every technician.)
//   2. [BUG] "undefined AM" — new formatTimeDisplay() handles every shape the
//      API can send (Date object, "HH:MM:SS", ISO string, null) and can never
//      render the word "undefined".
//   3. [RULE] Future-dated jobs are visible as UPCOMING but the Start button is
//      disabled until the booking date arrives. Guard exists in the UI AND in
//      handleStartService.
//   4. [FIX] "Scheduled" status is now included in the schedule (was filtered
//      out by the old hardcoded status list).
//   5. [FIX] todayStr now uses the LOCAL date (en-CA). toISOString() was UTC —
//      it showed "yesterday" as today before 8am in Singapore.
//   6. [DATA] Rating now comes from /api/technician/profile (was hardcoded 5.0).
//   7. [DATA] Fake "On-time arrival 100%" replaced with a real completion rate.
//   8. [UX] Status updates surface backend errors (e.g. completing without a
//      service report is blocked server-side — see technicianController).
// =============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import JobDetailsModal from '../../components/technician/JobDetailsModal'
import "../../styles/technician.css";
import { useAuth } from '../../context/AuthContext'
import { evaluateJobStart } from '../../utils/jobSchedule'

/* ---------------------------------------------------------------------------
 * Helpers — added/updated 6 Oct 2026
 * ------------------------------------------------------------------------- */

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

// Presentation only: missing/invalid times are unavailable, never invented.
function formatTimeDisplay(raw) {
  const unavailable = 'Time unavailable'
  if (raw instanceof Date) {
    if (!Number.isFinite(raw.getTime())) return unavailable
    const h = raw.getHours()
    return `${h % 12 || 12}:${String(raw.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }
  if (typeof raw !== 'string' || !raw.trim()) return unavailable
  let s = raw.trim()

  // Preserve the returned clock for ISO strings, as before; do not shift timezone.
  if (s.includes('T')) {
    const iso = s.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(?:Z|[+-]\d{2}:\d{2})?$/)
    if (!iso || !getAppointmentDateKey(s.slice(0, 10)) || !Number.isFinite(Date.parse(s))) return unavailable
    s = iso[1]
  }
  const clock = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(AM|PM)?$/i)
  if (!clock) return unavailable
  const h = Number(clock[1]), m = Number(clock[2]), seconds = Number(clock[3] || 0)
  if (m > 59 || seconds > 59 || (clock[4] ? h < 1 || h > 12 : h > 23)) return unavailable
  return clock[4] ? s : `${h % 12 || 12}:${clock[2]} ${h >= 12 ? 'PM' : 'AM'}`
}

// Short date for badges: "7 Oct"
function formatDateShort(value) {
  if (!value) return ''
  const d = new Date(String(value).length === 10 ? value + 'T00:00:00' : value)
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

const getFormattedLiveDate = () => {
  const options = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
  return new Date().toLocaleDateString('en-GB', options);
};

function storedRatingDisplay(status, value) {
  if (status === 'loading') return { value: 'Loading…', note: 'Loading stored profile rating' }
  if (status === 'error') return { value: 'Request failed', note: 'Stored profile rating could not be loaded' }
  if (status !== 'success' || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 5) {
    return { value: 'Unavailable', note: 'Stored profile rating unavailable' }
  }
  return { value: value === 0 ? 'Not rated yet' : `${value.toFixed(1)} ★`, note: 'Stored profile rating' }
}

function TechnicianDashboard() {
  const { user, token } = useAuth()
  const { assignedJobs: technicianJobs, technicianID, startService, completeService,
    refreshJobs, loading, error: jobsError, dataAvailable, isTransitionPending,
    canMutateTechnicianData, identitySource } = useTechnicianWorkflow()
  const [selectedJobID, setSelectedJobID] = useState(null)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [ratingState, setRatingState] = useState({})
  const [dashboardError, setDashboardError] = useState('') // 6 Oct 2026: surface backend rules
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
    () => technicianJobs.find((job) => job.job_ID === selectedJobID) || null,
    [technicianJobs, selectedJobID],
  )

  useEffect(() => {
    if (jobsAvailable) {
      setStatusSaved(false)
      setRefreshError(null)
    }
  }, [jobsAvailable])

  const todayStr = useCalendarDay()

  // 6 Oct 2026 — date rules
  const isJobFuture = (job) => Boolean(job?.date) && String(job.date).slice(0, 10) > todayStr

  /* -------------------------------------------------------------------------
   * Profile rating is independent; all jobs come from the layout provider.
   * ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!Number.isSafeInteger(technicianID) || technicianID <= 0) return
    const controller = new AbortController()
    const update = (status, value = null) => {
      if (!controller.signal.aborted) setRatingState({ technicianID, token, identitySource, status, value })
    }
    update('loading')
    ;(async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const pRes = await fetch(`http://localhost:5000/api/technician/profile?techId=${technicianID}`, { headers, signal: controller.signal })
        if (!pRes.ok) {
          update('error')
          return
        }
        const pData = await pRes.json()
        if (pData?.success !== true) {
          update('error')
        } else if (!pData.profile || pData.profile.technicianID !== technicianID) {
          update('unavailable')
        } else {
          update('success', pData.profile.technicianRating)
        }
      } catch {
        update('error')
      }
    })()
    return () => controller.abort()
  }, [technicianID, token, identitySource])

  // Hide the previous session's rating immediately, before the new effect runs.
  const ratingStatus = identitySource === 'initializing' ? 'loading'
    : !Number.isSafeInteger(technicianID) || technicianID <= 0 ? 'unavailable'
    : ratingState.technicianID === technicianID && ratingState.token === token && ratingState.identitySource === identitySource
      ? ratingState.status : 'loading'
  const rating = storedRatingDisplay(ratingStatus, ratingState.value)

  const openJobDetails = (job) => {
    jobDetailsTriggerRef.current = document.activeElement
    setSelectedJobID(job.job_ID)
    setShowJobDetails(true)
    setDashboardError('')
  }
  const closeJobDetails = () => {
    setShowJobDetails(false)
    setDashboardError('')
  }

  /* -------------------------------------------------------------------------
   * One context transition; a subsequent refresh failure is not a failed save.
   * ---------------------------------------------------------------------- */
  const persistJobTransition = async (job, transition, failureMessage) => {
    const jobID = job.job_ID
    if (actionJobIDsRef.current.has(jobID) || isTransitionPending(jobID)) return
    if (!canMutateTechnicianData || !jobsAvailable) {
      setDashboardError('Status updates require an authenticated Technician session and available assignments.')
      return
    }
    actionJobIDsRef.current.add(jobID)
    setDashboardError('')
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
      setDashboardError(failureMessage)
      return
    } finally {
      actionJobIDsRef.current.delete(jobID)
    }
    try {
      await refreshJobs()
    } catch (err) {
      console.error('Error refreshing assignments after saved status:', err)
      setRefreshError(savedRefreshMessage)
    }
  }

  /* -------------------------------------------------------------------------
   * Start only from context-approved statuses and after the existing schedule gate.
   * ---------------------------------------------------------------------- */
  const handleStartService = async (jobToStart) => {
    const normalizedStatus = String(jobToStart.status || '').trim().replace(/\s+/g, ' ').toLowerCase()
    const canStart = ['upcoming', 'assigned', 'pending'].includes(normalizedStatus)
    if (!canStart) {
      setDashboardError('This job cannot be started from its current status.')
      return
    }
    const gate = evaluateJobStart(jobToStart)
    if (!gate.allowed) {
      setDashboardError(`"${jobToStart.id}" is ${gate.reason} — Start unlocks then.`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    await persistJobTransition(jobToStart, startService, 'Service could not be started. Please try again.')
  }

  /* -------------------------------------------------------------------------
   * 3. Complete service — 6 Oct 2026: backend requires a service report FIRST
   * ---------------------------------------------------------------------- */
  const handleCompleteService = async (jobToComplete) => {
    await persistJobTransition(jobToComplete, completeService, 'Service could not be completed. Please try again.')
  }

  /* -------------------------------------------------------------------------
   * Derived data — 6 Oct 2026: rewritten
   *   • Active = not Completed/Cancelled (fixes "Scheduled" jobs disappearing)
   *   • Schedule retains overdue unfinished appointments and its existing order.
   * ---------------------------------------------------------------------- */
  const scheduleJobs = useMemo(() => {
    return technicianJobs
      .filter((job) => !['Completed', 'Cancelled'].includes(job.status))
      .slice()
      .sort((a, b) => {
        const aFuture = isJobFuture(a) ? 1 : 0
        const bFuture = isJobFuture(b) ? 1 : 0
        if (aFuture !== bFuture) return aFuture - bFuture // non-future dates before future dates
        return String(a.date || '9999-99-99').localeCompare(String(b.date || '9999-99-99'))
      })
  }, [technicianJobs, todayStr])

  const todaysJobs = useMemo(
    () => technicianJobs.filter((job) => getAppointmentDateKey(job.date) === todayStr),
    [technicianJobs, todayStr],
  )
  const todaysCount = todaysJobs.length
  const todaysInProgressCount = todaysJobs.filter((job) => job.status === 'In Progress').length
  const inProgressCount = scheduleJobs.filter((job) => job.status === 'In Progress').length
  const completedJobsCount = technicianJobs.filter((job) => job.status === 'Completed').length

  // Current returned-assignment proportion, not a historical performance metric.
  const totalJobCount = technicianJobs.length
  const completionRate = totalJobCount > 0 ? Math.round((completedJobsCount / totalJobCount) * 100) : null
  const completionAvailable = jobsAvailable && completionRate !== null
  const completionRingBackground = completionAvailable
    ? `conic-gradient(var(--cf-primary) 0 ${completionRate}%, #e7eeeb ${completionRate}% 100%)`
    : '#e7eeeb'

  const summaryItems = [
    {
      label: "Today’s Appointments",
      value: jobsAvailable ? todaysCount : '—',
      context: jobsAvailable ? `${todaysInProgressCount} today in progress` : (loading ? 'Loading assignments…' : 'Assignment data unavailable'),
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
      label: 'Completed Assignments',
      value: jobsAvailable ? completedJobsCount : '—',
      context: 'Completed within returned assignments',
      tone: 'green',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      label: 'In Progress Jobs',
      value: jobsAvailable ? inProgressCount : '—',
      context: 'Report entry requires In Progress status',
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
      value: rating.value,
      context: rating.note,
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
      <header className="cf-page-header cf-dashboard-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">Operations overview</span>
          <h1>Good day, {user?.username || 'Technician'}</h1>
          <p>Here is today&apos;s field schedule and your latest service performance.</p>
        </div>
        <div className="cf-dashboard-date-card" aria-label="Today">
          <span className="cf-dashboard-date-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <span><small>Today</small><strong>{todayStr}</strong></span>
        </div>
      </header>

      {/* 6 Oct 2026: backend rule violations are shown here instead of failing silently */}
      {(dashboardError || refreshWarning) && (
        <div role="alert" style={{
          padding: '12px 18px', marginBottom: 16, borderRadius: 8,
          background: '#fff8e1', border: '1px solid #f0d060', color: '#8a6d00', fontSize: 13.5,
        }}>
          ⚠️ {dashboardError || refreshWarning}
          {refreshWarning && jobsAvailable && canRetryJobs && (
            <button type="button" className="cf-button cf-button-secondary" onClick={() => refreshJobs()}>Retry</button>
          )}
        </div>
      )}

      <section className="cf-kpi-grid" aria-label="Today's work summary">
        {summaryItems.map((item) => (
          <article className="cf-kpi-card" key={item.label}>
            <span className={`cf-kpi-icon cf-kpi-icon-${item.tone}`}>{item.icon}</span>
            <div className="cf-kpi-content">
              <span className="cf-kpi-label">{item.label}</span>
              <strong className="cf-kpi-value">{item.value}</strong>
              <span className="cf-kpi-context">{item.context}</span>
            </div>
            <span className={`cf-kpi-accent cf-kpi-accent-${item.tone}`} aria-hidden="true" />
          </article>
        ))}
      </section>

      <div className="cf-dashboard-grid">
        <section className="cf-widget cf-schedule-widget" aria-labelledby="today-schedule-title">
          <header className="cf-widget-header">
            <div>
              <span className="cf-widget-kicker">Field schedule</span>
              <div className="cf-widget-title-row">
                <h2 id="today-schedule-title">Active Schedule</h2>
                <span className="cf-count-pill">{jobsAvailable ? scheduleJobs.length : '—'} active</span>
              </div>
              <p>{getFormattedLiveDate()} · Includes overdue unfinished appointments. Completed and Cancelled bookings are excluded.</p>
            </div>
            <Link to="/technician/assigned-jobs" className="cf-text-link">
              View all jobs
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </header>

          <div className="cf-schedule-list">
            {loading ? (
              <p style={{ padding: '24px', textAlign: 'center' }}>Loading active schedule from database...</p>
            ) : jobsUnavailable ? (
              <div className="cf-empty-state" role="alert">
                <h3>Schedule data unavailable</h3>
                <p>{technicianID ? 'Assignments could not be loaded. Retry reloads the list only.' : 'Technician identity is unavailable. Sign in with a Technician account.'}</p>
                {canRetryJobs && (
                  <button type="button" className="cf-button cf-button-secondary" onClick={() => refreshJobs()}>Retry</button>
                )}
              </div>
            ) : scheduleJobs.length > 0 ? (
              scheduleJobs.map((job, index) => {
                const future = isJobFuture(job)   // 6 Oct 2026: date rule
                const normalizedStatus = String(job.status || '').trim().replace(/\s+/g, ' ').toLowerCase()
                const canStart = ['upcoming', 'assigned', 'pending'].includes(normalizedStatus)
                const gate = evaluateJobStart(job)
                const startDisabledReason = isTransitionPending(job.job_ID)
                  ? 'A status update for this booking is already in progress.'
                  : !canMutateTechnicianData
                    ? 'Status updates require an authenticated Technician session.'
                    : !gate.allowed ? `This job is ${gate.reason} — Start unlocks then.` : undefined

                return (
                  <article className="cf-schedule-row" key={job.id || job.job_ID}>
                    <div className="cf-schedule-time">
                      <span className="cf-schedule-index">{String(index + 1).padStart(2, '0')}</span>
                      {/* 6 Oct 2026 [BUG FIX]: formatTimeDisplay — no more "undefined AM" */}
                      <strong>{formatTimeDisplay(job.time)}</strong>
                      <small>{job.estimatedDuration}</small>
                    </div>
                    <div className="cf-schedule-details">
                      <div className="cf-schedule-title-row">
                        <div>
                          <span className="cf-job-code">{job.id}</span>
                          <h3>{job.serviceType}</h3>
                        </div>
                        {/* 6 Oct 2026: upcoming badge for future-dated jobs */}
                        {future && (
                          <span
                            className="cf-count-pill"
                            style={{ background: '#eef3ff', color: '#3b5bdb' }}
                            title={`Unlock on ${formatDateShort(job.date)}`}
                          >
                            Upcoming · {formatDateShort(job.date)}
                          </span>
                        )}
                        <JobStatusBadge status={job.status} />
                      </div>
                      <p className="cf-schedule-customer">{job.customerName}</p>
                      <div className="cf-schedule-meta">
                        <span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {job.address}{job.postalCode ? ` · S${job.postalCode}` : ''}
                        </span>
                        <span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <path d="M7 15h10M8 9h8" />
                          </svg>
                          {job.unitType}
                        </span>
                      </div>
                    </div>
                    <div className="cf-schedule-actions">
                      {job.status === 'In Progress' && (
                        <button type="button" className="cf-button cf-button-primary cf-button-progress"
                          onClick={() => openJobDetails(job)}
                          disabled={isTransitionPending(job.job_ID) || !canMutateTechnicianData}
                          aria-busy={isTransitionPending(job.job_ID)}>
                          Continue Service
                        </button>
                      )}
                      {canStart && gate.allowed && (
                        <button type="button" className="cf-button cf-button-primary"
                          onClick={() => handleStartService(job)}
                          disabled={isTransitionPending(job.job_ID) || !canMutateTechnicianData}
                          aria-busy={isTransitionPending(job.job_ID)}
                          title={startDisabledReason}>
                          {isTransitionPending(job.job_ID) ? 'Starting…' : 'Start Service'}
                        </button>
                      )}
                      {canStart && !gate.allowed && (
                        <button type="button" className="cf-button cf-button-quiet"
                          disabled
                          style={{ opacity: 0.55, cursor: 'not-allowed' }}
                          title={startDisabledReason}>
                          🔒 Starts {gate.reason.replace('scheduled for ', '')}
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
              <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No active jobs scheduled. New assignments from admin will appear here.
              </p>
            )}
          </div>
        </section>

        <aside className="cf-dashboard-rail">
          <section className="cf-widget cf-quick-actions-widget" aria-labelledby="quick-actions-title">
            <header className="cf-widget-header cf-widget-header-compact">
              <div><span className="cf-widget-kicker">Shortcuts</span><h2 id="quick-actions-title">Quick Actions</h2></div>
            </header>
            <div className="cf-action-list">
              <Link to="/technician/submit-report" className="cf-action-tile cf-action-tile-primary">
                <span className="cf-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="8" y1="13" x2="16" y2="13" />
                  </svg>
                </span>
                {/* 6 Oct 2026: clarified the report-first rule in the UI */}
                <span><strong>Open Report Form</strong><small>Select an In Progress assignment</small></span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link to="/technician/parts-log" className="cf-action-tile">
                <span className="cf-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                </span>
                <span><strong>View Parts Log</strong><small>View recorded parts and materials</small></span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link to="/technician/follow-up" className="cf-action-tile">
                <span className="cf-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <line x1="8" y1="3" x2="8" y2="7" />
                    <line x1="16" y1="3" x2="16" y2="7" />
                    <line x1="3" y1="11" x2="21" y2="11" />
                  </svg>
                </span>
                <span><strong>View Follow-Up Visits</strong><small>View assigned return visits</small></span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>

          <section className="cf-widget cf-performance-widget" aria-labelledby="readiness-title">
            <header className="cf-widget-header cf-widget-header-compact">
              <div><span className="cf-widget-kicker">Service quality</span><h2 id="readiness-title">Performance &amp; Readiness</h2></div>
            </header>
            {/* Inline background overrides the legacy fixed 97% ring for this metric only. */}
            <div className="cf-performance-hero">
              <div className="cf-progress-ring" style={{ background: completionRingBackground }}
                role="img" aria-label={completionAvailable ? `${completionRate}% of returned assignments completed` : 'Completion proportion unavailable'}>
                <span>{completionAvailable ? `${completionRate}%` : '—'}</span>
              </div>
              <div><strong>Assignment completion proportion</strong><span>Completed / all returned assignments</span></div>
            </div>
            <dl className="cf-performance-list">
              <div>
                <dt>Profile rating</dt>
                <dd>{rating.value}<small>{rating.note}</small></dd>
              </div>
              <div>
                <dt>Completed assignments</dt>
                <dd>{jobsAvailable ? completedJobsCount : '—'}<small>Within returned assignments; not a history total</small></dd>
              </div>
            </dl>
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
        actionReadOnly={!canMutateTechnicianData || !jobsAvailable}
        actionError={dashboardError}
      />
    </div>
  )
}

export default TechnicianDashboard
