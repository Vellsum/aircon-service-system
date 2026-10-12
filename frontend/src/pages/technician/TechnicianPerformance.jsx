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

function getMonthLabel(dateStr) {
  if (!dateStr) return 'Unknown'
  try {
    var d = new Date(dateStr + 'T00:00:00')
    if (isNaN(d.getTime())) return 'Unknown'
    return d.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
  } catch (e) {
    return 'Unknown'
  }
}

function TechnicianPerformance() {
  var workflow = useTechnicianWorkflow()
  var { user } = useAuth()
  var assignedJobs = workflow.assignedJobs || []
  var workload = workflow.workload || { assignedJobs: 0, byStatus: { upcoming: 0, inProgress: 0, completed: 0 } }
  var contextLoading = workflow.loading

  var [profile, setProfile] = useState(null)
  var [profileLoading, setProfileLoading] = useState(true)

  useEffect(function () {
    async function fetchProfile() {
      setProfileLoading(true)
      try {
        var token = localStorage.getItem('token') || ''
        var headers = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = 'Bearer ' + token
        var storedUser = JSON.parse(localStorage.getItem('user') || '{}')
        var techId = storedUser.technician_ID || storedUser.id || storedUser.user_ID || 1
        var res = await fetch(API_BASE_URL + '/api/technician/profile?techId=' + techId, { headers: headers, signal: AbortSignal.timeout(5000) })
        var data = await res.json()
        if (res.ok && data.success && data.profile) {
          setProfile(data.profile)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('[Performance] Profile fetch error:', err)
        setProfile(null)
      } finally {
        setProfileLoading(false)
      }
    }
    fetchProfile()
  }, [])

  // Build display profile: use API data, or fall back to AuthContext user
  var displayProfile = profile || {
    technicianName: user?.username || 'Technician',
    technicianID: user?.technician_ID || user?.id || 'N/A',
    technicianRating: 5,
  }

  var completedWork = useMemo(function () {
    var completedJobs = assignedJobs.filter(function (j) {
      return (j.status || '').toLowerCase() === 'completed'
    })

    var monthMap = new Map()
    completedJobs.forEach(function (job) {
      var monthKey = job.date ? job.date.substring(0, 7) : 'unknown'
      var monthLabel = getMonthLabel(job.date)
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { period: monthKey, label: monthLabel, count: 0 })
      }
      monthMap.get(monthKey).count += 1
    })

    var serviceMap = new Map()
    completedJobs.forEach(function (job) {
      var serviceName = job.serviceType || 'Aircon Servicing'
      if (!serviceMap.has(serviceName)) {
        serviceMap.set(serviceName, { serviceName: serviceName, count: 0 })
      }
      serviceMap.get(serviceName).count += 1
    })

    var recentJobs = completedJobs
      .slice()
      .sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') })
      .slice(0, 10)
      .map(function (job) {
        return {
          jobID: job.job_ID,
          displayJobCode: job.id || '#BK' + String(job.job_ID).padStart(3, '0'),
          serviceName: job.serviceType || 'Aircon Servicing',
          customerName: job.customerName || 'Guest Customer',
          formattedDate: job.formattedDate || formatDate(job.date),
          status: job.status
        }
      })

    return {
      total: completedJobs.length,
      byMonth: Array.from(monthMap.values()).sort(function (a, b) { return b.period.localeCompare(a.period) }),
      byService: Array.from(serviceMap.values()).sort(function (a, b) { return b.count - a.count }),
      recentJobs: recentJobs
    }
  }, [assignedJobs])

  var availability = useMemo(function () {
    var hasRating = displayProfile.technicianRating && displayProfile.technicianRating > 0
    var hasReports = completedWork.total > 0
    return {
      rating: hasRating,
      onTimeArrival: false,
      customerSatisfaction: false,
      reports: hasReports
    }
  }, [displayProfile, completedWork.total])

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

  var assignedTotal = workload.assignedJobs
  var serviceTotal = completedWork.byService.reduce(function (total, service) { return total + service.count }, 0)

  var availabilityItems = [
    {
      label: 'Rating',
      value: availability.rating ? String(displayProfile.technicianRating) : 'Rating not available',
      note: availability.rating ? 'Current technician rating' : 'Awaiting technician rating data',
      available: availability.rating,
    },
    {
      label: 'On-time arrival',
      value: 'Awaiting arrival data',
      note: 'No arrival timestamps are currently available',
      available: availability.onTimeArrival,
    },
    {
      label: 'Customer satisfaction',
      value: 'Awaiting rating data',
      note: 'No per-job customer ratings are currently available',
      available: availability.customerSatisfaction,
    },
    {
      label: 'Report analytics',
      value: availability.reports ? completedWork.total + ' reports on record' : 'Awaiting report integration',
      note: availability.reports ? 'Service report data is available' : 'Service report records are not yet available',
      available: availability.reports,
    },
  ]

  return (
    <div className="technician-performance-page">
      <header className="cf-page-header tech-performance-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">Technician Performance</span>
          <h1>Performance</h1>
          <p>A factual view of currently assigned work and completed service records.</p>
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
            <strong>{displayProfile.technicianName}</strong>
            <em>ID {displayProfile.technicianID}</em>
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
            <strong>{assignedTotal}</strong>
            <small>{assignedTotal === 1 ? 'job assigned' : 'jobs assigned'}</small>
          </div>
          <div className="tech-performance-distribution">
            <div className="tech-performance-status-bars" role="list">
              {STATUS_ITEMS.map(function (item) {
                var count = workload.byStatus[item.key] || 0
                return (
                  <div className="tech-performance-status-row" role="listitem" key={item.key}>
                    <div className="tech-performance-status-row-heading">
                      <span><i className={item.className} aria-hidden="true" />{item.label}</span>
                      <strong>{count}</strong>
                    </div>
                    <span className="tech-performance-status-track" role="progressbar" aria-valuenow={count} aria-valuemin="0" aria-valuemax={assignedTotal}>
                      <span className={item.className} style={{ width: assignedTotal ? (count / assignedTotal * 100) + '%' : '0%' }} />
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
                <span className="cf-widget-kicker">Historical work</span>
                <h2 id="completed-analysis-title">Completed Work Analysis</h2>
              </div>
            </div>
            <div className="tech-performance-completed-total">
              <strong>{completedWork.total}</strong>
              <span>completed jobs</span>
            </div>
          </header>
          <div className="tech-performance-completed-body">
            <section aria-labelledby="completed-by-month-title">
              <div className="tech-performance-subheading">
                <h3 id="completed-by-month-title">Completed by month</h3>
                <span>Recorded periods only</span>
              </div>
              <div className="tech-performance-month-list">
                {completedWork.byMonth.length > 0 ? completedWork.byMonth.map(function (month) {
                  return (
                    <div key={month.period}>
                      <span className="tech-performance-month-mark" aria-hidden="true" />
                      <span><strong>{month.label}</strong><small>{month.period}</small></span>
                      <b>{month.count}</b>
                    </div>
                  )
                }) : (
                  <p style={{ color: '#888' }}>No completed work recorded yet.</p>
                )}
              </div>
            </section>
            <section aria-labelledby="completed-service-mix-title">
              <div className="tech-performance-subheading">
                <h3 id="completed-service-mix-title">Completed service mix</h3>
                <span>Service type distribution</span>
              </div>
              <div className="tech-performance-service-list">
                {completedWork.byService.length > 0 ? completedWork.byService.map(function (service) {
                  return (
                    <div key={service.serviceName}>
                      <div>
                        <strong>{service.serviceName}</strong>
                        <span>{service.count} {service.count === 1 ? 'job' : 'jobs'}</span>
                      </div>
                      <span className="tech-performance-service-track" aria-hidden="true">
                        <span style={{ width: serviceTotal ? (service.count / serviceTotal * 100) + '%' : '0%' }} />
                      </span>
                    </div>
                  )
                }) : (
                  <p style={{ color: '#888' }}>No service data available.</p>
                )}
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
            <span className="cf-widget-kicker">Latest history</span>
            <h2 id="recent-completed-title">Recent Completed Work</h2>
          </div>
          <span>{completedWork.recentJobs.length} records</span>
        </header>
        <div className="tech-performance-recent-list">
          {completedWork.recentJobs.length > 0 ? completedWork.recentJobs.map(function (job) {
            return (
              <article key={job.jobID} className="tech-performance-recent-row">
                <div className="tech-performance-job-code">
                  <span>{job.displayJobCode}</span>
                  <small>Job ID {job.jobID}</small>
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
                  <small>Service date</small>
                  <strong>{job.formattedDate}</strong>
                </div>
                <JobStatusBadge status={job.status} />
              </article>
            )
          }) : (
            <p style={{ color: '#888', padding: '16px' }}>No completed jobs on record.</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default TechnicianPerformance