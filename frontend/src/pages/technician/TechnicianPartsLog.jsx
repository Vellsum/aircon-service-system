// =============================================================================
// TechnicianPartsLog.jsx — Parts Log connected to backend
//
// FIXES:
//   1. Replaced static selectors with live API fetch
//   2. Fetches from /api/technician/reports/parts-log
//   3. Joins serviceReport → jobInventory → inventoryItem data
//   4. Added loading state and error handling
// =============================================================================

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import Modal from 'react-bootstrap/Modal'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'

const API_BASE_URL = 'http://localhost:5000'

const dateFormatter = new Intl.DateTimeFormat('en-SG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function formatBookingDate(record) {
  if (record.formattedDate) return record.formattedDate
  if (!record.bookingDate) return '—'
  const date = new Date(`${record.bookingDate}T00:00:00`)
  return Number.isNaN(date.getTime()) ? record.bookingDate : dateFormatter.format(date)
}

function SummaryIcon({ type }) {
  if (type === 'reports') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    )
  }
  if (type === 'items') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    </svg>
  )
}

function ViewDetailsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

function ReferenceValue({ value }) {
  return value === null || value === undefined || value === '' ? '—' : value
}

function TechnicianPartsLog() {
  const { loading: contextLoading } = useTechnicianWorkflow()

  // ---- Fetch parts log from API ----
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPartsLog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token') || ''
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const techId = storedUser.technician_ID || storedUser.id || storedUser.user_ID || 1
      const res = await fetch(
        `${API_BASE_URL}/api/technician/reports/parts-log?techId=${techId}`,
        { headers }
      )

      if (!res.ok) throw new Error(`API returned ${res.status}`)

      const data = await res.json()

      if (data.success && Array.isArray(data.records)) {
        // Format dates for display
        const formatted = data.records.map((r) => ({
          ...r,
          formattedDate: formatBookingDate(r),
        }))
        setRecords(formatted)
      } else {
        setRecords([])
      }
    } catch (err) {
      console.error('[PartsLog] Fetch error:', err)
      setError(err.message)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPartsLog()
  }, [fetchPartsLog])

  // ---- Filters ----
  const [searchQuery, setSearchQuery] = useState('')
  const [itemTypeFilter, setItemTypeFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedReportID, setSelectedReportID] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)

  const itemTypes = useMemo(
    () => Array.from(new Set(records.map((r) => r.itemType).filter(Boolean))).sort(),
    [records],
  )

  const metrics = useMemo(() => ({
    usageRecords: records.length,
    reportsWithParts: new Set(records.map((r) => r.reportID)).size,
    uniqueItems: new Set(records.map((r) => r.itemID)).size,
  }), [records])

  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return records.filter((record) => {
      if (itemTypeFilter !== 'ALL' && record.itemType !== itemTypeFilter) return false
      if (dateFrom && (!record.bookingDate || record.bookingDate < dateFrom)) return false
      if (dateTo && (!record.bookingDate || record.bookingDate > dateTo)) return false
      if (!normalizedQuery) return true

      return [
        record.itemName, record.itemID, record.reportID,
        record.jobID, record.displayJobCode, record.customerName, record.serviceName,
      ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery))
    })
  }, [dateFrom, dateTo, itemTypeFilter, records, searchQuery])

  const reportGroups = useMemo(() => {
    const grouped = new Map()
    filteredRecords.forEach((record) => {
      if (!grouped.has(record.reportID)) {
        grouped.set(record.reportID, { reportID: record.reportID, context: record, records: [] })
      }
      grouped.get(record.reportID).records.push(record)
    })
    return Array.from(grouped.values())
  }, [filteredRecords])

  const activeReport =
    reportGroups.find((r) => r.reportID === selectedReportID) || reportGroups[0] || null

  const hasActiveFilters = Boolean(searchQuery.trim() || itemTypeFilter !== 'ALL' || dateFrom || dateTo)

  const resetFilters = () => {
    setSearchQuery('')
    setItemTypeFilter('ALL')
    setDateFrom('')
    setDateTo('')
  }

  const summaryItems = [
    { label: 'Usage Records', value: metrics.usageRecords },
    { label: 'Reports With Parts', value: metrics.reportsWithParts },
    { label: 'Unique Items', value: metrics.uniqueItems },
  ]

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <div className="technician-parts-log-page">
      <header className="cf-page-header parts-log-page-header">
        <div className="cf-page-heading">
          <span className="cf-eyebrow">TECHNICIAN · PARTS LOG</span>
          <h1>Parts Log</h1>
          <p>Review inventory items recorded against completed service reports.</p>
        </div>
        <dl className="parts-log-inline-metrics" aria-label="Parts usage summary">
          {summaryItems.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ---- Filters ---- */}
      <section className="parts-log-utility-bar" aria-label="Parts log filters">
        <div className="parts-log-toolbar">
          <div className="parts-log-field parts-log-search-field">
            <label htmlFor="parts-log-search">Search parts log</label>
            <div className="parts-log-search-control">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="parts-log-search"
                type="search"
                value={searchQuery}
                placeholder="Item, report, job, customer, service..."
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear parts log search">
                  &times;
                </button>
              )}
            </div>
          </div>

          <div className="parts-log-field parts-log-type-field">
            <label htmlFor="parts-log-item-type">Item type</label>
            <select
              id="parts-log-item-type"
              value={itemTypeFilter}
              onChange={(event) => setItemTypeFilter(event.target.value)}
            >
              <option value="ALL">All item types</option>
              {itemTypes.map((itemType) => (
                <option value={itemType} key={itemType}>{itemType}</option>
              ))}
            </select>
          </div>

          <fieldset className="parts-log-date-range">
            <legend>Date range</legend>
            <div className="parts-log-date-range-controls">
              <div className="parts-log-field parts-log-date-field">
                <label htmlFor="parts-log-date-from">From</label>
                <input id="parts-log-date-from" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="parts-log-field parts-log-date-field">
                <label htmlFor="parts-log-date-to">To</label>
                <input id="parts-log-date-to" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </fieldset>

          <div className="parts-log-toolbar-actions">
            <div className="parts-log-filter-result" aria-live="polite">
              <strong>{filteredRecords.length}</strong>
              <span>of {records.length} usage records</span>
            </div>
            {hasActiveFilters && (
              <button type="button" className="cf-button cf-button-quiet parts-log-reset-button" onClick={resetFilters}>
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ---- Error State ---- */}
      {error && (
        <div style={{ padding: '16px 24px', background: '#fff3f3', border: '1px solid #fcc', borderRadius: '8px', margin: '16px 0', color: '#c33' }}>
          <strong>⚠️ API Error:</strong> {error}
          <button type="button" onClick={fetchPartsLog} style={{ marginLeft: '12px', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {/* ---- Loading State ---- */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
          <p>Loading parts usage records from database...</p>
        </div>
      ) : records.length === 0 ? (
        /* ---- Empty State ---- */
        <div className="parts-log-empty-state" role="status">
          <span aria-hidden="true"><SummaryIcon type="items" /></span>
          <h3>No parts usage records available.</h3>
          <p>Inventory references will appear here when service reports include recorded items.</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="parts-log-empty-state" role="status">
          <span aria-hidden="true"><SummaryIcon type="items" /></span>
          <h3>No parts usage records match your filters.</h3>
          <p>Reset the filters to review all recorded inventory usage.</p>
          <button type="button" className="cf-button cf-button-secondary" onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
      ) : (
        /* ---- Parts Ledger ---- */
        <section className="parts-log-ledger" aria-labelledby="parts-log-ledger-title">
          <aside className="parts-log-report-panel" aria-label="Service reports with recorded parts">
            <header className="parts-log-panel-header">
              <div>
                <span className="cf-widget-kicker">Service reports</span>
                <h2 id="parts-log-ledger-title">Parts usage ledger</h2>
              </div>
              <span>{reportGroups.length} reports</span>
            </header>

            <div className="parts-log-report-list">
              {reportGroups.map((report) => {
                const { context } = report
                const isActive = activeReport?.reportID === report.reportID
                return (
                  <button
                    type="button"
                    className={`parts-log-report-row${isActive ? ' is-active' : ''}`}
                    key={report.reportID}
                    aria-pressed={isActive}
                    onClick={() => setSelectedReportID(report.reportID)}
                  >
                    <span className="parts-log-report-row-topline">
                      <strong>Report #{report.reportID}</strong>
                      <span>{report.records.length} {report.records.length === 1 ? 'item' : 'items'}</span>
                    </span>
                    <span className="parts-log-report-service">{context.serviceName || 'Service not available'}</span>
                    <span className="parts-log-report-customer">{context.customerName || 'Customer not available'}</span>
                    <span className="parts-log-report-row-meta">
                      <span>{formatBookingDate(context)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{context.displayJobCode || context.jobID || 'Job unavailable'}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>

          {activeReport && (
            <section className="parts-log-detail-panel" aria-labelledby="parts-log-selected-report-title">
              <header className="parts-log-detail-header">
                <div className="parts-log-detail-heading">
                  <span className="parts-log-relationship-path">
                    Service Report <b aria-hidden="true">→</b> Linked Inventory Items
                  </span>
                  <div className="parts-log-detail-title-row">
                    <h2 id="parts-log-selected-report-title">Report #{activeReport.reportID}</h2>
                    {activeReport.context.jobStatus && (
                      <JobStatusBadge status={activeReport.context.jobStatus} />
                    )}
                  </div>
                  <p className="parts-log-detail-service">
                    {activeReport.context.displayJobCode || activeReport.context.jobID || 'Job unavailable'}
                    <span aria-hidden="true"> · </span>
                    {activeReport.context.serviceName || 'Service not available'}
                  </p>
                  <dl className="parts-log-detail-context">
                    <div><dt>Customer</dt><dd>{activeReport.context.customerName || 'Customer not available'}</dd></div>
                    <div><dt>Date</dt><dd>{formatBookingDate(activeReport.context)}</dd></div>
                    <div><dt>Location</dt><dd>{activeReport.context.location || 'Location not available'}</dd></div>
                  </dl>
                </div>
              </header>

              <div className="parts-log-items-heading">
                <div>
                  <span className="cf-widget-kicker">Linked inventory</span>
                  <h3>Parts used in this report</h3>
                </div>
                <span>{activeReport.records.length} inventory {activeReport.records.length === 1 ? 'record' : 'records'}</span>
              </div>

              <div className="parts-log-item-ledger">
                {activeReport.records.map((record) => (
                  <article className="parts-log-item-row" key={`${record.reportID}:${record.itemID}`}>
                    <div className="parts-log-item-identity">
                      <h4>{record.itemName}</h4>
                      <span>Item #{record.itemID}</span>
                      <p>{record.itemDescription || 'No item description available.'}</p>
                    </div>
                    <div className="parts-log-item-type">
                      <span>Type</span>
                      <strong>{record.itemType || '—'}</strong>
                    </div>
                    <div className="parts-log-item-stock">
                      <span>Current inventory stock</span>
                      <strong>{record.currentStock ?? '—'}</strong>
                    </div>
                    <button
                      type="button"
                      className="parts-log-record-details"
                      aria-label={`View record details for ${record.itemName} in report ${record.reportID}`}
                      onClick={() => setSelectedRecord(record)}
                    >
                      <ViewDetailsIcon />
                      <span>Record details</span>
                    </button>
                  </article>
                ))}
              </div>

              <footer className="parts-log-detail-footer">
                <span>Current stock reflects the latest available inventory information, not stock at service time.</span>
              </footer>
            </section>
          )}
        </section>
      )}

      {/* ---- Detail Modal ---- */}
      <Modal
        show={Boolean(selectedRecord)}
        onHide={() => setSelectedRecord(null)}
        centered
        scrollable
        contentClassName="parts-log-details-modal"
        aria-labelledby="parts-log-details-title"
      >
        {selectedRecord && (
          <>
            <Modal.Header closeButton className="parts-log-modal-header">
              <div>
                <span className="cf-eyebrow">Inventory usage record</span>
                <Modal.Title id="parts-log-details-title">{selectedRecord.itemName}</Modal.Title>
                <p>Item #{selectedRecord.itemID} · Report #{selectedRecord.reportID}</p>
              </div>
            </Modal.Header>
            <Modal.Body className="parts-log-modal-body">
              <section className="parts-log-modal-section" aria-labelledby="parts-log-inventory-title">
                <header>
                  <span className="parts-log-modal-section-icon"><SummaryIcon type="items" /></span>
                  <div><span>Inventory reference</span><h3 id="parts-log-inventory-title">Item Information</h3></div>
                </header>
                <dl className="parts-log-modal-grid">
                  <div><dt>Item name</dt><dd>{selectedRecord.itemName}</dd></div>
                  <div><dt>Item ID</dt><dd>{selectedRecord.itemID}</dd></div>
                  <div><dt>Item type</dt><dd>{selectedRecord.itemType || '—'}</dd></div>
                  <div><dt>Qty used</dt><dd>{selectedRecord.quantityUsed ?? '—'}</dd></div>
                  <div><dt>Unit cost</dt><dd>{selectedRecord.unitCost ? `$${Number(selectedRecord.unitCost).toFixed(2)}` : '—'}</dd></div>
                  <div><dt>Current stock</dt><dd>{selectedRecord.currentStock ?? '—'} <small>current inventory</small></dd></div>
                  <div className="parts-log-modal-wide"><dt>Description</dt><dd>{selectedRecord.itemDescription || '—'}</dd></div>
                </dl>
              </section>

              <section className="parts-log-modal-section" aria-labelledby="parts-log-service-reference-title">
                <header>
                  <span className="parts-log-modal-section-icon"><SummaryIcon type="reports" /></span>
                  <div><span>Linked service work</span><h3 id="parts-log-service-reference-title">Service Reference</h3></div>
                </header>
                <dl className="parts-log-modal-grid">
                  <div><dt>Report ID</dt><dd><ReferenceValue value={selectedRecord.reportID} /></dd></div>
                  <div><dt>Job</dt><dd>{selectedRecord.displayJobCode || <ReferenceValue value={selectedRecord.jobID} />}</dd></div>
                  <div><dt>Job ID</dt><dd><ReferenceValue value={selectedRecord.jobID} /></dd></div>
                  <div><dt>Booking ID</dt><dd><ReferenceValue value={selectedRecord.bookingID} /></dd></div>
                  <div><dt>Technician ID</dt><dd><ReferenceValue value={selectedRecord.technicianID} /></dd></div>
                  <div><dt>Job status</dt><dd>{selectedRecord.jobStatus ? <JobStatusBadge status={selectedRecord.jobStatus} /> : '—'}</dd></div>
                </dl>
              </section>

              <section className="parts-log-modal-section" aria-labelledby="parts-log-context-title">
                <header>
                  <span className="parts-log-modal-section-icon"><SummaryIcon type="usage" /></span>
                  <div><span>Booking context</span><h3 id="parts-log-context-title">Service Context</h3></div>
                </header>
                <dl className="parts-log-modal-grid">
                  <div><dt>Customer</dt><dd>{selectedRecord.customerName || '—'}</dd></div>
                  <div><dt>Service</dt><dd>{selectedRecord.serviceName || '—'}</dd></div>
                  <div><dt>Service date</dt><dd>{formatBookingDate(selectedRecord)}</dd></div>
                  <div><dt>Time</dt><dd>{selectedRecord.bookingTime || '—'}</dd></div>
                  <div className="parts-log-modal-wide"><dt>Location</dt><dd>{selectedRecord.location || '—'}</dd></div>
                </dl>
              </section>
            </Modal.Body>
            <Modal.Footer className="parts-log-modal-footer">
              <button type="button" className="cf-button cf-button-secondary" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  )
}

export default TechnicianPartsLog