import React, { useState, useMemo } from 'react'
import { selectCurrentTechnicianJobViewModels } from "../../data/technician/technicianSelectors";
import FilterTabs from '../../components/technician/FilterTabs'
import JobRow from '../../components/technician/JobRow'
import JobCard from '../../components/technician/JobCard'
import JobDetailsModal from '../../components/technician/JobDetailsModal'

const isTodayJob = (job) => job.timeframe === 'today' || job.date === '2026-07-29'
const isThisWeekJob = (job) =>
  job.timeframe === 'today' || job.timeframe === 'this-week'

/**
 * TechnicianAssignedJobs Page Component
 * Refined enterprise-grade Assigned Jobs dashboard.
 */
function TechnicianAssignedJobs() {
  const [jobs] = useState(() => selectCurrentTechnicianJobViewModels())
  const [activeTab, setActiveTab] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedJob, setSelectedJob] = useState(null)

  // Calculate dynamic tab counts based on dataset
  const tabCounts = useMemo(() => {
    return {
      today: jobs.filter(isTodayJob).length,
      thisWeek: jobs.filter(isThisWeekJob).length,
      all: jobs.length,
    }
  }, [jobs])

  // Summary KPI counts for top strip
  const metrics = useMemo(() => {
    const todayJobs = jobs.filter(isTodayJob)
    return {
      todayCount: todayJobs.length,
      inProgressCount: jobs.filter((j) => j.status === 'In Progress').length,
      upcomingCount: jobs.filter((j) => j.status === 'Upcoming').length,
      completedCount: jobs.filter((j) => j.status === 'Completed').length,
    }
  }, [jobs])

  // Filter jobs based on active tab, search query, and status dropdown
  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return jobs.filter((job) => {
      // 1. Timeframe Tab filtering
      if (activeTab === 'today') {
        if (!isTodayJob(job)) return false
      } else if (activeTab === 'this-week') {
        if (!isThisWeekJob(job)) return false
      }

      // 2. Status Dropdown filtering
      if (statusFilter !== 'ALL' && job.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false
      }

      // 3. Search query filtering (by ID, customer, service, equipment, or address)
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

  return (
    <div className="technician-page-content technician-assigned-jobs-page">
      {/* Page Title Header */}
      <header className="assigned-jobs-header">
        <div>
          <div className="page-kicker">TECHNICIAN FIELD OPS</div>
          <h2 className="page-title">Assigned Jobs</h2>
          <p className="page-subtitle">
            Review, track, and execute your scheduled air conditioning maintenance tasks.
          </p>
        </div>
      </header>

      {/* KPI / Metric Summary Cards */}
      <section className="assigned-jobs-summary" aria-label="Assigned jobs summary">
        <div className="assigned-jobs-summary-item">
          <div className="kpi-icon-box kpi-icon-today">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="assigned-jobs-summary-copy">
            <div className="kpi-stat-label">Today's Jobs</div>
            <div className="kpi-stat-value">{metrics.todayCount}</div>
          </div>
        </div>

        <div className="assigned-jobs-summary-item">
          <div className="kpi-icon-box kpi-icon-progress">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
          </div>
          <div className="assigned-jobs-summary-copy">
            <div className="kpi-stat-label">In Progress</div>
            <div className="kpi-stat-value">{metrics.inProgressCount}</div>
          </div>
        </div>

        <div className="assigned-jobs-summary-item">
          <div className="kpi-icon-box kpi-icon-upcoming">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <div className="assigned-jobs-summary-copy">
            <div className="kpi-stat-label">Upcoming</div>
            <div className="kpi-stat-value">{metrics.upcomingCount}</div>
          </div>
        </div>

        <div className="assigned-jobs-summary-item">
          <div className="kpi-icon-box kpi-icon-completed">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="assigned-jobs-summary-copy">
            <div className="kpi-stat-label">Completed</div>
            <div className="kpi-stat-value">{metrics.completedCount}</div>
          </div>
        </div>
      </section>

      {/* Main Jobs Card Section */}
      <div className="jobs-main-card">
        {/* Card Toolbar: Segmented Control on Left, Search & Filters on Right */}
        <div className="jobs-toolbar">
          <FilterTabs
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            counts={tabCounts}
          />

          <div className="assigned-jobs-filter-controls">
            {/* Search Input with Clear Button */}
            <div className="search-input-wrapper">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="search-icon"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="form-control form-control-sm search-input"
                placeholder="Search job, customer, unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <select
              className="form-select form-select-sm status-select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by job status"
            >
              <option value="ALL">All Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Content View: Desktop Data Grid */}
        <div className="assigned-jobs-table-view d-none d-md-block">
          <div className="table-responsive">
            <table className="table job-table mb-0">
              <thead>
                <tr>
                  <th scope="col" className="ps-4" style={{ width: '130px' }}>JOB ID</th>
                  <th scope="col" style={{ width: '260px' }}>CUSTOMER</th>
                  <th scope="col">SERVICE & EQUIPMENT</th>
                  <th scope="col" style={{ width: '190px' }}>DATE & TIME</th>
                  <th scope="col" style={{ width: '140px' }}>STATUS</th>
                  <th scope="col" className="text-end pe-4" style={{ width: '110px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      onView={(j) => setSelectedJob(j)}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="empty-state-box">
                        <div className="empty-state-icon-wrap mb-3">📋</div>
                        <h6 className="fw-bold mb-1">No assigned jobs found</h6>
                        <p className="text-muted small mb-3">
                          {searchQuery || statusFilter !== 'ALL'
                            ? 'No jobs match your active search and filter criteria.'
                            : 'You have no scheduled jobs in this selected timeframe.'}
                        </p>
                        {(searchQuery || statusFilter !== 'ALL' || activeTab !== 'all') && (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm px-3"
                            onClick={() => {
                              setSearchQuery('')
                              setStatusFilter('ALL')
                              setActiveTab('all')
                            }}
                          >
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

        {/* Content View: Mobile Responsive Cards */}
        <div className="assigned-jobs-mobile-view d-md-none">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onView={(j) => setSelectedJob(j)}
              />
            ))
          ) : (
            <div className="text-center py-5">
              <div className="empty-state-icon-wrap mb-3">📋</div>
              <h6 className="fw-bold mb-1">No assigned jobs found</h6>
              <p className="text-muted small mb-3">
                Try adjusting your search or active filters.
              </p>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm px-3"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('ALL')
                  setActiveTab('all')
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Card Footer: Summary & Sync Status */}
        <div className="jobs-card-footer">
          <span className="text-muted small">
            Showing <strong className="text-dark">{filteredJobs.length}</strong> of{' '}
            <strong className="text-dark">{jobs.length}</strong> total assigned jobs
          </span>
          <span className="text-muted small d-none d-sm-flex align-items-center gap-2">
            <span className="duty-dot-pulse" style={{ width: '5px', height: '5px' }} />
            <span>Field sync active</span>
          </span>
        </div>
      </div>

      {/* Interactive Job Details Modal */}
      <JobDetailsModal
        show={Boolean(selectedJob)}
        job={selectedJob}
        onHide={() => setSelectedJob(null)}
      />
    </div>
  )
}

export default TechnicianAssignedJobs
