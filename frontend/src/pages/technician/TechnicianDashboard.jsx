import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { MOCK_JOBS } from './mockJobs'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import JobDetailsModal from '../../components/technician/JobDetailsModal'

/**
 * TechnicianDashboard Component
 * High-performance field operations hub for the AirCon Care Technician Portal.
 */
function TechnicianDashboard() {
  const [selectedJob, setSelectedJob] = useState(null)

  // Filter today's jobs from mock dataset
  const todayJobs = MOCK_JOBS.filter(
    (job) => job.timeframe === 'today' || job.date === '2026-07-29'
  )

  return (
    <div className="technician-dashboard-page">
      {/* Hero Greeting & Status Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <div className="page-kicker">TECHNICIAN OPERATIONS</div>
          <h2 className="page-title mb-1">Good morning, Marcus 👋</h2>
          <p className="page-subtitle mb-0">
            You have <strong className="text-dark">2 jobs scheduled today</strong> — Wednesday, 29 Jul 2026
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="duty-status-badge py-1.5 px-3">
            <span className="duty-dot-pulse" />
            <span className="fw-semibold">On Shift / Active</span>
          </span>
        </div>
      </div>

      {/* 4 Prominent KPI Metric Cards */}
      <div className="row g-3 mb-4">
        {/* Today's Jobs */}
        <div className="col-6 col-lg-3">
          <div className="kpi-card-wrapper kpi-card-today">
            <div className="kpi-icon-box kpi-icon-today">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <div className="kpi-stat-value">2</div>
              <div className="kpi-stat-label">Today's Jobs</div>
            </div>
          </div>
        </div>

        {/* Completed This Week */}
        <div className="col-6 col-lg-3">
          <div className="kpi-card-wrapper kpi-card-completed">
            <div className="kpi-icon-box kpi-icon-completed">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div>
              <div className="kpi-stat-value">12</div>
              <div className="kpi-stat-label">Completed (Week)</div>
            </div>
          </div>
        </div>

        {/* Pending Reports */}
        <div className="col-6 col-lg-3">
          <div className="kpi-card-wrapper kpi-card-progress">
            <div className="kpi-icon-box kpi-icon-progress">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div>
              <div className="kpi-stat-value">3</div>
              <div className="kpi-stat-label">Pending Reports</div>
            </div>
          </div>
        </div>

        {/* Average Rating */}
        <div className="col-6 col-lg-3">
          <div className="kpi-card-wrapper kpi-card-upcoming">
            <div className="kpi-icon-box kpi-icon-rating">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div>
              <div className="kpi-stat-value">4.9 ★</div>
              <div className="kpi-stat-label">Avg. Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Operational Grid */}
      <div className="row g-4">
        {/* Left Column: Today's Schedule Timeline */}
        <div className="col-lg-8">
          <div className="dashboard-panel-card mb-4">
            <div className="dashboard-panel-header d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <div className="schedule-service-icon" style={{ width: '32px', height: '32px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <h5 className="mb-0 fw-bold text-dark">Today's Schedule</h5>
                <span className="badge bg-primary-subtle text-primary ms-1">{todayJobs.length} Jobs</span>
              </div>
              <Link to="/technician/assigned-jobs" className="text-primary text-decoration-none small fw-bold">
                View All Assigned Jobs &rarr;
              </Link>
            </div>

            <div className="dashboard-panel-body">
              {todayJobs.map((job) => (
                <div
                  key={job.id}
                  className={`dashboard-schedule-card ${
                    job.status === 'In Progress' ? 'in-progress-border' : 'upcoming-border'
                  }`}
                >
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2 mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="schedule-service-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <h6 className="mb-0 fw-bold text-dark">{job.serviceType}</h6>
                          <span className="job-id-chip">{job.id}</span>
                        </div>
                        <div className="text-muted small mt-0.5">
                          {job.customerName} • <span className="fw-semibold text-dark">{job.time}</span> (Est. {job.estimatedDuration})
                        </div>
                      </div>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </div>

                  {/* Location & Unit Details */}
                  <div className="p-2.5 bg-light rounded-3 mb-3 border">
                    <div className="d-flex align-items-start gap-2 text-secondary small mb-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger flex-shrink-0 mt-0.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span className="fw-medium text-dark">{job.address}</span>
                      {job.postalCode && <span className="text-muted">(S{job.postalCode})</span>}
                    </div>
                    <div className="text-muted small ps-4 text-truncate">
                      Equipment: {job.unitType}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="d-flex align-items-center justify-content-between pt-1">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm action-view-btn px-3"
                      onClick={() => setSelectedJob(job)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View Details
                    </button>

                    {job.status === 'In Progress' ? (
                      <button type="button" className="btn btn-warning btn-sm px-3 fw-bold text-dark" onClick={() => setSelectedJob(job)}>
                        Continue Service
                      </button>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm px-3 fw-semibold" onClick={() => setSelectedJob(job)}>
                        Start Service
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Field Performance */}
        <div className="col-lg-4">
          {/* Quick Actions Panel */}
          <div className="dashboard-panel-card mb-4">
            <div className="dashboard-panel-header">
              <h6 className="mb-0 fw-bold text-dark">Quick Actions</h6>
            </div>
            <div className="dashboard-panel-body d-flex flex-column gap-2.5">
              <Link to="/technician/submit-report" className="quick-action-primary-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <span>Submit Service Report</span>
              </Link>

              <Link to="/technician/parts-log" className="quick-action-outline-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                <span>Log Parts & Materials</span>
              </Link>

              <Link to="/technician/follow-up" className="quick-action-outline-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>Book Follow-Up Service</span>
              </Link>
            </div>
          </div>

          {/* Performance & Readiness Panel */}
          <div className="dashboard-panel-card">
            <div className="dashboard-panel-header">
              <h6 className="mb-0 fw-bold text-dark">Performance & Readiness</h6>
            </div>
            <div className="dashboard-panel-body">
              {/* On-Time Rate */}
              <div className="performance-stat-row">
                <div>
                  <div className="fw-semibold text-dark small">On-Time Arrival Rate</div>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>Target: &gt;95%</div>
                </div>
                <div className="text-end">
                  <span className="fw-bold text-success">97%</span>
                </div>
              </div>
              <div className="performance-progress-bar mb-3">
                <div className="performance-progress-fill" style={{ width: '97%' }} />
              </div>

              {/* Customer Rating */}
              <div className="performance-stat-row">
                <div>
                  <div className="fw-semibold text-dark small">Customer Satisfaction</div>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>Based on 28 ratings</div>
                </div>
                <div className="text-end">
                  <span className="fw-bold text-primary">4.9 / 5.0</span>
                </div>
              </div>

              {/* Jobs Completed Month */}
              <div className="performance-stat-row">
                <div>
                  <div className="fw-semibold text-dark small">Completed This Month</div>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>July 2026</div>
                </div>
                <div className="text-end">
                  <span className="fw-bold text-dark">28 Jobs</span>
                </div>
              </div>

              {/* Field Kit / Stock Status */}
              <div className="mt-3 p-2.5 bg-light rounded-3 border">
                <div className="d-flex align-items-center justify-content-between">
                  <span className="text-muted small">Vehicle Tool & Gas Kit</span>
                  <span className="badge bg-success-subtle text-success">Verified OK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <JobDetailsModal
        show={Boolean(selectedJob)}
        job={selectedJob}
        onHide={() => setSelectedJob(null)}
      />
    </div>
  )
}

export default TechnicianDashboard
