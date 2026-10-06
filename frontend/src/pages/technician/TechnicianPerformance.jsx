import React, { useState, useEffect } from 'react'
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

function TechnicianPerformance() {
  var workflow = useTechnicianWorkflow()
  var { user, token } = useAuth()
  var technicianID = workflow.technicianID
  var workload = workflow.workload || { assignedJobs: 0, byStatus: { upcoming: 0, inProgress: 0, completed: 0 } }
  var contextLoading = workflow.loading

  var [profile, setProfile] = useState(null)
  var [profileLoading, setProfileLoading] = useState(true)

  useEffect(function () {
    if (technicianID === null || technicianID === undefined) {
      setProfile(null)
      setProfileLoading(false)
      return undefined
    }

    var cancelled = false

    async function fetchProfile() {
      setProfileLoading(true)
      try {
        var headers = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = 'Bearer ' + token
        var res = await fetch(API_BASE_URL + '/api/technician/profile?techId=' + technicianID, { headers: headers, signal: AbortSignal.timeout(5000) })
        var data = await res.json()
        if (cancelled) return
        var returnedTechnicianID = data.profile?.technicianID ?? data.profile?.technician_ID ?? null
        var profileMatchesIdentity =
          returnedTechnicianID !== null &&
          String(returnedTechnicianID) === String(technicianID)

        if (res.ok && data.success && data.profile && profileMatchesIdentity) {
          setProfile(data.profile)
        } else {
          setProfile(null)
        }
      } catch (err) {
        if (!cancelled) setProfile(null)
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }
    fetchProfile()
    return function () { cancelled = true }
  }, [technicianID, token])

  var currentProfile = profile && String(profile.technicianID) === String(technicianID) ? profile : null
  var displayProfile = {
    technicianName: currentProfile?.technicianName || user?.username || 'Technician',
    technicianID: currentProfile?.technicianID ?? technicianID,
    technicianRating: currentProfile?.technicianRating ?? null,
  }

  var hasTechnicianIdentity = displayProfile.technicianID !== null && displayProfile.technicianID !== undefined
  var workloadAvailable = hasTechnicianIdentity && workflow.dataAvailable === true
  var ratingValue = displayProfile.technicianRating
  var hasRating = ratingValue !== null && ratingValue !== undefined && ratingValue !== '' && Number.isFinite(Number(ratingValue))

  var loading = contextLoading || profileLoading

  if (loading) {
    return (
      <div className="technician-performance-page">
        <section className="tech-performance-empty" role="status">
          <h1>Performance</h1>
          <p>Loading performance data...</p>
        </section>
      </div>
    )
  }

  var assignedTotal = workloadAvailable ? workload.assignedJobs : null
  var workloadUnavailableMessage = hasTechnicianIdentity
    ? (workflow.error || 'Assigned work is unavailable')
    : 'Technician identity unavailable'

  var availabilityItems = [
    {
      label: 'Rating',
      value: hasRating ? String(ratingValue) : '—',
      available: hasRating,
    },
    {
      label: 'On-time arrival',
      value: '—',
      available: false,
    },
    {
      label: 'Customer satisfaction',
      value: '—',
      available: false,
    },
    {
      label: 'Report analytics',
      value: '—',
      available: false,
    },
  ]

  return (
    <div className="technician-performance-page">
      <header className="cf-page-header tech-performance-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">Technician Performance</span>
          <h1>Performance</h1>
          <p>A factual view of currently assigned work and available performance records.</p>
        </div>
        <div className="tech-performance-technician">
          <span className="tech-performance-technician-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </span>
          <span>
            <small>Technician context</small>
            <strong>{displayProfile.technicianName}</strong>
            <em>{hasTechnicianIdentity ? 'ID ' + displayProfile.technicianID : 'Technician identity unavailable'}</em>
          </span>
        </div>
      </header>

      <section className="tech-performance-overview" aria-labelledby="workload-overview-title">
        <header className="tech-performance-overview-header">
          <div className="tech-performance-section-title">
            <span className="tech-performance-section-icon" aria-hidden="true"><WorkloadIcon /></span>
            <div>
              <span className="cf-widget-kicker">Current workload</span>
              <h2 id="workload-overview-title">Operational Performance Overview</h2>
            </div>
          </div>
          <p>Live distribution of work assigned through current booking and job records.</p>
        </header>
        <div className="tech-performance-overview-body">
          <div className="tech-performance-assigned-total">
            <span>Assigned work</span>
            <strong>{workloadAvailable ? assignedTotal : '—'}</strong>
            <small>{workloadAvailable ? (assignedTotal === 1 ? 'job assigned' : 'jobs assigned') : workloadUnavailableMessage}</small>
          </div>
          <div className="tech-performance-distribution">
            <div className={`tech-performance-status-bars${workloadAvailable ? '' : ' is-unavailable'}`} role="list">
              {STATUS_ITEMS.map(function (item) {
                var count = workloadAvailable ? (workload.byStatus[item.key] || 0) : null
                return (
                  <div className="tech-performance-status-row" role="listitem" key={item.key}>
                    <div className="tech-performance-status-row-heading">
                      <span><i className={item.className} aria-hidden="true" />{item.label}</span>
                      <strong>{workloadAvailable ? count : '—'}</strong>
                    </div>
                    {workloadAvailable && (
                      <span
                        className="tech-performance-status-track"
                        role="progressbar"
                        aria-valuenow={count}
                        aria-valuemin="0"
                        aria-valuemax={assignedTotal}
                      >
                        <span className={item.className} style={{ width: assignedTotal ? (count / assignedTotal * 100) + '%' : '0%' }} />
                      </span>
                    )}
                    {!workloadAvailable && (
                      <span className="tech-performance-status-track tech-performance-status-track-unavailable" aria-hidden="true" />
                    )}
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
                <span className="cf-widget-kicker">Historical work</span>
                <h2 id="completed-analysis-title">Performance History</h2>
              </div>
            </div>
            <span className="tech-performance-history-status">History unavailable</span>
          </header>
          <div className="tech-performance-completed-body">
            <dl className="tech-performance-history-list">
              <div><dt>Completed by month</dt><dd>—</dd></div>
              <div><dt>Completed service mix</dt><dd>—</dd></div>
              <div><dt>Recent Completed Work</dt><dd>—</dd></div>
            </dl>
            <p className="tech-performance-history-note">Durable completed-work history is not available for analysis.</p>
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
                  </div>
                </div>
              )
            })}
          </div>
          <p className="tech-performance-availability-note">
            Rating appears when supplied by the matched technician profile. Arrival, customer feedback, and report analytics are not currently available.
          </p>
        </aside>
      </div>
    </div>
  )
}

export default TechnicianPerformance
