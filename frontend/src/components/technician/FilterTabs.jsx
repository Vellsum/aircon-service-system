import React from 'react'

/**
 * FilterTabs Component
 * Displays tabs for "Today", "This Week", and "All" with active pill highlighting and count chips.
 */
function FilterTabs({ activeTab, onTabChange, counts = {} }) {
  const tabs = [
    { id: 'today', label: 'Today', count: counts.today ?? 0 },
    { id: 'this-week', label: 'This Week', count: counts.thisWeek ?? 0 },
    { id: 'all', label: 'All', count: counts.all ?? 0 },
  ]

  return (
    <div className="filter-tabs-container" role="tablist" aria-label="Job schedule filters">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`filter-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span>{tab.label}</span>
            <span className={`tab-count-badge ${isActive ? 'active' : ''}`}>
              {tab.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default FilterTabs
