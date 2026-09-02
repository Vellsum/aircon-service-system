import React, { useState, useMemo } from 'react'
import { MOCK_JOBS } from './mockJobs'
import FilterTabs from '../../components/technician/FilterTabs'
import JobRow from '../../components/technician/JobRow'
import JobCard from '../../components/technician/JobCard'
import JobDetailsModal from '../../components/technician/JobDetailsModal'

/**
 * TechnicianAssignedJobs Page Component
 * Refined enterprise-grade Assigned Jobs dashboard.
 */
function TechnicianAssignedJobs() {
  const [jobs] = useState(MOCK_JOBS)
  const [activeTab, setActiveTab] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedJob, setSelectedJob] = useState(null)

  // Calculate dynamic tab counts based on dataset
  const tabCounts = useMemo(() => {
    return {
      today: jobs.filter((j) => j.timeframe === 'today' || j.date === '2026-07-29').length,
      thisWeek: jobs.filter(
        (j) => j.timeframe === 'today' || j.timeframe === 'this-week' || j.date.startsWith('2026-07')
      ).length,
      all: jobs.length,
    }
  }, [jobs])

  // Summary KPI counts for top strip
  const metrics = useMemo(() => {
    const todayJobs = jobs.filter((j) => j.timeframe === 'today' || j.date === '2026-07-29')
    return {
      todayCount: todayJobs.length,
      inProgressCount: jobs.filter((j) => j.status === 'In Progress').length,
      upcomingCount: jobs.filter((j) => j.status === 'Upcoming').length,
      completedCount: jobs.filter((j) => j.status === 'Completed').length,
    }
  }, [jobs])

  // Filter jobs based on active tab, search query, and status dropdown
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // 1. Timeframe Tab filtering
      if (activeTab === 'today') {
        const isToday = job.timeframe === 'today' || job.date === '2026-07-29'
        if (!isToday) return false
      } else if (activeTab === 'this-week') {
        const isThisWeek = job.timeframe === 'today' || job.timeframe === 'this-week'
        if (!isThisWeek) return false
      }

      // 2. Status Dropdown filtering
      if (statusFilter !== 'ALL' && job.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false
      }

      // 3. Search query filtering (by ID, Customer name, Service type, or Address)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase()
        const matchesId = job.id.toLowerCase().includes(q)
        const matchesCustomer = job.customerName.toLowerCase().includes(q)
        const matchesService = job.serviceType.toLowerCase().includes(q)
        const matchesAddress = job.address.toLowerCase().includes(q)
        return matchesId || matchesCustomer || matchesService || matchesAddress
      }

      return true
    })
  }, [jobs, activeTab, statusFilter, searchQuery])

  return (
    <div className="technician-page-content">
      {/* Page Title Header */}
      <div className="page-header-container mb-4">
        <div className="page-kicker">TECHNICIAN FIELD OPS</div>
        <h2 className="page-title">Assigned Jobs</h2>
        <p className="page-subtitle mb-0">
          Review, track, and execute your scheduled air conditioning maintenance tasks.
        </p>
      </div>

      {/* KPI / Metric Summary Cards */}
      <div className="row g-3 mb-4">
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
              <div className="kpi-stat-value">{metrics.todayCount}</div>
              <div className="kpi-stat-label">Today's Jobs</div>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="kpi-card-wrapper kpi-card-progress">
            <div className="kpi-icon-box kpi-icon-progress">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 14 14"/>
              </svg>
            </div>
            <div>
              <div className="kpi-stat-value">{metrics.inProgressCount}</div>
              <div className="kpi-stat-label">In Progress</div>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="kpi-card-wrapper kpi-card-upcoming">
            <div className="kpi-icon-box kpi-icon-upcoming">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>
            <div>
              <div className="kpi-stat-value">{metrics.upcomingCount}</div>
              <div className="kpi-stat-label">Upcoming</div>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="kpi-card-wrapper kpi-card-completed">
            <div className="kpi-icon-box kpi-icon-completed">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div>
              <div className="kpi-stat-value">{metrics.completedCount}</div>
              <div className="kpi-stat-label">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Jobs Card Section */}
      <div className="jobs-main-card">
        {/* Card Toolbar: Segmented Control on Left, Search & Filters on Right */}
        <div className="jobs-toolbar d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 p-3 p-md-4 border-bottom">
          <FilterTabs
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            counts={tabCounts}
          />

          <div className="d-flex flex-wrap align-items-center gap-2">
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
        <div className="d-none d-md-block">
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
        <div className="d-md-none p-3">
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
        <div className="jobs-card-footer d-flex align-items-center justify-content-between px-3 px-md-4 py-3 border-top bg-light-subtle">
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
