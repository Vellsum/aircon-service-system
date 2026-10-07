// =============================================================================
// TechnicianSubmitReport.jsx
// Updated: 6 Oct 2026 — slimmed + flow fix
//   1. [FLOW FIX] Jobs eligible for reporting are now 'In Progress' and
//      'Completed' (was effectively Completed-only via context's reportableJobs).
//      This unblocks the required flow: Start → submit report → Complete.
//   2. [FIX] Inventory items are fetched from /api/admin/inventory. The old
//      require() of technicianSelectors never worked under Vite (ESM), so the
//      materials table silently had no items.
//   3. [TRIM] Draft save/load simplified (~150 lines → ~15). Same storage key;
//      old drafts are discarded safely if they don't match the new shape.
//   4. Payload shape UNCHANGED — backend already accepts it.
// =============================================================================

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from 'react-bootstrap/Modal'

import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import ServiceChecklist from '../../components/technician/ServiceChecklist'
import PartsMaterialsTable from '../../components/technician/PartsMaterialsTable'
import FollowUpSection, {
  FOLLOW_UP_REASON_OPTIONS,
} from '../../components/technician/FollowUpSection'

const DRAFT_STORAGE_KEY = 'aircon-care-technician-report-draft'
const API_BASE_URL = 'http://localhost:5000'

const OVERALL_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Requires Follow-Up']
const FINDING_OPTIONS = [
  'Dirty / clogged filter', 'Weak airflow', 'Water leakage / drainage issue',
  'Unusual noise / vibration', 'Refrigerant issue', 'Electrical issue',
  'Cooling performance issue', 'No abnormal issue found', 'Other',
]
const ACTION_OPTIONS = [
  'Cleaned coil', 'Cleared drainage', 'Refrigerant top-up',
  'Replaced / adjusted component', 'Other',
]
const NO_ABNORMAL_FINDING = 'No abnormal issue found'

const currencyFormatter = new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' })

// -----------------------------------------------------------------------------
// Draft helpers (simplified 6 Oct 2026)
// -----------------------------------------------------------------------------
function createInitialReport() {
  return {
    selectedJobId: '',
    findings: [],
    findingsOther: '',
    actionsTaken: [],
    actionsOther: '',
    overallCondition: '',
    internalNotes: '',
    checklist: {},
    materials: [],
    followUp: { required: 'no', reasons: [], otherReason: '', date: '', priority: 'Normal' },
    completionDateTime: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
      .toISOString().slice(0, 16),
    customerAcknowledged: false,
  }
}

function loadLocalDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null')
    // Shallow-merge a saved draft over defaults; arrays/objects must be the right type
    if (!saved || typeof saved !== 'object') return createInitialReport()
    const base = createInitialReport()
    const merged = { ...base }
    for (const key of Object.keys(base)) {
      const v = saved[key]
      if (v === undefined || v === null) continue
      if (Array.isArray(base[key])) { if (Array.isArray(v)) merged[key] = v; continue }
      if (typeof base[key] === 'object') { if (typeof v === 'object' && !Array.isArray(v)) merged[key] = { ...base[key], ...v }; continue }
      if (typeof base[key] === typeof v) merged[key] = v
    }
    return merged
  } catch {
    return createInitialReport()
  }
}

function calculateMaterialsTotal(materials) {
  return materials.reduce((total, row) => {
    const q = Number(row.quantity), c = Number(row.unitCost)
    return Number.isFinite(q) && Number.isFinite(c) && q > 0 && c >= 0 ? total + q * c : total
  }, 0)
}

// Payload — 6 Oct 2026: shape UNCHANGED (backend accepts this)
function buildReportPayload(report, selectedJob, inventoryById) {
  return {
    job_ID: selectedJob?.job_ID || selectedJob?.id || report.selectedJobId,
    findings: report.findings,
    findingsOther: report.findingsOther || null,
    actionsTaken: report.actionsTaken,
    actionsOther: report.actionsOther || null,
    overallCondition: report.overallCondition,
    checklistItems: Object.entries(report.checklist).filter(([, c]) => c === true).map(([id]) => id),
    materials: report.materials.map((row) => ({
      itemID: row.itemID,
      itemName: inventoryById.get(row.itemID)?.itemName || '',
      quantity: Number(row.quantity),
      unitCost: Number(row.unitCost),
    })),
    materialsTotal: calculateMaterialsTotal(report.materials),
    followUpRequired: report.followUp.required === 'yes',
    followUpReasons: report.followUp.required === 'yes' ? report.followUp.reasons : [],
    followUpOtherReason: report.followUp.otherReason || null,
    followUpDate: report.followUp.required === 'yes' ? report.followUp.date : null,
    followUpPriority: report.followUp.required === 'yes' ? report.followUp.priority : null,
    completionDateTime: report.completionDateTime,
    customerAcknowledged: report.customerAcknowledged,
    internalNotes: report.internalNotes || null,
  }
}

