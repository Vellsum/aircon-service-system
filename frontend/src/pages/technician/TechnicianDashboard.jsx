import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import JobDetailsModal from '../../components/technician/JobDetailsModal'
import "../../styles/technician.css";
import { useAuth } from '../../context/AuthContext'

/**
 * Helper: Formats current date to full readable string (e.g. "Monday, 21 Sep 2026")
 */
const getFormattedLiveDate = () => {
  const options = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
  return new Date().toLocaleDateString('en-GB', options);
};

function TechnicianDashboard() {
  const {user} = useAuth()
  const [selectedJob, setSelectedJob] = useState(null)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [technicianJobs, setTechnicianJobs] = useState([])
  const [techName, setTechName] = useState('Technician')
  // Sync name from auth context
  useEffect(() => {
    if (user?.username) setTechName(user.username)
  }, [user])
  const [loading, setLoading] = useState(true)
  const jobDetailsTriggerRef = useRef(null)
  const { startService, completeService } = useTechnicianWorkflow()

  // 1. HTTP GET: Fetch live technician jobs & name on mount
  const fetchDashboardJobs = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token') || ''
      const headers = { 'Content-Type': 'application/json' }
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const currentTechId = storedUser.id || storedUser.user_ID || storedUser.technician_ID || 1;
      const res = await fetch(`http://localhost:5000/api/technician/jobs?techId=${currentTechId}`, { headers });
      const data = await res.json()

      if (res.ok && data.success) {
        if (Array.isArray(data.jobs)) setTechnicianJobs(data.jobs);
        if (data.technicianName) setTechName(data.technicianName);
      }
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

  const closeJobDetails = () => {
    setShowJobDetails(false)
  }

  // 2. HTTP PUT: Start service
  const handleStartService = async (jobToStart) => {
    try {
      const targetId = jobToStart.job_ID || jobToStart.id.replace('#BK', '')
      const token = localStorage.getItem('token') || ''

      await fetch(`http://localhost:5000/api/technician/jobs/${targetId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'In Progress' }),
      })

      if (startService) startService(jobToStart.job_ID)
      closeJobDetails()
      fetchDashboardJobs()
    } catch (err) {
      console.error('Error starting service:', err)
    }
  }

  // 3. HTTP PUT: Complete service
  const handleCompleteService = async (jobToComplete) => {
    try {
      const targetId = jobToComplete.job_ID || jobToComplete.id.replace('#BK', '')
      const token = localStorage.getItem('token') || ''

      await fetch(`http://localhost:5000/api/technician/jobs/${targetId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'Completed' }),
      })

      if (completeService) completeService(jobToComplete.job_ID)
      closeJobDetails()
      fetchDashboardJobs()
    } catch (err) {
      console.error('Error completing service:', err)
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  
  // Dynamic today filter
  const todayJobs = technicianJobs.filter(
  (job) => 
    job.timeframe === 'today' || 
    (job.date && job.date.includes(todayStr)) || 
    job.status === 'In Progress' || 
    job.status === 'Assigned' || 
    job.status === 'Pending' ||
    !job.date
  );
  const completedJobsCount = technicianJobs.filter((job) => job.status === 'Completed').length

  const summaryItems = [
    {
      label: "Today's Jobs",
      value: todayJobs.length,
      context: `${todayJobs.filter((job) => job.status === 'In Progress').length} in progress`,
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
      context: 'Recorded in Azure SQL',
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
      label: 'Rating',
      value: '5.0 ★',
      context: 'Field technician score',
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
          {/* Dynamic Greeting */}
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
          {/* Live System Date */}
          <span><small>Today</small><strong>{todayStr}</strong></span>
        </div>
      </header>

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
                <h2 id="today-schedule-title">Today&apos;s Schedule</h2>
                <span className="cf-count-pill">{todayJobs.length} jobs</span>
              </div>
              <p>{getFormattedLiveDate()} · Active assigned service visits</p>
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
            ) : todayJobs.length > 0 ? (
              todayJobs.map((job, index) => {
                // Formatting time display safely
                const displayTime = (job.time && !job.time.includes('1970')) ? job.time : '09:00 AM';

                return (
                  <article className="cf-schedule-row" key={job.id}>
                    <div className="cf-schedule-time">
                      <span className="cf-schedule-index">{String(index + 1).padStart(2, '0')}</span>
                      <strong>{displayTime}</strong>
                      <small>{job.estimatedDuration}</small>
                    </div>
                    <div className="cf-schedule-details">
                      <div className="cf-schedule-title-row">
                        <div>
                          <span className="cf-job-code">{job.id}</span>
                          <h3>{job.serviceType}</h3>
                        </div>
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
                      {job.status !== 'Completed' && job.status !== 'In Progress' && (
                        <button
                          type="button"
                          className="cf-button cf-button-primary"
                          onClick={() => handleStartService(job)}
                        >
                          Start Service
                        </button>
                      )}
                      {job.status === 'In Progress' && (
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
              <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No active jobs scheduled for today.
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
                <span><strong>Submit Service Report</strong><small>Document completed work</small></span>
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
            <div className="cf-performance-hero">
              <div className="cf-progress-ring"><span>100%</span></div>
              <div><strong>On-time arrival</strong><span>Syncing field arrival status</span></div>
            </div>
            <dl className="cf-performance-list">
              <div><dt>Customer satisfaction</dt><dd>5.0 ★<small>Live rating score</small></dd></div>
              <div><dt>Historical completed</dt><dd>{completedJobsCount} Jobs<small>Recorded in Azure SQL</small></dd></div>
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