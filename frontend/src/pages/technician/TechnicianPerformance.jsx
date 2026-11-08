import React, { useState, useEffect, useMemo, useRef } from 'react'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import { useAuth } from '../../context/AuthContext'
const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api`;
//var API_BASE_URL = 'http://localhost:5000'

var STATUS_ITEMS = [
  { key: 'upcoming', label: 'Upcoming', className: 'is-upcoming' },
  { key: 'inProgress', label: 'In Progress', className: 'is-progress' },
  { key: 'completed', label: 'Completed', className: 'is-completed' },
]

function WorkloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M8 5V3m8 2V3M3 10h18" />
    </svg>
  )
}

function CompletedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function linkedServices(job) {
  if (!Array.isArray(job.services) || job.services.length === 0) return null
  const services = new Map()
  for (const service of job.services) {
    if (!Number.isSafeInteger(service?.serviceID) || service.serviceID <= 0
      || typeof service.serviceName !== 'string' || !service.serviceName.trim()) return null
    const name = service.serviceName.trim()
    if (services.has(service.serviceID) && services.get(service.serviceID) !== name) return null
    services.set(service.serviceID, name)
  }
  return services
}

function completedServiceMix(jobs) {
  const categories = new Map()
  for (const job of jobs) {
    if (typeof job.status !== 'string' || job.status.toLowerCase() !== 'completed') continue
    const services = linkedServices(job)
    if (!Number.isSafeInteger(job.job_ID) || job.job_ID <= 0 || !services) return null
    for (const [id, name] of services) {
      const category = categories.get(id) || { id, name, bookings: new Set() }
      if (category.name !== name) return null
      category.bookings.add(job.job_ID)
      categories.set(id, category)
    }
  }
  return [...categories.values()].map(({ id, name, bookings }) => ({ id, name, count: bookings.size }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

// SQL DATETIME2 has no offset. Read its literal clock/calendar components, even
// when the driver's JSON representation appends Z; never convert timezones.
function reportedCompletionMonth(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,7})?)?Z?$/.exec(value)
  if (!match) return null
  const [, y, m, d, h, min, sec = '00'] = match
  const year = Number(y), month = Number(m), day = Number(d)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]
    || Number(h) > 23 || Number(min) > 59 || Number(sec) > 59) return null
  return `${y}-${m}`
}

function summarizeReports(reports, technicianID) {
  if (!Array.isArray(reports)) throw new Error('Report data unavailable')
  const distinct = new Map()
  for (const report of reports) {
    if (!Number.isSafeInteger(report?.reportID) || report.reportID <= 0
      || report.technicianID !== technicianID || !Number.isSafeInteger(report.job_ID) || report.job_ID <= 0) {
      throw new Error('Report identity or booking mapping unavailable')
    }
    const previous = distinct.get(report.reportID)
    if (previous && (previous.job_ID !== report.job_ID || previous.completedDateTime !== report.completedDateTime
      || previous.AC_condition !== report.AC_condition)) throw new Error('Conflicting report data')
    distinct.set(report.reportID, report)
  }
  const months = new Map(), conditions = new Map()
  let excludedDates = 0
  for (const report of distinct.values()) {
    const month = reportedCompletionMonth(report.completedDateTime)
    if (month) months.set(month, (months.get(month) || 0) + 1)
    else excludedDates++
    const condition = typeof report.AC_condition === 'string' && report.AC_condition.trim()
      ? report.AC_condition.trim() : 'Condition unavailable'
    conditions.set(condition, (conditions.get(condition) || 0) + 1)
  }
  return { total: distinct.size, excludedDates,
    months: [...months].sort(([a], [b]) => b.localeCompare(a)),
    conditions: [...conditions].sort(([a], [b]) => a.localeCompare(b)),
  }
}

function reviewDistribution(profile) {
  const rows = profile?.customerRatingDistribution
  const total = profile?.customerReviewCount, average = profile?.customerRatingAverage
  if (!Number.isSafeInteger(total) || total < 0 || !Array.isArray(rows) || rows.length !== 5) return null
  const seen = new Set()
  let count = 0, weighted = 0
  for (const row of rows) {
    if (!Number.isInteger(row?.stars) || row.stars < 1 || row.stars > 5 || seen.has(row.stars)
      || !Number.isSafeInteger(row.count) || row.count < 0) return null
    seen.add(row.stars)
    count += row.count
    weighted += row.stars * row.count
  }
  if (!Number.isSafeInteger(count) || !Number.isSafeInteger(weighted) || count !== total
    || (total === 0 ? average !== null : typeof average !== 'number' || !Number.isFinite(average)
      || average < 1 || average > 5 || Math.abs(weighted / total - average) > 0.00011)) return null
  return [...rows].sort((a, b) => b.stars - a.stars)
}

function MetricRows({ rows, label }) {
  return <dl className="tech-performance-history-list" aria-label={label}>
    {rows.map(([name, count]) => <div key={name}><dt>{name}</dt><dd>{count}</dd></div>)}
  </dl>
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    var d = new Date(dateStr + 'T00:00:00')
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch (e) {
    return dateStr
  }
}

function customerRatingDisplay(status, average, count) {
  const display = (value, note = '', available = false, text = value) => ({ value, note, available, text })
  if (status === 'loading') return display('Loading customer ratings…')
  if (status === 'error') return display('Rating unavailable.', 'Customer ratings could not be loaded.')
  if (status === 'success' && count === 0 && average === null) {
    return display('No customer ratings yet.', '', true)
  }
  if (status !== 'success' || !Number.isSafeInteger(count) || count <= 0
    || typeof average !== 'number' || !Number.isFinite(average) || average < 1 || average > 5) {
    return display('Rating unavailable.', 'Customer rating data is unavailable.')
  }
  const value = (
    <span className="cf-customer-rating-value">
      {average.toFixed(1)}
      <svg className="cf-customer-rating-star" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.4l2.7 5.6 6.1.85-4.45 4.3 1.1 6.05L12 17.4l-5.45 2.8 1.1-6.05L3.2 9.85l6.1-.85Z" />
      </svg>
      <span className="visually-hidden">out of 5</span>
    </span>
  )
  const reviews = `${count} ${count === 1 ? 'review' : 'reviews'}`
  return display(value, reviews, true, <>{value} · {reviews}</>)
}

function TechnicianPerformance() {
  var workflow = useTechnicianWorkflow()
  var { token } = useAuth()
  var { technicianID, identitySource } = workflow
  var assignedJobs = workflow.assignedJobs || []
  var workload = workflow.workload || {}
  var contextLoading = workflow.loading || identitySource === 'initializing'
  var hasIdentity = Number.isSafeInteger(technicianID) && technicianID > 0
  var jobsAvailable = Boolean(hasIdentity && !contextLoading && !workflow.error && workflow.dataAvailable)

  var [profileState, setProfileState] = useState({})
  var [reportsState, setReportsState] = useState({})
  const session = useMemo(() => ({ technicianID, token, identitySource }), [technicianID, token, identitySource])
  const currentSession = useRef(session)
  currentSession.current = session

  useEffect(function () {
    if (!hasIdentity) return
    var controller = new AbortController()
    function update(status, profile = null) {
      if (!controller.signal.aborted && currentSession.current === session) {
        setProfileState({ technicianID, token, identitySource, session, status, profile })
      }
    }
    update('loading')
    async function fetchProfile() {
      try {
        var headers = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = 'Bearer ' + token
var res = await fetch(`${API_BASE}/technician/profile?techId=${technicianID}`, {          headers, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
        })
        if (!res.ok) {
          update('error')
          return
        }
        var data = await res.json()
        if (data?.success !== true) {
          update('error')
        } else if (!data.profile || data.profile.technicianID !== technicianID) {
          update('unavailable')
        } else {
          update('success', data.profile)
        }
      } catch {
        update('error')
      }
    }
    fetchProfile()
    return () => controller.abort()
  }, [technicianID, token, identitySource, hasIdentity, session])

  useEffect(function () {
    if (!hasIdentity) return
    const controller = new AbortController()
    const update = (status, summary = null) => {
      if (!controller.signal.aborted && currentSession.current === session) setReportsState({ session, status, summary })
    }
    update('loading')
    async function fetchReports() {
      try {
        const headers = { 'Content-Type': 'application/json' }
        if (token) headers.Authorization = 'Bearer ' + token
const response = await fetch(`${API_BASE}/technician/reports?techId=${technicianID}`, {          headers, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
        })
        if (!response.ok) { update('error'); return }
        const data = await response.json()
        if (data?.success !== true) { update('error'); return }
        let summary
        try { summary = summarizeReports(data.reports, technicianID) }
        catch { update('unavailable'); return }
        update('success', summary)
      } catch { update('error') }
    }
    fetchReports()
    return () => controller.abort()
  }, [technicianID, token, hasIdentity, session])

  // Do not display a previous identity's profile while the replacement request starts.
  var profileStatus = identitySource === 'initializing' ? 'loading' : !hasIdentity ? 'unavailable'
    : profileState.session === session
      ? profileState.status : 'loading'
  var profile = profileStatus === 'success' ? profileState.profile : null
  var profileName = profileStatus === 'loading' ? 'Loading…'
    : typeof profile?.technicianName === 'string' && profile.technicianName.trim()
      ? profile.technicianName.trim() : 'Unavailable'
  var rating = customerRatingDisplay(profileStatus, profile?.customerRatingAverage, profile?.customerReviewCount)
  const distribution = reviewDistribution(profile)
  const reportsStatus = identitySource === 'initializing' ? 'loading' : !hasIdentity ? 'unavailable'
    : reportsState.session === session ? reportsState.status : 'loading'
  const reportSummary = reportsStatus === 'success' ? reportsState.summary : null
  const reportMessage = reportsStatus === 'loading' ? 'Loading reports…'
    : reportsStatus === 'error' ? 'Reports could not be loaded.' : 'Report data unavailable.'
  const serviceMix = useMemo(() => completedServiceMix(assignedJobs), [assignedJobs])

  var completedWork = useMemo(function () {
    var completedJobs = assignedJobs.filter(function (j) {
      return (j.status || '').toLowerCase() === 'completed'
    })

    var recentJobs = completedJobs
      .slice()
      .sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') })
      .slice(0, 10)
      .map(function (job) {
        const services = linkedServices(job)
        return {
          jobID: job.job_ID,
          displayJobCode: job.id || '#BK' + String(job.job_ID).padStart(3, '0'),
          serviceName: services ? [...services.values()].join(', ') : 'Service information unavailable',
          customerName: job.customerName || 'Unavailable',
          formattedDate: job.formattedDate || formatDate(job.date),
          status: job.status
        }
      })

    return {
      total: completedJobs.length,
      recentJobs: recentJobs
    }
  }, [assignedJobs])

  var assignedTotal = jobsAvailable && Number.isSafeInteger(workload.assignedJobs) && workload.assignedJobs >= 0
    ? workload.assignedJobs : null
  return (
    <div className="technician-performance-page">
      <header className="cf-page-header tech-performance-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">Technician Performance</span>
          <h1>Performance</h1>
          <p>Current assignments, linked service reports and customer-submitted booking feedback; not lifetime performance history.</p>
        </div>
        <div className="tech-performance-technician">
          <span className="tech-performance-technician-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </span>
          <span>
            <small>Technician record</small>
            <strong>{profileName}</strong>
            <em>ID {hasIdentity ? technicianID : 'Unavailable'}</em>
          </span>
        </div>
      </header>

      {!jobsAvailable && (
        <section className="tech-performance-empty" role="status">
          <h2>{contextLoading ? 'Loading assignments…' : hasIdentity ? 'Assignment data unavailable' : 'Technician identity is unavailable'}</h2>
          <p>{contextLoading ? 'Current workload is loading.' : 'Current workload and completed assignment counts cannot be shown.'}</p>
        </section>
      )}

      <section className="tech-performance-overview" aria-labelledby="workload-overview-title">
        <header className="tech-performance-overview-header">
          <div className="tech-performance-section-title">
            <span className="tech-performance-section-icon" aria-hidden="true"><WorkloadIcon /></span>
            <div>
              <span className="cf-widget-kicker">Current workload</span>
              <h2 id="workload-overview-title">Operational Performance Overview</h2>
            </div>
          </div>
          <p>Status counts within returned assignments, not a complete history or live feed.</p>
        </header>
        <div className="tech-performance-overview-body">
          <div className="tech-performance-assigned-total">
            <span>Returned assignments</span>
            <strong>{assignedTotal ?? '—'}</strong>
            <small>{assignedTotal === null ? 'Assignment count unavailable' : assignedTotal === 1 ? 'assignment returned' : 'assignments returned'}</small>
          </div>
          <div className="tech-performance-distribution">
            <div className="tech-performance-status-bars" role="list">
              {STATUS_ITEMS.map(function (item) {
                var value = workload.byStatus?.[item.key]
                var count = jobsAvailable && Number.isSafeInteger(value) && value >= 0 ? value : null
                var distributionAvailable = count !== null && assignedTotal !== null
                return (
                  <div className="tech-performance-status-row" role="listitem" key={item.key}>
                    <div className="tech-performance-status-row-heading">
                      <span><i className={item.className} aria-hidden="true" />{item.label}</span>
                      <strong>{count ?? '—'}</strong>
                    </div>
                    <span className={`tech-performance-status-track${distributionAvailable ? '' : ' tech-performance-status-track-unavailable'}`}
                      role={distributionAvailable && assignedTotal > 0 ? 'progressbar' : 'img'}
                      aria-label={distributionAvailable ? `${item.label}: ${count} of ${assignedTotal} returned assignments` : `${item.label} workload unavailable`}
                      aria-valuenow={distributionAvailable && assignedTotal > 0 ? count : undefined}
                      aria-valuemin={distributionAvailable && assignedTotal > 0 ? 0 : undefined}
                      aria-valuemax={distributionAvailable && assignedTotal > 0 ? assignedTotal : undefined}>
                      {distributionAvailable && <span className={item.className} style={{ width: assignedTotal ? (count / assignedTotal * 100) + '%' : '0%' }} />}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="tech-performance-analysis-grid">
        <section className="tech-performance-completed" aria-labelledby="completed-analysis-title">
          <header className="tech-performance-panel-header">
            <div className="tech-performance-section-title">
              <span className="tech-performance-section-icon" aria-hidden="true"><CompletedIcon /></span>
              <div>
                <span className="cf-widget-kicker">Current assignments</span>
                <h2 id="completed-analysis-title">Completed Current Assignments</h2>
              </div>
            </div>
            <div className="tech-performance-completed-total">
              <strong>{jobsAvailable ? completedWork.total : '—'}</strong>
              <span>within returned assignments</span>
            </div>
          </header>
          <div className="tech-performance-completed-body">
            <section aria-labelledby="completed-by-month-title">
              <div className="tech-performance-subheading">
                <h3 id="completed-by-month-title">Reported service completion by month</h3>
              </div>
              <div className="tech-performance-month-list">
                {!reportSummary ? <p role="status">{reportMessage}</p>
                  : reportSummary.total === 0 ? <p>No reports returned.</p>
                    : reportSummary.months.length === 0 ? <p>No valid reported completion datetimes.</p>
                      : <MetricRows label="Reports by reported completion month" rows={reportSummary.months} />}
                <p className="tech-performance-analytics-note">Report-entered datetimes, not recorded Complete-action timestamps. Calendar components are used without timezone conversion.</p>
                {reportSummary && reportSummary.excludedDates > 0 && <p className="tech-performance-analytics-note">
                  {reportSummary.excludedDates} {reportSummary.excludedDates === 1 ? 'report excluded' : 'reports excluded'} because the completion datetime is missing or invalid.
                </p>}
              </div>
            </section>
            <section aria-labelledby="completed-service-mix-title">
              <div className="tech-performance-subheading">
                <h3 id="completed-service-mix-title">Completed service mix</h3>
              </div>
              <div className="tech-performance-service-list">
                {!jobsAvailable ? <p role="status">{contextLoading ? 'Loading service information…' : 'Assignment data unavailable.'}</p>
                  : serviceMix === null ? <p>Service information unavailable for one or more completed bookings.</p>
                    : serviceMix.length === 0 ? <p>No completed current assignments.</p>
                      : <MetricRows label="Completed bookings per linked service" rows={serviceMix.map(service => [`${service.name} (ID ${service.id})`, service.count])} />}
                <p className="tech-performance-analytics-note">Each completed booking counts once per stored linked service, regardless of jobs or units. A multi-service booking may appear in several categories. These are stored services, not necessarily customer-selected services.</p>
              </div>
            </section>
          </div>
        </section>

        <aside className="tech-performance-availability" aria-labelledby="data-availability-title">
          <header className="tech-performance-panel-header">
            <div>
              <span className="cf-widget-kicker">Customer feedback and reports</span>
              <h2 id="data-availability-title">Feedback and Report Summary</h2>
            </div>
          </header>
          <div className="tech-performance-analytics">
            <section aria-labelledby="performance-rating-title">
              <h3 id="performance-rating-title">Customer rating</h3>
              <p>{rating.text}</p>
              <p className="tech-performance-analytics-note">{rating.available ? 'Customer-submitted booking feedback' : rating.note}</p>
              <h3>Review distribution</h3>
              {profileStatus === 'loading' ? <p role="status">Loading customer reviews…</p>
                : distribution === null ? <p role="status">Review distribution unavailable.</p>
                  : profile.customerReviewCount === 0 ? <p>No customer ratings yet.</p>
                    : <MetricRows label="Customer reviews by star score" rows={distribution.map(row => [`${row.stars} ${row.stars === 1 ? 'star' : 'stars'}`, row.count])} />}
            </section>
            <section aria-labelledby="performance-reports-title">
              <h3 id="performance-reports-title">Report summary</h3>
              {!reportSummary ? <p role="status">{reportMessage}</p>
                : <>
                  <MetricRows label="Distinct service reports" rows={[['Distinct reports', reportSummary.total]]} />
                  {reportSummary.total === 0 ? <p>No reports returned.</p> : <>
                    <h3>Reported AC condition</h3>
                    <MetricRows label="Distinct reports by AC condition" rows={reportSummary.conditions} />
                  </>}
                </>}
              <p className="tech-performance-analytics-note">Distinct reports attributed to this technician, not completed-job counts. Reports may cover multiple service jobs.</p>
            </section>
          </div>
        </aside>
      </div>

      <section className="tech-performance-recent" aria-labelledby="recent-completed-title">
        <header className="tech-performance-panel-header">
          <div>
            <span className="cf-widget-kicker">Ordered by booking date</span>
            <h2 id="recent-completed-title">Completed Current Assignments</h2>
          </div>
          <span>{jobsAvailable ? completedWork.recentJobs.length : '—'} records · up to 10</span>
        </header>
        <div className="tech-performance-recent-list">
          {jobsAvailable && completedWork.recentJobs.length > 0 ? completedWork.recentJobs.map(function (job) {
            return (
              <article key={job.jobID} className="tech-performance-recent-row">
                <div className="tech-performance-job-code">
                  <span>{job.displayJobCode}</span>
                  <small>Booking ID {job.jobID}</small>
                </div>
                <div>
                  <small>Service</small>
                  <strong>{job.serviceName}</strong>
                </div>
                <div>
                  <small>Customer</small>
                  <strong>{job.customerName}</strong>
                </div>
                <div>
                  <small>Booking date</small>
                  <strong>{job.formattedDate}</strong>
                </div>
                <JobStatusBadge status={job.status} />
              </article>
            )
          }) : (
            <p style={{ color: '#888', padding: '16px' }}>{contextLoading ? 'Loading assignments…' : jobsAvailable ? 'No completed assignments in the returned list.' : 'Current assignment data unavailable.'}</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default TechnicianPerformance
