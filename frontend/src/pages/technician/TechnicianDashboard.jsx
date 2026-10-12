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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import JobDetailsModal from '../../components/technician/JobDetailsModal'
import "../../styles/technician.css";
import { useAuth } from '../../context/AuthContext'

/* ---------------------------------------------------------------------------
 * Helpers — added/updated 6 Oct 2026
 * ------------------------------------------------------------------------- */

// Local date as YYYY-MM-DD (en-CA). 6 Oct 2026: replaced toISOString()
// which was UTC-based and wrong before 8am SGT.
const getTodayStr = () => new Date().toLocaleDateString('en-CA')

// 6 Oct 2026: bulletproof time formatter — fixes the "undefined AM" bug.
// Handles: null, "14:00:00", "14:00", ISO "....T14:00:00", Date objects,
// "2:00 PM", and garbage. Never returns a string containing "undefined".
function formatTimeDisplay(raw, fallback = '09:00 AM') {
  if (raw === null || raw === undefined) return fallback
  let s = String(raw).trim()
  if (!s || s.toLowerCase().includes('undefined') || s.toLowerCase().includes('null')) return fallback

  // Long-form Date string (no "T", no leading "HH:") — parse as a Date
  if (!s.includes(':') && !s.includes('T')) {
    const d = new Date(s)
    if (isNaN(d.getTime())) return fallback
    const h = d.getHours(), m = d.getMinutes()
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }

  // ISO datetime — keep just the clock part
  if (s.includes('T')) s = s.split('T')[1].slice(0, 5)

  // 24-hour clock → 12-hour display
  if (/^\d{1,2}:\d{2}/.test(s) && !/AM|PM/i.test(s)) {
    const [h, m] = s.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return fallback
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }

  return s // already human-formatted
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

function TechnicianDashboard() {
  const { user } = useAuth()
  const [selectedJob, setSelectedJob] = useState(null)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [technicianJobs, setTechnicianJobs] = useState([])
  const [techName, setTechName] = useState('Technician')
  const [rating, setRating] = useState(null)          // 6 Oct 2026: real rating
  const [dashboardError, setDashboardError] = useState('') // 6 Oct 2026: surface backend rules
  useEffect(() => {
    if (user?.username) setTechName(user.username)
  }, [user])
  const [loading, setLoading] = useState(true)
  const jobDetailsTriggerRef = useRef(null)
  const { startService, completeService } = useTechnicianWorkflow()

  const todayStr = getTodayStr()

  // 6 Oct 2026 — date rules
  const isJobFuture = (job) => Boolean(job?.date) && String(job.date).slice(0, 10) > todayStr
  const isJobToday  = (job) => Boolean(job?.date) && String(job.date).slice(0, 10) === todayStr

  /* -------------------------------------------------------------------------
   * 1. HTTP GET — jobs + technician profile (for the real rating)
   * ---------------------------------------------------------------------- */
  const fetchDashboardJobs = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token') || ''
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')

      // 6 Oct 2026 [BUG FIX]: technician_ID must WIN. Bookings in the DB link
      // to user3.technician(technician_ID), NOT topUser(user_ID). Sending
      // user_ID here was why the schedule was empty for admin-created techs.
      const currentTechId =
        storedUser.technician_ID || storedUser.techId || storedUser.id || storedUser.user_ID || 1

      const res = await fetch(`http://localhost:5000/api/technician/jobs?techId=${currentTechId}`, { headers })
      const data = await res.json()

      if (res.ok && data.success) {
        if (Array.isArray(data.jobs)) setTechnicianJobs(data.jobs)
        if (data.technicianName) setTechName(data.technicianName)
      }

      // 6 Oct 2026 [DATA]: real rating from the profile endpoint
      try {
        const pRes = await fetch(`http://localhost:5000/api/technician/profile?techId=${currentTechId}`, { headers })
        const pData = await pRes.json()
        if (pRes.ok && pData.success && pData.profile) {
          setRating(pData.profile.technicianRating ?? null)
        }
      } catch { /* rating is non-critical */ }
    } catch (err) {
      console.error('Error fetching dashboard jobs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardJobs()
  }, [fetchDashboardJobs])

  const openJobDetails = (job) => {
    jobDetailsTriggerRef.current = document.activeElement
    setSelectedJob(job)
    setShowJobDetails(true)
  }
  const closeJobDetails = () => setShowJobDetails(false)

  /* -------------------------------------------------------------------------
   * Shared PUT helper — 6 Oct 2026: surfaces backend rule violations
   * (e.g. completing without a service report is rejected by the backend)
   * ---------------------------------------------------------------------- */
  const putJobStatus = async (bookingId, status) => {
    const token = localStorage.getItem('token') || ''
    const res = await fetch(`http://localhost:5000/api/technician/jobs/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) throw new Error(data.message || 'Could not update the job status.')
  }

  /* -------------------------------------------------------------------------
   * 2. Start service — 6 Oct 2026: blocked for future-dated jobs
   * ---------------------------------------------------------------------- */
  const handleStartService = async (jobToStart) => {
    if (isJobFuture(jobToStart)) {
      setDashboardError(`"${jobToStart.id}" is scheduled for ${formatDateShort(jobToStart.date)} — it can only be started on its booking date.`)
      closeJobDetails()
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setDashboardError('')
    try {
      const targetId = jobToStart.job_ID || jobToStart.id.replace('#BK', '')
      await putJobStatus(targetId, 'In Progress')
      if (startService) startService(jobToStart.job_ID)
      closeJobDetails()
      fetchDashboardJobs()
    } catch (err) {
      setDashboardError(err.message)   // 6 Oct 2026: show why, don't fail silently
      closeJobDetails()
    }
  }

  /* -------------------------------------------------------------------------
   * 3. Complete service — 6 Oct 2026: backend requires a service report FIRST
   * ---------------------------------------------------------------------- */
  const handleCompleteService = async (jobToComplete) => {
    setDashboardError('')
    try {
      const targetId = jobToComplete.job_ID || jobToComplete.id.replace('#BK', '')
      await putJobStatus(targetId, 'Completed')
      if (completeService) completeService(jobToComplete.job_ID)
      closeJobDetails()
      fetchDashboardJobs()
    } catch (err) {
      // Backend rejects with e.g. "A service report must be submitted BEFORE
      // completing this job..." — show it instead of a silent failure.
      setDashboardError(err.message)
      closeJobDetails()
    }
  }

  /* -------------------------------------------------------------------------
   * Derived data — 6 Oct 2026: rewritten
   *   • Active = not Completed/Cancelled (fixes "Scheduled" jobs disappearing)
   *   • Schedule list = today's jobs first, then upcoming, sorted by date
   * ---------------------------------------------------------------------- */
  const scheduleJobs = useMemo(() => {
    return technicianJobs
      .filter((job) => !['Completed', 'Cancelled'].includes(job.status))
      .slice()
      .sort((a, b) => {
        const aFuture = isJobFuture(a) ? 1 : 0
        const bFuture = isJobFuture(b) ? 1 : 0
        if (aFuture !== bFuture) return aFuture - bFuture // today first
        return String(a.date || '9999-99-99').localeCompare(String(b.date || '9999-99-99'))
      })
  }, [technicianJobs, todayStr])

  const todaysCount = scheduleJobs.filter((job) => !isJobFuture(job)).length
  const inProgressCount = scheduleJobs.filter((job) => job.status === 'In Progress').length
  const completedJobsCount = technicianJobs.filter((job) => job.status === 'Completed').length

  // 6 Oct 2026 [DATA]: real completion rate (replaces fake "On-time 100%")
  const totalJobCount = technicianJobs.length
  const completionRate = totalJobCount > 0 ? Math.round((completedJobsCount / totalJobCount) * 100) : 0

  const summaryItems = [
    {
      label: "Today's Jobs",
      value: todaysCount,
      context: `${inProgressCount} in progress`,
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
      value: completedJobsCount,
      context: 'Recorded in database',
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
      value: completedJobsCount,
      context: 'Completed assignments eligible for report',
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
      // 6 Oct 2026 [DATA]: real rating (was hardcoded "5.0 ★")
      label: 'Rating',
      // 6 Oct 2026: 0 = no customer ratings yet → show "Not rated yet"
      value: rating != null && Number(rating) > 0 ? `${Number(rating).toFixed(1)} ★` : 'Not rated yet',
      context: 'Average of customer ratings',
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
      {dashboardError && (
        <div style={{
          padding: '12px 18px', marginBottom: 16, borderRadius: 8,
          background: '#fff8e1', border: '1px solid #f0d060', color: '#8a6d00', fontSize: 13.5,
        }}>
          ⚠️ {dashboardError}
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
                {/* 6 Oct 2026: renamed — the list now shows today + upcoming */}
                <h2 id="today-schedule-title">Today &amp; Upcoming</h2>
                <span className="cf-count-pill">{scheduleJobs.length} active</span>
              </div>
              <p>{getFormattedLiveDate()} · Today&apos;s visits first, then upcoming. Future jobs unlock on their date.</p>
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
              <p style={{ padding: '24px', textAlign: 'center' }}>Loading today's schedule from database...</p>
            ) : scheduleJobs.length > 0 ? (
              scheduleJobs.map((job, index) => {
                const future = isJobFuture(job)   // 6 Oct 2026: date rule

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
                          onClick={() => openJobDetails(job)}>
                          Continue Service
                        </button>
                      )}
                      {/* 6 Oct 2026 [RULE]: Start is locked until the booking date */}
                      {!future && job.status !== 'Completed' && job.status !== 'In Progress' && (
                        <button type="button" className="cf-button cf-button-primary"
                          onClick={() => handleStartService(job)}>
                          Start Service
                        </button>
                      )}
                      {future && job.status !== 'In Progress' && (
                        <button type="button" className="cf-button cf-button-quiet"
                          disabled
                          style={{ opacity: 0.55, cursor: 'not-allowed' }}
                          title={`Available on ${formatDateShort(job.date)}`}>
                          🔒 Starts {formatDateShort(job.date)}
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
                <span><strong>Submit Service Report</strong><small>Required before completing a job</small></span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link to="/technician/parts-log" className="cf-action-tile">
                <span className="cf-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                </span>
                <span><strong>Log Parts &amp; Materials</strong><small>Update inventory usage</small></span>
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
                <span><strong>Book Follow-Up Service</strong><small>Plan another technician visit</small></span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>

          <section className="cf-widget cf-performance-widget" aria-labelledby="readiness-title">
            <header className="cf-widget-header cf-widget-header-compact">
              <div><span className="cf-widget-kicker">Service quality</span><h2 id="readiness-title">Performance &amp; Readiness</h2></div>
            </header>
            {/* 6 Oct 2026 [DATA]: real completion rate (was hardcoded "On-time arrival 100%") */}
            <div className="cf-performance-hero">
              <div className="cf-progress-ring"><span>{completionRate}%</span></div>
              <div><strong>Completion rate</strong><span>Completed vs total assigned jobs</span></div>
            </div>
            <dl className="cf-performance-list">
              <div>
                <dt>Customer rating</dt>
                <dd>{rating != null && Number(rating) > 0 ? `${Number(rating).toFixed(1)} ★` : 'Not rated yet'}<small>Average of customer ratings</small></dd>
              </div>
              <div>
                <dt>Historical completed</dt>
                <dd>{completedJobsCount} Jobs<small>Recorded in database</small></dd>
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
      />
    </div>
  )
}

export default TechnicianDashboard