// -----------------------------------------------------------------------------
// Multi-select field
// -----------------------------------------------------------------------------
function ReportMultiSelectField({ name, legend, options, values, error, onToggle, otherValue, onOtherChange, otherPlaceholder }) {
  const otherSelected = values.includes('Other')
  return (
    <fieldset className="report-multi-select report-field-full" aria-required="true" aria-invalid={Boolean(error)}>
      <legend className="report-label">{legend} <span aria-hidden="true">*</span></legend>
      <p className="report-choice-hint">Select all that apply.</p>
      <div className="service-checklist-grid">
        {options.map((option, index) => {
          const optionId = `${name}-option-${index}`
          return (
            <label className="service-checklist-item" htmlFor={optionId} key={option}>
              <input id={optionId} type="checkbox" checked={values.includes(option)} onChange={() => onToggle(option)} />
              <span>{option}</span>
            </label>
          )
        })}
      </div>
      {otherSelected && (
        <div className="report-other-details">
          <label className="report-label" htmlFor={`${name}-other`}>
            Other details <span className="report-optional-label">(optional)</span>
          </label>
          <input id={`${name}-other`} type="text" className="report-control" value={otherValue}
            placeholder={otherPlaceholder} onChange={(e) => onOtherChange(e.target.value)} />
        </div>
      )}
      {error && <span className="report-field-error">{error}</span>}
    </fieldset>
  )
}

