import React, { useState, useEffect, useMemo } from 'react'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import { useAuth } from '../../context/AuthContext'

var API_BASE_URL = 'http://localhost:5000'

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

function AvailabilityIcon(props) {
  var available = props.available || false
  return available ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.7 2.7 0 0 1 5.1 1.25c0 1.75-2.6 2.1-2.6 3.75" />
      <path d="M12 18h.01" />
    </svg>
  )
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

function storedRatingDisplay(status, value) {
  if (status === 'loading') return { value: 'Loading…', note: 'Loading stored profile rating', available: false }
  if (status === 'error') return { value: 'Request failed', note: 'Stored profile rating could not be loaded', available: false }
  if (status !== 'success' || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 5) {
    return { value: 'Unavailable', note: 'Stored profile rating unavailable', available: false }
  }
  return { value: value === 0 ? 'Not rated yet' : `${value.toFixed(1)} ★`, note: 'Stored profile rating', available: value > 0 }
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

  useEffect(function () {
    if (!hasIdentity) return
    var controller = new AbortController()
    function update(status, profile = null) {
      if (!controller.signal.aborted) setProfileState({ technicianID, token, identitySource, status, profile })
    }
    update('loading')
    async function fetchProfile() {
      try {
        var headers = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = 'Bearer ' + token
        var res = await fetch(API_BASE_URL + '/api/technician/profile?techId=' + technicianID, {
          headers, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
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
  }, [technicianID, token, identitySource, hasIdentity])

  // Do not display a previous identity's profile while the replacement request starts.
  var profileStatus = identitySource === 'initializing' ? 'loading' : !hasIdentity ? 'unavailable'
    : profileState.technicianID === technicianID && profileState.token === token && profileState.identitySource === identitySource
      ? profileState.status : 'loading'
  var profile = profileStatus === 'success' ? profileState.profile : null
  var profileName = profileStatus === 'loading' ? 'Loading…'
    : typeof profile?.technicianName === 'string' && profile.technicianName.trim()
      ? profile.technicianName.trim() : 'Unavailable'
  var rating = storedRatingDisplay(profileStatus, profile?.technicianRating)

  var completedWork = useMemo(function () {
    var completedJobs = assignedJobs.filter(function (j) {
      return (j.status || '').toLowerCase() === 'completed'
    })

    var recentJobs = completedJobs
      .slice()
      .sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') })
      .slice(0, 10)
      .map(function (job) {
        return {
          jobID: job.job_ID,
          displayJobCode: job.id || '#BK' + String(job.job_ID).padStart(3, '0'),
          serviceName: job.serviceType || 'Unavailable',
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

  if (contextLoading) {
    return (
      <div className="technician-performance-page">
        <section className="tech-performance-empty" role="status">
          <h1>Performance</h1>
          <p>Loading performance data...</p>
        </section>
      </div>
    )
  }

  var assignedTotal = jobsAvailable && Number.isSafeInteger(workload.assignedJobs) && workload.assignedJobs >= 0
    ? workload.assignedJobs : null

  var availabilityItems = [
    {
      label: 'Rating',
      value: rating.value,
      note: rating.note,
      available: rating.available,
    },
    {
      label: 'On-time arrival',
      value: 'Awaiting arrival data',
      note: 'No arrival timestamps are currently available',
      available: false,
    },
    {
      label: 'Customer satisfaction',
      value: 'Awaiting rating data',
      note: 'No per-job customer ratings are currently available',
      available: false,
    },
    {
      label: 'Report analytics',
      value: 'Unavailable',
      note: 'Report analytics are not supplied by this page’s APIs',
      available: false,
    },
  ]

  return (
    <div className="technician-performance-page">
      <header className="cf-page-header tech-performance-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">Technician Performance</span>
          <h1>Performance</h1>
          <p>Current returned assignments and stored profile rating; not lifetime performance history.</p>
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
          <h2>{hasIdentity ? 'Assignment data unavailable' : 'Technician identity is unavailable'}</h2>
          <p>Current workload and completed assignment counts cannot be shown.</p>
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
                <h3 id="completed-by-month-title">Completion history</h3>
                <span>Unavailable</span>
              </div>
              <div className="tech-performance-month-list">
                <p style={{ color: '#888' }}>Durable history and actual completion dates are not supplied by the current assignment data.</p>
              </div>
            </section>
            <section aria-labelledby="completed-service-mix-title">
              <div className="tech-performance-subheading">
                <h3 id="completed-service-mix-title">Completed service mix</h3>
                <span>Unavailable</span>
              </div>
              <div className="tech-performance-service-list">
                <p style={{ color: '#888' }}>Verified service-type breakdowns are not supplied by the current assignment API.</p>
              </div>
            </section>
          </div>
        </section>

        <aside className="tech-performance-availability" aria-labelledby="data-availability-title">
          <header className="tech-performance-panel-header">
            <div>
              <span className="cf-widget-kicker">Data readiness</span>
              <h2 id="data-availability-title">Performance Data Availability</h2>
            </div>
          </header>
          <div className="tech-performance-availability-list">
            {availabilityItems.map(function (item) {
              return (
                <div key={item.label}>
                  <span className={item.available ? 'is-available' : ''} aria-hidden="true">
                    <AvailabilityIcon available={item.available} />
                  </span>
                  <div>
                    <small>{item.label}</small>
                    <strong>{item.value}</strong>
                    <p>{item.note}</p>
                  </div>
                </div>
              )
            })}
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
            <p style={{ color: '#888', padding: '16px' }}>{jobsAvailable ? 'No completed assignments in the returned list.' : 'Current assignment data unavailable.'}</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default TechnicianPerformance
