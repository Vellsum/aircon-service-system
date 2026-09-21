import React from 'react'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import { selectCurrentTechnicianPerformanceViewModel } from './data/technicianSelectors'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'

const STATUS_ITEMS = [
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

function AvailabilityIcon({ available = false }) {
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
  const performance = selectCurrentTechnicianPerformanceViewModel()
  const { workload } = useTechnicianWorkflow()

  if (!performance) {
    return (
      <div className="technician-performance-page">
        <section className="tech-performance-empty" role="status">
          <h1>Performance</h1>
          <p>Technician performance data is not available.</p>
        </section>
      </div>
    )
  }

  const { completedWork, availability } = performance
  const assignedTotal = workload.assignedJobs
  const serviceTotal = completedWork.byService.reduce(
    (total, service) => total + service.count,
    0,
  )
  const availabilityItems = [
    {
      label: 'Rating',
      value: availability.rating
        ? String(performance.technicianRating)
        : 'Rating not available',
      note: availability.rating
        ? 'Current technician rating'
        : 'Awaiting technician rating data',
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
      value: 'Awaiting report integration',
      note: 'Service report records are not yet available',
      available: availability.reports,
    },
  ]

  return (
    <div className="technician-performance-page">
      <header className="cf-page-header tech-performance-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">Technician · Performance</span>
          <h1>Performance</h1>
          <p>
            A factual view of currently assigned work and completed service records.
          </p>
        </div>

        <div className="tech-performance-technician" aria-label={`Technician ${performance.technicianName}, ID ${performance.technicianID}`}>
          <span className="tech-performance-technician-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </span>
          <span>
            <small>Technician record</small>
            <strong>{performance.technicianName}</strong>
            <em>ID {performance.technicianID}</em>
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
            <div className="tech-performance-status-bars" role="list" aria-label="Assigned work status distribution">
              {STATUS_ITEMS.map((item) => (
                <div className="tech-performance-status-row" role="listitem" key={item.key}>
                  <div className="tech-performance-status-row-heading">
                    <span><i className={item.className} aria-hidden="true" />{item.label}</span>
                    <strong>{workload.byStatus[item.key]}</strong>
                  </div>
                  <span
                    className="tech-performance-status-track"
                    role="progressbar"
                    aria-label={`${item.label}: ${workload.byStatus[item.key]} of ${assignedTotal} assigned jobs`}
                    aria-valuemin="0"
                    aria-valuemax={assignedTotal}
                    aria-valuenow={workload.byStatus[item.key]}
                  >
                    <span
                      className={item.className}
                      style={{
                        width: assignedTotal
                          ? `${(workload.byStatus[item.key] / assignedTotal) * 100}%`
                          : '0%',
                      }}
                    />
                  </span>
                </div>
              ))}
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
                {completedWork.byMonth.map((month) => (
                  <div key={month.period}>
                    <span className="tech-performance-month-mark" aria-hidden="true" />
                    <span><strong>{month.label}</strong><small>{month.period}</small></span>
                    <b>{month.count}</b>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="completed-service-mix-title">
              <div className="tech-performance-subheading">
                <h3 id="completed-service-mix-title">Completed service mix</h3>
                <span>Compatibility service labels</span>
              </div>
              <div className="tech-performance-service-list">
                {completedWork.byService.map((service) => (
                  <div key={service.serviceName}>
                    <div>
                      <strong>{service.serviceName}</strong>
                      <span>{service.count} {service.count === 1 ? 'job' : 'jobs'}</span>
                    </div>
                    <span className="tech-performance-service-track" aria-hidden="true">
                      <span style={{ width: serviceTotal ? `${(service.count / serviceTotal) * 100}%` : '0%' }} />
                    </span>
                  </div>
                ))}
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
            {availabilityItems.map((item) => (
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
            ))}
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
          {completedWork.recentJobs.map((job) => (
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
          ))}
        </div>
      </section>
    </div>
  )
}

export default TechnicianPerformance