// =============================================================================
// Main Component
// =============================================================================
function TechnicianSubmitReport() {
  const navigate = useNavigate()
  // 6 Oct 2026 [FLOW FIX]: use assignedJobs and filter HERE — In Progress jobs
  // are the normal moment to write the report (required before Complete).
  const { assignedJobs } = useTechnicianWorkflow()

  const [report, setReport] = useState(loadLocalDraft)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 6 Oct 2026: inventory from the backend (replaces the broken require())
  const [inventoryItems, setInventoryItems] = useState([])
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const token = localStorage.getItem('token') || ''
        const res = await fetch(`${API_BASE_URL}/api/admin/inventory`, {
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        const data = await res.json()
        // Accept { items: [...] } or a raw array, depending on the endpoint
        const rows = Array.isArray(data) ? data : (data.items || data.inventory || [])
        if (alive && Array.isArray(rows)) {
          setInventoryItems(rows.map((r) => ({
            itemID: r.itemID ?? r.item_id,
            itemName: r.itemName ?? r.item_name,
            price: r.price ?? 0,
          })).filter((r) => r.itemID != null))
        }
      } catch { /* materials stay optional if inventory is unreachable */ }
    })()
    return () => { alive = false }
  }, [])
  const inventoryById = useMemo(() => new Map(inventoryItems.map((i) => [i.itemID, i])), [inventoryItems])

  // 6 Oct 2026: THE eligibility rule — In Progress first, Completed allowed (late reports)
  const reportableJobs = useMemo(
    () => assignedJobs.filter((job) => ['In Progress', 'Completed'].includes(job.status)),
    [assignedJobs],
  )

  const selectedJob = useMemo(
    () => reportableJobs.find((job) => job.id === report.selectedJobId) || null,
    [report.selectedJobId, reportableJobs],
  )
  const materialsTotal = useMemo(() => calculateMaterialsTotal(report.materials), [report.materials])

  // ---- Form updaters ----
  const updateReportField = (field, value) => {
    setReport((r) => ({ ...r, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
    setNotice(null)
  }

  const updateChecklist = (checkId, checked) => {
    setReport((r) => ({ ...r, checklist: { ...r.checklist, [checkId]: checked } }))
    setNotice(null)
  }

  const toggleReportOption = (field, option, otherField) => {
    setReport((r) => {
      const current = Array.isArray(r[field]) ? r[field] : []
      const isSelected = current.includes(option)
      let next = isSelected ? current.filter((o) => o !== option) : [...current, option]
      if (field === 'findings' && !isSelected) {
        next = option === NO_ABNORMAL_FINDING
          ? [NO_ABNORMAL_FINDING]
          : next.filter((o) => o !== NO_ABNORMAL_FINDING)
      }
      const nextReport = { ...r, [field]: next }
      if ((option === 'Other' && isSelected) || (field === 'findings' && option === NO_ABNORMAL_FINDING && !isSelected)) {
        nextReport[otherField] = ''
      }
      return nextReport
    })
    setErrors((e) => ({ ...e, [field]: undefined }))
    setNotice(null)
  }

  // ---- Validation ----
  const validateReport = () => {
    const next = {}
    if (!report.selectedJobId || !selectedJob) next.selectedJobId = 'Select a job before continuing.'
    if (!report.findings.length) next.findings = 'Select at least one finding or observation.'
    if (!report.actionsTaken.length) next.actionsTaken = 'Select at least one action completed during the service.'
    if (!report.overallCondition) next.overallCondition = 'Select the overall AC condition.'

    const matErr = {}
    report.materials.forEach((row) => {
      const rowErr = {}
      const q = Number(row.quantity), c = Number(row.unitCost)
      if (!inventoryById.has(row.itemID)) rowErr.itemID = 'Select an inventory item.'
      if (row.quantity === '' || !Number.isFinite(q) || q <= 0 || !Number.isInteger(q)) rowErr.quantity = 'Use a whole quantity greater than 0.'
      if (row.unitCost === '' || !Number.isFinite(c) || c < 0) rowErr.unitCost = 'Enter a cost of 0 or more.'
      if (Object.keys(rowErr).length) matErr[row.id] = rowErr
    })
    if (Object.keys(matErr).length) next.materials = matErr

    if (report.followUp.required === 'yes') {
      const fu = {}
      if (!report.followUp.reasons.length) fu.reasons = 'Select at least one reason for the follow-up.'
      if (!report.followUp.date) fu.date = 'Choose a recommended follow-up date.'
      if (Object.keys(fu).length) next.followUp = fu
    }

    setErrors(next)
    if (Object.keys(next).length) {
      setNotice({ type: 'error', message: 'Review the highlighted fields before submitting the report.' })
      return false
    }
    return true
  }

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(report))
      setNotice({ type: 'info', message: 'Draft saved in this browser only.' })
    } catch {
      setNotice({ type: 'error', message: 'This browser could not save the draft locally.' })
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setNotice(null)
    if (validateReport()) setShowConfirmation(true)
  }

  const confirmSubmission = async () => {
    if (submitting) return
    setSubmitting(true)
    setShowConfirmation(false)
    try {
      const payload = buildReportPayload(report, selectedJob, inventoryById)
      const token = localStorage.getItem('token') || ''
      const response = await fetch(`${API_BASE_URL}/api/technician/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || errData.message || `Server returned ${response.status}: ${response.statusText}`)
      }
      const result = await response.json()
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      setNotice({ type: 'success', message: `Service report submitted successfully. Report ID: ${result.report_ID || 'N/A'}` })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => navigate('/technician/assigned-jobs'), 2000)
    } catch (error) {
      console.error('[TechnicianSubmitReport] Submission error:', error)
      setNotice({ type: 'error', message: `Submission failed: ${error.message}. Your report draft is preserved — try again.` })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => navigate('/technician/assigned-jobs')

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="technician-submit-report-page cf-report-page">
      <header className="cf-page-header cf-report-header">
        <div>
          <span className="cf-eyebrow">Service workflow · report before completion</span>
          <h1>Submit Service Report</h1>
          <p>
            Record service outcomes, checks performed, materials used, and customer acknowledgement.
            Reports are submitted while the job is <strong>In Progress</strong> — required before it can be completed.
          </p>
        </div>
        <div className="cf-report-progress" aria-label="Service report workflow">
          <span><b>1</b> Job</span>
          <i aria-hidden="true" />
          <span><b>2</b> Service</span>
          <i aria-hidden="true" />
          <span><b>3</b> Review</span>
        </div>
      </header>

      {notice && (
        <div className={`report-notice report-notice-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.message}
        </div>
      )}

      <form className="service-report-form cf-report-workspace" onSubmit={handleSubmit} noValidate>
        <div className="report-layout-grid cf-report-layout">
          <main className="report-main-column cf-report-main">

            {/* ---- 01: Job Selection ---- */}
            <section className="report-section report-job-section report-job-selection-section cf-report-card" aria-labelledby="job-selection-title">
              <div className="report-section-heading report-workflow-heading">
                <div>
                  <span className="cf-card-step">01</span>
                  <h3 id="job-selection-title">Job Selection</h3>
                  <p>Choose the In Progress assignment this report belongs to (Completed jobs also listed for late reports).</p>
                </div>
                {/* 6 Oct 2026: badge now reflects the real rule */}
                <span className="report-eligibility-badge">
                  <span aria-hidden="true" /> In Progress &amp; Completed jobs
                </span>
              </div>
              <div className="report-job-selector-block">
                <div className="report-field">
                  <label className="report-label" htmlFor="assigned-job">
                    Select Job <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="assigned-job"
                    className="report-control"
                    value={report.selectedJobId}
                    onChange={(event) => updateReportField('selectedJobId', event.target.value)}
                    aria-required="true"
                    aria-invalid={Boolean(errors.selectedJobId)}
                  >
                    <option value="">Choose a job</option>
                    {reportableJobs.map((job) => (
                      <option value={job.id} key={job.id}>
                        {job.id} · {job.status} · {job.customerName} · {job.serviceType} · {job.formattedDate}
                      </option>
                    ))}
                  </select>
                  {errors.selectedJobId && (
                    <span className="report-field-error" id="assigned-job-error">{errors.selectedJobId}</span>
                  )}
                </div>
                {selectedJob && (
                  <div className="selected-job-summary" aria-live="polite">
                    <div className="selected-job-summary-header">
                      <div>
                        <span className="job-id-chip">{selectedJob.id}</span>
                        <strong>{selectedJob.customerName}</strong>
                      </div>
                      <JobStatusBadge status={selectedJob.status} />
                    </div>
                    <dl className="selected-job-details">
                      <div><dt>Service type</dt><dd>{selectedJob.serviceType}</dd></div>
                      <div><dt>Scheduled</dt><dd>{selectedJob.formattedDate} · {selectedJob.time}</dd></div>
                      <div><dt>Service address</dt><dd>{selectedJob.address}{selectedJob.postalCode ? ` · S${selectedJob.postalCode}` : ''}</dd></div>
                      <div><dt>Equipment / AC units</dt><dd>{selectedJob.unitType || 'Not specified'}</dd></div>
                    </dl>
                  </div>
                )}
              </div>
            </section>

            {/* ---- 02: Inspection & Findings ---- */}
            <section className="report-section report-workflow-section cf-report-card cf-inspection-card" aria-labelledby="service-report-title">
              <div className="report-section-heading">
                <div>
                  <span className="cf-card-step">02</span>
                  <h3 id="service-report-title">Inspection &amp; Findings</h3>
                  <p>Record the observed condition before documenting completed work.</p>
                </div>
              </div>
              <div className="report-fields-grid cf-inspection-fields">
                <ReportMultiSelectField
                  name="report-findings"
                  legend="Findings & Observations"
                  options={FINDING_OPTIONS}
                  values={report.findings}
                  error={errors.findings}
                  onToggle={(option) => toggleReportOption('findings', option, 'findingsOther')}
                  otherValue={report.findingsOther}
                  onOtherChange={(value) => updateReportField('findingsOther', value)}
                  otherPlaceholder="Add any finding not covered above."
                />
                <div className="report-field">
                  <label className="report-label" htmlFor="overall-condition">
                    Overall AC Condition <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="overall-condition"
                    className="report-control"
                    value={report.overallCondition}
                    onChange={(event) => updateReportField('overallCondition', event.target.value)}
                    aria-required="true"
                    aria-invalid={Boolean(errors.overallCondition)}
                  >
                    <option value="">Select condition</option>
                    {OVERALL_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.overallCondition && <span className="report-field-error">{errors.overallCondition}</span>}
                </div>
              </div>
            </section>

            {/* ---- 03: Work Performed ---- */}
            <section className="report-section cf-report-card cf-work-performed-card" aria-labelledby="work-performed-title">
              <div className="report-section-heading">
                <div>
                  <span className="cf-card-step">03</span>
                  <h3 id="work-performed-title">Work Performed</h3>
                  <p>Capture completed actions, timing, and any internal service context.</p>
                </div>
              </div>
              <div className="report-fields-grid cf-work-performed-fields">
                <ReportMultiSelectField
                  name="actions-taken"
                  legend="Actions Taken"
                  options={ACTION_OPTIONS}
                  values={report.actionsTaken}
                  error={errors.actionsTaken}
                  onToggle={(option) => toggleReportOption('actionsTaken', option, 'actionsOther')}
                  otherValue={report.actionsOther}
                  onOtherChange={(value) => updateReportField('actionsOther', value)}
                  otherPlaceholder="Add any action not covered above."
                />
                <div className="report-field report-completion-date-field">
                  <label className="report-label" htmlFor="completion-date-time">Service completion date / time</label>
                  <input
                    id="completion-date-time"
                    className="report-control"
                    type="datetime-local"
                    value={report.completionDateTime}
                    onChange={(event) => updateReportField('completionDateTime', event.target.value)}
                  />
                </div>
                <div className="report-field report-field-full">
                  <label className="report-label" htmlFor="internal-notes">
                    Internal Notes <span className="report-optional-label">(optional)</span>
                  </label>
                  <textarea
                    id="internal-notes"
                    className="report-control"
                    rows="3"
                    value={report.internalNotes}
                    placeholder="Add internal context that should not form part of the customer-facing report."
                    onChange={(event) => updateReportField('internalNotes', event.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* ---- Parts & Materials (hidden if inventory unreachable — materials are optional) ---- */}
            {inventoryItems.length > 0 ? (
              <div className="report-component-slot report-materials-slot cf-report-card cf-materials-card">
                <PartsMaterialsTable
                  rows={report.materials}
                  inventoryItems={inventoryItems}
                  errors={errors.materials}
                  onChange={(materials) => updateReportField('materials', materials)}
                />
              </div>
            ) : (
              <div className="report-component-slot report-materials-slot cf-report-card" style={{ padding: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                  Parts &amp; materials: inventory list is currently unavailable, so material lines are disabled.
                  You can still submit the report without materials.
                </p>
              </div>
            )}
          </main>

          {/* ---- Sidebar ---- */}
          <aside className="report-support-column cf-report-rail" aria-label="Report completion and follow-up">
            <div className="report-component-slot report-checklist-slot cf-report-side-card">
              <ServiceChecklist values={report.checklist} onChange={updateChecklist} />
            </div>
            <div className="report-component-slot report-follow-up-slot cf-report-side-card">
              <FollowUpSection value={report.followUp} errors={errors.followUp}
                onChange={(followUp) => updateReportField('followUp', followUp)} />
            </div>

            <section className="report-section report-completion-section cf-report-side-card" aria-labelledby="completion-information-title">
              <div className="report-section-heading">
                <div>
                  <h3 id="completion-information-title">Completion Information</h3>
                  <p>Confirm whether the customer reviewed the completed work and report summary.</p>
                </div>
              </div>
              <div className="report-fields-grid">
                <div className="report-field">
                  <label className="customer-acknowledgement">
                    <input
                      type="checkbox"
                      checked={report.customerAcknowledged}
                      onChange={(event) => updateReportField('customerAcknowledged', event.target.checked)}
                    />
                    <span>
                      <strong>Customer acknowledgement</strong>
                      <small>The customer has reviewed the completed work and report summary.</small>
                    </span>
                  </label>
                </div>
              </div>
            </section>

            <div className="report-form-actions cf-report-action-dock">
              <div>
                <strong>Ready to finish?</strong>
                <span>Save a local draft or submit the report to the server.</span>
              </div>
              <button type="button" className="cf-button cf-button-secondary" onClick={handleSaveDraft}>Save Draft</button>
              <button type="button" className="cf-button cf-button-quiet" onClick={handleCancel}>Cancel</button>
              <button type="submit" className="cf-button cf-button-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </aside>
        </div>
      </form>

      {/* ---- Confirmation Modal ---- */}
      <Modal show={showConfirmation} onHide={() => setShowConfirmation(false)} centered contentClassName="report-confirmation-modal">
        <Modal.Header closeButton>
          <Modal.Title>Confirm service report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">Review the report details before submitting to the server.</p>
          <dl className="report-confirmation-summary">
            <div><dt>Job</dt><dd>{selectedJob?.id} · {selectedJob?.customerName}</dd></div>
            <div><dt>Overall condition</dt><dd>{report.overallCondition}</dd></div>
            <div><dt>Materials total</dt><dd>{currencyFormatter.format(materialsTotal)}</dd></div>
            <div><dt>Follow-up required</dt><dd>{report.followUp.required === 'yes' ? `Yes — ${report.followUp.priority} priority` : 'No'}</dd></div>
            <div><dt>Customer acknowledged</dt><dd>{report.customerAcknowledged ? 'Yes' : 'No'}</dd></div>
          </dl>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setShowConfirmation(false)}>Continue Editing</button>
          <button type="button" className="btn btn-primary" onClick={confirmSubmission} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Confirm Submit'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default TechnicianSubmitReport