import React from 'react'

/**
 * Reusable JobStatusBadge component
 * Supports 'Upcoming', 'In Progress', 'Completed' statuses with polished color-coded pill styling.
 */
function JobStatusBadge({ status, className = '' }) {
  const getBadgeConfig = (statusStr) => {
    switch (statusStr?.toLowerCase()) {
      case 'in progress':
      case 'inprogress':
        return {
          label: 'In Progress',
          bgClass: 'status-badge-in-progress',
          dotClass: 'status-dot-in-progress',
        }
      case 'upcoming':
        return {
          label: 'Upcoming',
          bgClass: 'status-badge-upcoming',
          dotClass: 'status-dot-upcoming',
        }
      case 'completed':
        return {
          label: 'Completed',
          bgClass: 'status-badge-completed',
          dotClass: 'status-dot-completed',
        }
      default:
        return {
          label: statusStr || 'Unknown',
          bgClass: 'status-badge-default',
          dotClass: 'status-dot-default',
        }
    }
  }

  const { label, bgClass, dotClass } = getBadgeConfig(status)

  return (
    <span className={`job-status-badge ${bgClass} ${className}`}>
      <span className={`status-dot ${dotClass}`} aria-hidden="true" />
      {label}
    </span>
  )
}

export default JobStatusBadge
