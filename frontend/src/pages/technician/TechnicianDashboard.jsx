import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { selectAssignedJobViewModels, selectCurrentTechnicianContext } from "../../data/technician/technicianSelectors";
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import JobDetailsModal from '../../components/technician/JobDetailsModal'

/**
 * TechnicianDashboard Component
 * High-performance field operations hub for the AirCon Care Technician Portal.
 */
function TechnicianDashboard() {
  const [selectedJob, setSelectedJob] = useState(null)
  const technician = selectCurrentTechnicianContext()
  const technicianJobs = technician
    ? selectAssignedJobViewModels(technician.technician_ID)
    : []

  // Filter today's jobs from mock dataset
  const todayJobs = technicianJobs.filter(
    (job) => job.timeframe === 'today' || job.date === '2026-07-29'
  )

  return (
    <div className="technician-dashboard-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="page-kicker">TECHNICIAN OPERATIONS</div>
          <h2 className="page-title">Good morning, {technician?.firstName || 'Marcus'} 👋</h2>
          <p className="page-subtitle">
            You have <strong>{todayJobs.length} jobs scheduled today</strong>
            <span className="dashboard-header-separator" aria-hidden="true" />
            Wednesday, 29 Jul 2026
          </p>
        </div>

        <span className="dashboard-shift-status duty-status-badge">
          <span className="duty-dot-pulse" />
          <span>On Shift / Active</span>
        </span>
      </header>

      <section className="dashboard-kpi-strip" aria-label="Today's work summary">
        <div className="dashboard-kpi-item">
          <div className="kpi-icon-box kpi-icon-today">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="dashboard-kpi-copy">
            <div className="kpi-stat-label">Today's Jobs</div>
            <div className="kpi-stat-value">{todayJobs.length}</div>
          </div>
        </div>

        <div className="dashboard-kpi-item">
          <div className="kpi-icon-box kpi-icon-completed">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="dashboard-kpi-copy">
            <div className="kpi-stat-label">Completed (Week)</div>
            <div className="kpi-stat-value">12</div>
          </div>
        </div>

        <div className="dashboard-kpi-item">
          <div className="kpi-icon-box kpi-icon-progress">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="dashboard-kpi-copy">
            <div className="kpi-stat-label">Pending Reports</div>
            <div className="kpi-stat-value">3</div>
          </div>
        </div>

        <div className="dashboard-kpi-item">
          <div className="kpi-icon-box kpi-icon-rating">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="dashboard-kpi-copy">
            <div className="kpi-stat-label">Avg. Rating</div>
            <div className="kpi-stat-value">4.9 ★</div>
          </div>
        </div>
      </section>

      <div className="dashboard-workspace">
        <section className="dashboard-panel-card dashboard-schedule-panel">
          <div className="dashboard-panel-header dashboard-section-header">
            <div>
              <div className="dashboard-section-title-row">
                <h3>Today's Schedule</h3>
                <span className="dashboard-count-badge">{todayJobs.length} Jobs</span>
              </div>
            </div>

            <Link to="/technician/assigned-jobs" className="dashboard-view-all-link">
              <span>View All Assigned Jobs</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="dashboard-schedule-list">
            {todayJobs.map((job) => (
              <article
                key={job.id}
                className={`dashboard-schedule-card ${
                  job.status === 'In Progress' ? 'in-progress-border' : 'upcoming-border'
                }`}
              >
                <div className="dashboard-job-heading">
                  <div className="dashboard-job-identity">
                    <div className="schedule-service-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    </div>
                    <div>
                      <div className="dashboard-job-title-row">
                        <h4>{job.serviceType}</h4>
                        <span className="job-id-chip">{job.id}</span>
                      </div>
                      <p>{job.customerName}</p>
                    </div>
                  </div>
                  <JobStatusBadge status={job.status} />
                </div>

                <div className="dashboard-job-details">
                  <div className="dashboard-job-detail dashboard-job-time">
                    <span className="dashboard-detail-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <polyline points="12 7 12 12 15 14" />
                      </svg>
                    </span>
                    <div>
                      <span className="dashboard-detail-label">Scheduled</span>
                      <strong>{job.time}</strong>
                      <small>Est. {job.estimatedDuration}</small>
                    </div>
                  </div>

                  <div className="dashboard-job-detail dashboard-job-location">
                    <span className="dashboard-detail-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <div>
                      <span className="dashboard-detail-label">Service Location</span>
                      <strong>{job.address}</strong>
                      {job.postalCode && <small>S{job.postalCode}</small>}
                    </div>
                  </div>

                  <div className="dashboard-job-detail dashboard-job-equipment">
                    <span className="dashboard-detail-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="12" rx="2" />
                        <line x1="7" y1="21" x2="17" y2="21" />
                        <line x1="9" y1="17" x2="9" y2="21" />
                        <line x1="15" y1="17" x2="15" y2="21" />
                      </svg>
                    </span>
                    <div>
                      <span className="dashboard-detail-label">Equipment</span>
                      <strong>{job.unitType}</strong>
                    </div>
                  </div>
                </div>

                <div className="dashboard-job-actions">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm action-view-btn dashboard-secondary-action"
                    onClick={() => setSelectedJob(job)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    View Details
                  </button>

                  {job.status === 'In Progress' ? (
                    <button type="button" className="btn btn-warning btn-sm dashboard-primary-action dashboard-continue-action" onClick={() => setSelectedJob(job)}>
                      Continue Service
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary btn-sm dashboard-primary-action" onClick={() => setSelectedJob(job)}>
                      Start Service
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="dashboard-side-column">
          <section className="dashboard-panel-card dashboard-quick-actions-panel">
            <div className="dashboard-panel-header dashboard-section-header">
              <h3>Quick Actions</h3>
            </div>
            <div className="dashboard-quick-actions-list">
              <Link to="/technician/submit-report" className="quick-action-primary-btn">
                <span className="dashboard-action-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </span>
                <span>Submit Service Report</span>
                <svg className="dashboard-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>

              <Link to="/technician/parts-log" className="quick-action-outline-btn">
                <span className="dashboard-action-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                </span>
                <span>Log Parts & Materials</span>
                <svg className="dashboard-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>

              <Link to="/technician/follow-up" className="quick-action-outline-btn">
                <span className="dashboard-action-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <span>Book Follow-Up Service</span>
                <svg className="dashboard-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </section>

          <section className="dashboard-panel-card dashboard-performance-panel">
            <div className="dashboard-panel-header dashboard-section-header">
              <h3>Performance & Readiness</h3>
            </div>
            <div className="dashboard-performance-list">
              <div className="dashboard-performance-item dashboard-performance-with-progress">
                <div className="performance-stat-row">
                  <div>
                    <strong>On-Time Arrival Rate</strong>
                    <span>Target: &gt;95%</span>
                  </div>
                  <b className="dashboard-performance-success">97%</b>
                </div>
                <div className="performance-progress-bar">
                  <div className="performance-progress-fill" style={{ width: '97%' }} />
                </div>
              </div>

              <div className="dashboard-performance-item performance-stat-row">
                <div>
                  <strong>Customer Satisfaction</strong>
                  <span>Based on 28 ratings</span>
                </div>
                <b className="dashboard-performance-primary">4.9 / 5.0</b>
              </div>

              <div className="dashboard-performance-item performance-stat-row">
                <div>
                  <strong>Completed This Month</strong>
                  <span>July 2026</span>
                </div>
                <b>28 Jobs</b>
              </div>

              <div className="dashboard-readiness-row">
                <div className="dashboard-readiness-copy">
                  <span className="dashboard-readiness-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  </span>
                  <span>Vehicle Tool & Gas Kit</span>
                </div>
                <span className="dashboard-verified-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verified OK
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <JobDetailsModal
        show={Boolean(selectedJob)}
        job={selectedJob}
        onHide={() => setSelectedJob(null)}
      />
    </div>
  )
}

export default TechnicianDashboard
