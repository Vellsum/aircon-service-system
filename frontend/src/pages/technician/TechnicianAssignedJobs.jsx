import React, { useMemo, useRef, useState } from 'react'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import FilterTabs from '../../components/technician/FilterTabs'
import JobRow from '../../components/technician/JobRow'
import JobCard from '../../components/technician/JobCard'
import JobDetailsModal from '../../components/technician/JobDetailsModal'

const isTodayJob = (job) => job.timeframe === 'today' || job.date === '2026-07-29'
const isThisWeekJob = (job) =>
  job.timeframe === 'today' || job.timeframe === 'this-week'

function AssignedJobsSummaryIcon({ type }) {
  const iconPaths = {
    today: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    progress: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    upcoming: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18M9 15h6M13 13l2 2-2 2" />
      </>
    ),
    completed: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.6 2.6L16.5 9" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      {iconPaths[type]}
    </svg>
  )
}

function TechnicianAssignedJobs() {
  const { assignedJobs: jobs, startService, completeService } = useTechnicianWorkflow()
  const [activeTab, setActiveTab] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedJob, setSelectedJob] = useState(null)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const jobDetailsTriggerRef = useRef(null)

  const openJobDetails = (job) => {
    jobDetailsTriggerRef.current = document.activeElement
    setSelectedJob(job)
    setShowJobDetails(true)
  }

  const closeJobDetails = () => {
    setShowJobDetails(false)
  }

  const handleStartService = (jobToStart) => {
    startService(jobToStart.job_ID)
    closeJobDetails()
  }

  const handleCompleteService = (jobToComplete) => {
    completeService(jobToComplete.job_ID)
    closeJobDetails()
  }

  const tabCounts = useMemo(() => {
    return {
      today: jobs.filter(isTodayJob).length,
      thisWeek: jobs.filter(isThisWeekJob).length,
      all: jobs.length,
    }
  }, [jobs])

  const metrics = useMemo(() => {
    const todayJobs = jobs.filter(isTodayJob)
    return {
      todayCount: todayJobs.length,
      inProgressCount: jobs.filter((j) => j.status === 'In Progress').length,
      upcomingCount: jobs.filter((j) => j.status === 'Upcoming').length,
      completedCount: jobs.filter((j) => j.status === 'Completed').length,
    }
  }, [jobs])

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return jobs.filter((job) => {
      if (activeTab === 'today') {
        if (!isTodayJob(job)) return false
      } else if (activeTab === 'this-week') {
        if (!isThisWeekJob(job)) return false
      }

      if (statusFilter !== 'ALL' && job.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false
      }

      if (normalizedQuery !== '') {
        const matchesId = job.id.toLowerCase().includes(normalizedQuery)
        const matchesCustomer = job.customerName.toLowerCase().includes(normalizedQuery)
        const matchesService = job.serviceType.toLowerCase().includes(normalizedQuery)
        const matchesEquipment = (job.unitType || '').toLowerCase().includes(normalizedQuery)
        const matchesAddress = job.address.toLowerCase().includes(normalizedQuery)
        return (
          matchesId ||
          matchesCustomer ||
          matchesService ||
          matchesEquipment ||
          matchesAddress
        )
      }

      return true
    })
  }, [jobs, activeTab, statusFilter, searchQuery])

  const summaryItems = [
    { label: 'Today', value: metrics.todayCount, tone: 'mint', icon: 'today' },
    { label: 'In Progress', value: metrics.inProgressCount, tone: 'amber', icon: 'progress' },
    { label: 'Upcoming', value: metrics.upcomingCount, tone: 'blue', icon: 'upcoming' },
    { label: 'Completed', value: metrics.completedCount, tone: 'green', icon: 'completed' },
  ]

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
    setActiveTab('all')
  }

  return (
    <div className="technician-page-content technician-assigned-jobs-page cf-jobs-page">
      <header className="cf-page-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">Work management</span>
          <h1>Assigned Jobs</h1>
          <p>Review your workload, begin scheduled service, and track active jobs.</p>
        </div>
        <div className="cf-page-header-status">
          <span className="duty-dot-pulse" aria-hidden="true" />
          <span><small>Field sync</small><strong>Active now</strong></span>
        </div>
      </header>

      <section className="cf-jobs-stat-grid" aria-label="Assigned jobs summary">
        {summaryItems.map((item) => (
          <article className="cf-job-stat-card" key={item.label}>
            <span className={`cf-job-stat-dot cf-job-stat-dot-${item.tone}`} aria-hidden="true" />
            <span><small>{item.label}</small><strong>{item.value}</strong></span>
            <span className={`cf-job-stat-icon cf-job-stat-icon-${item.tone}`}>
              <AssignedJobsSummaryIcon type={item.icon} />
            </span>
          </article>
        ))}
      </section>

      <section className="cf-workspace-card" aria-labelledby="assigned-jobs-workspace-title">
        <header className="cf-workspace-heading">
          <div>
            <span className="cf-widget-kicker">Operational queue</span>
            <h2 id="assigned-jobs-workspace-title">Job Workspace</h2>
            <p>Filter assignments and open the next service task.</p>
          </div>
          <span className="cf-count-pill">{filteredJobs.length} shown</span>
        </header>

        <div className="cf-jobs-toolbar jobs-toolbar">
          <div className="cf-jobs-tabs">
            <span className="cf-toolbar-label">Timeframe</span>
            <FilterTabs
              activeTab={activeTab}
              onTabChange={(tab) => setActiveTab(tab)}
              counts={tabCounts}
            />
          </div>

          <div className="assigned-jobs-filter-controls cf-job-filter-controls">
            <div className="assigned-jobs-toolbar-field assigned-jobs-search-field">
              <label htmlFor="assigned-jobs-search">Search jobs</label>
              <div className="search-input-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="search-icon" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="assigned-jobs-search"
                  type="text"
                  className="form-control search-input"
                  placeholder="Job ID, customer, service..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label="Search assigned jobs"
                />
                {searchQuery && (
                  <button type="button" className="search-clear-btn" onClick={() => setSearchQuery('')} aria-label="Clear search">
                    &times;
                  </button>
                )}
              </div>
            </div>

            <div className="assigned-jobs-toolbar-field assigned-jobs-status-field">
              <label htmlFor="assigned-jobs-status">Status</label>
              <select
                id="assigned-jobs-status"
                className="form-select status-select-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by job status"
              >
                <option value="ALL">All Statuses</option>
                <option value="In Progress">In Progress</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="cf-jobs-results">
          <div className="assigned-jobs-table-view d-none d-lg-block">
            <div className="table-responsive">
              <table className="table job-table mb-0">
                <thead>
                  <tr>
                    <th scope="col" className="ps-4">JOB ID</th>
                    <th scope="col">CUSTOMER</th>
                    <th scope="col">SERVICE &amp; EQUIPMENT</th>
                    <th scope="col">DATE &amp; TIME</th>
                    <th scope="col">STATUS</th>
                    <th scope="col" className="text-end pe-4">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length > 0 ? (
                    filteredJobs.map((job) => (
                      <JobRow
                        key={job.id}
                        job={job}
                        onView={openJobDetails}
                        onPrimaryAction={openJobDetails}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6">
                        <div className="cf-empty-state">
                          <span aria-hidden="true">⌕</span>
                          <h3>No assigned jobs found</h3>
                          <p>
                            {searchQuery || statusFilter !== 'ALL'
                              ? 'No jobs match your active search and filter criteria.'
                              : 'You have no scheduled jobs in this selected timeframe.'}
                          </p>
                          {(searchQuery || statusFilter !== 'ALL' || activeTab !== 'all') && (
                            <button type="button" className="cf-button cf-button-secondary" onClick={resetFilters}>
                              Reset Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="assigned-jobs-mobile-view d-lg-none">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onView={openJobDetails}
                  onPrimaryAction={openJobDetails}
                />
              ))
            ) : (
              <div className="cf-empty-state">
                <span aria-hidden="true">⌕</span>
                <h3>No assigned jobs found</h3>
                <p>Try adjusting your search or active filters.</p>
                <button type="button" className="cf-button cf-button-secondary" onClick={resetFilters}>
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="cf-workspace-footer jobs-card-footer">
          <span>Showing <strong>{filteredJobs.length}</strong> of <strong>{jobs.length}</strong> assigned jobs</span>
          <span className="d-none d-sm-flex"><span className="duty-dot-pulse" aria-hidden="true" /> Field sync active</span>
        </footer>
      </section>

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

export default TechnicianAssignedJobs
