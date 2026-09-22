// =============================================================================
// TechnicianSubmitReport.jsx
// Technician Service Report Submission — connected to backend API
//
// FIXES APPLIED:
//   1. confirmSubmission now POSTs to backend /api/technician/reports
//   2. Added submission loading state to prevent double-submit
//   3. Removed "backend not connected" warnings
//   4. Proper error handling on API failure
//   5. Redirects to assigned-jobs page after successful submission
// =============================================================================

import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from 'react-bootstrap/Modal'

import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import ServiceChecklist from '../../components/technician/ServiceChecklist'
import PartsMaterialsTable from '../../components/technician/PartsMaterialsTable'
import FollowUpSection, {
  FOLLOW_UP_REASON_OPTIONS,
} from '../../components/technician/FollowUpSection'

// ---- Config ----
const DRAFT_STORAGE_KEY = 'aircon-care-technician-report-draft'
const API_BASE_URL = 'http://localhost:5000'

// Inventory items: try selector, fallback to empty array
let AVAILABLE_INVENTORY_ITEMS = []
try {
  const selectors = require('./data/technicianSelectors')
  AVAILABLE_INVENTORY_ITEMS = (selectors.selectCurrentInventoryItems?.() || [])
} catch {
  AVAILABLE_INVENTORY_ITEMS = []
}

const INVENTORY_ITEM_BY_ID = new Map(
  AVAILABLE_INVENTORY_ITEMS.map((item) => [item.itemID, item]),
)
const INVENTORY_ITEM_ID_BY_NAME = new Map(
  AVAILABLE_INVENTORY_ITEMS.map((item) => [item.itemName.trim().toLowerCase(), item.itemID]),
)

const currencyFormatter = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
})

// ---- Constants for validation ----
const OVERALL_CONDITIONS = new Set([
  'Excellent',
  'Good',
  'Fair',
  'Poor',
  'Requires Follow-Up',
])
const FINDING_OPTIONS = Object.freeze([
  'Dirty / clogged filter',
  'Weak airflow',
  'Water leakage / drainage issue',
  'Unusual noise / vibration',
  'Refrigerant issue',
  'Electrical issue',
  'Cooling performance issue',
  'No abnormal issue found',
  'Other',
])
const ACTION_OPTIONS = Object.freeze([
  'Cleaned coil',
  'Cleared drainage',
  'Refrigerant top-up',
  'Replaced / adjusted component',
  'Other',
])
const NO_ABNORMAL_FINDING = 'No abnormal issue found'
const FINDING_OPTION_SET = new Set(FINDING_OPTIONS)
const ACTION_OPTION_SET = new Set(ACTION_OPTIONS)
const FOLLOW_UP_REASON_SET = new Set(FOLLOW_UP_REASON_OPTIONS)
const FOLLOW_UP_PRIORITIES = new Set(['Low', 'Normal', 'High'])
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

// =============================================================================
// Sanitizer helpers (unchanged — these are pure functions for draft recovery)
// =============================================================================
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function sanitizeString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function sanitizeNumericInput(value) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function sanitizeChecklist(value) {
  if (!isPlainObject(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([checkId, checked]) => [checkId, checked === true]),
  )
}

function sanitizeOptionSelections(value, allowedOptions) {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(value.filter((option) => typeof option === 'string' && allowedOptions.has(option))),
  )
}

function restoreOptionState(selectionValue, otherValue, legacyTextValue, allowedOptions) {
  const selections = sanitizeOptionSelections(selectionValue, allowedOptions)
  const legacyText = sanitizeString(legacyTextValue).trim()
  let other = sanitizeString(otherValue)
  if (legacyText) {
    if (!selections.includes('Other')) selections.push('Other')
    if (!other.trim()) other = legacyText
  }
  return { selections, other }
}

function sanitizeInventoryItemId(value, legacyItemName) {
  const normalizedValue =
    typeof value === 'number' && Number.isInteger(value)
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : null
  if (INVENTORY_ITEM_BY_ID.has(normalizedValue)) return normalizedValue
  const normalizedLegacyName = sanitizeString(legacyItemName).trim().toLowerCase()
  return INVENTORY_ITEM_ID_BY_NAME.get(normalizedLegacyName) ?? ''
}

function sanitizeMaterials(value) {
  if (!Array.isArray(value)) return []
  const usedIds = new Set()
  return value.filter(isPlainObject).map((row, index) => {
    const savedId = sanitizeString(row.id).trim()
    const baseId = savedId || `draft-material-${index + 1}`
    let id = baseId
    let duplicateIndex = 2
    while (usedIds.has(id)) {
      id = `${baseId}-${duplicateIndex}`
      duplicateIndex += 1
    }
    usedIds.add(id)
    return {
      id,
      itemID: sanitizeInventoryItemId(row.itemID, row.itemName),
      quantity: sanitizeNumericInput(row.quantity),
      unitCost: sanitizeNumericInput(row.unitCost),
    }
  })
}

function getLocalDateTimeValue() {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 16)
}

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
    followUp: {
      required: 'no',
      reasons: [],
      otherReason: '',
      date: '',
      priority: 'Normal',
    },
    completionDateTime: getLocalDateTimeValue(),
    customerAcknowledged: false,
  }
}

function loadLocalDraft(reportableJobs) {
  const initialReport = createInitialReport()
  if (typeof window === 'undefined') return initialReport
  try {
    const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!savedDraft) return initialReport
    const parsedDraft = JSON.parse(savedDraft)
    if (!isPlainObject(parsedDraft)) return initialReport
    const savedJobId = sanitizeString(parsedDraft.selectedJobId)
    const selectedJobId = reportableJobs.some((job) => job.id === savedJobId) ? savedJobId : ''
    const savedCondition = sanitizeString(parsedDraft.overallCondition)
    const savedFollowUp = isPlainObject(parsedDraft.followUp) ? parsedDraft.followUp : {}
    const followUpRequired = savedFollowUp.required === 'yes' ? 'yes' : 'no'
    const savedPriority = sanitizeString(savedFollowUp.priority)
    const savedFollowUpDate = sanitizeString(savedFollowUp.date)
    const savedCompletionDateTime = sanitizeString(parsedDraft.completionDateTime)
    const restoredFindings = restoreOptionState(parsedDraft.findings, parsedDraft.findingsOther, parsedDraft.findings, FINDING_OPTION_SET)
    const restoredActions = restoreOptionState(parsedDraft.actionsTaken, parsedDraft.actionsOther, parsedDraft.actionsTaken, ACTION_OPTION_SET)
    const restoredFollowUpReasons = restoreOptionState(savedFollowUp.reasons, savedFollowUp.otherReason, savedFollowUp.reason, FOLLOW_UP_REASON_SET)
    return {
      ...initialReport,
      selectedJobId,
      findings: restoredFindings.selections,
      findingsOther: restoredFindings.other,
      actionsTaken: restoredActions.selections,
      actionsOther: restoredActions.other,
      overallCondition: OVERALL_CONDITIONS.has(savedCondition) ? savedCondition : '',
      internalNotes: sanitizeString(parsedDraft.internalNotes),
      checklist: sanitizeChecklist(parsedDraft.checklist),
      materials: sanitizeMaterials(parsedDraft.materials),
      followUp: {
        required: followUpRequired,
        reasons: restoredFollowUpReasons.selections,
        otherReason: restoredFollowUpReasons.other,
        date: DATE_PATTERN.test(savedFollowUpDate) ? savedFollowUpDate : '',
        priority: FOLLOW_UP_PRIORITIES.has(savedPriority) ? savedPriority : 'Normal',
      },
      completionDateTime: DATE_TIME_PATTERN.test(savedCompletionDateTime) ? savedCompletionDateTime : initialReport.completionDateTime,
      customerAcknowledged: parsedDraft.customerAcknowledged === true,
    }
  } catch {
    return initialReport
  }
}

function calculateMaterialsTotal(materials) {
  return materials.reduce((total, row) => {
    const quantity = Number(row.quantity)
    const unitCost = Number(row.unitCost)
    if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return total
    if (quantity <= 0 || unitCost < 0) return total
    return total + quantity * unitCost
  }, 0)
}

// =============================================================================
// Helper: Build the payload that gets sent to the backend
// Maps frontend form state → backend API expected format
// =============================================================================
function buildReportPayload(report, selectedJob) {
  return {
    // Job reference
    job_ID: selectedJob?.job_ID || selectedJob?.id || report.selectedJobId,

    // Findings & observations
    findings: report.findings,
    findingsOther: report.findingsOther || null,

    // Actions taken
    actionsTaken: report.actionsTaken,
    actionsOther: report.actionsOther || null,

    // Overall condition
    overallCondition: report.overallCondition,

    // Service checklist (object → array of checked items)
    checklistItems: Object.entries(report.checklist)
      .filter(([, checked]) => checked === true)
      .map(([checkId]) => checkId),

    // Materials/parts used
    materials: report.materials.map((row) => ({
      itemID: row.itemID,
      itemName: INVENTORY_ITEM_BY_ID.get(row.itemID)?.itemName || '',
      quantity: Number(row.quantity),
      unitCost: Number(row.unitCost),
    })),

    // Materials total cost (calculated server-side too, but send for reference)
    materialsTotal: calculateMaterialsTotal(report.materials),

    // Follow-up details
    followUpRequired: report.followUp.required === 'yes',
    followUpReasons: report.followUp.required === 'yes' ? report.followUp.reasons : [],
    followUpOtherReason: report.followUp.otherReason || null,
    followUpDate: report.followUp.required === 'yes' ? report.followUp.date : null,
    followUpPriority: report.followUp.required === 'yes' ? report.followUp.priority : null,

    // Completion info
    completionDateTime: report.completionDateTime,
    customerAcknowledged: report.customerAcknowledged,

    // Internal notes (not customer-facing)
    internalNotes: report.internalNotes || null,
  }
}

// =============================================================================
// Multi-Select Field component (unchanged)
// =============================================================================
function ReportMultiSelectField({
  name, legend, options, values, error, onToggle,
  otherValue, onOtherChange, otherPlaceholder,
}) {
  const hintId = `${name}-hint`
  const errorId = `${name}-error`
  const otherSelected = values.includes('Other')

  return (
    <fieldset
      className="report-multi-select report-field-full"
      aria-required="true"
      aria-invalid={Boolean(error)}
      aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}`}
      tabIndex={error ? -1 : undefined}
    >
      <legend className="report-label">
        {legend} <span aria-hidden="true">*</span>
      </legend>
      <p className="report-choice-hint" id={hintId}>Select all that apply.</p>
      <div className="service-checklist-grid">
        {options.map((option, index) => {
          const optionId = `${name}-option-${index}`
          return (
            <label className="service-checklist-item" htmlFor={optionId} key={option}>
              <input
                id={optionId}
                type="checkbox"
                checked={values.includes(option)}
                onChange={() => onToggle(option)}
              />
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
          <input
            id={`${name}-other`}
            type="text"
            className="report-control"
            value={otherValue}
            placeholder={otherPlaceholder}
            onChange={(event) => onOtherChange(event.target.value)}
          />
        </div>
      )}
      {error && (
        <span className="report-field-error" id={errorId}>{error}</span>
      )}
    </fieldset>
  )
}

// =============================================================================
// Main Component
// =============================================================================
function TechnicianSubmitReport() {
  const navigate = useNavigate()
  const { reportableJobs } = useTechnicianWorkflow()
  const [report, setReport] = useState(() => loadLocalDraft(reportableJobs))
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // NEW: Track submission state to prevent double-submit
  const [submitting, setSubmitting] = useState(false)

  const selectedJob = useMemo(
    () => reportableJobs.find((job) => job.id === report.selectedJobId) || null,
    [report.selectedJobId, reportableJobs],
  )

  const materialsTotal = useMemo(
    () => calculateMaterialsTotal(report.materials),
    [report.materials],
  )

  // ---- Form updaters (unchanged) ----
  const updateReportField = (field, value) => {
    setReport((currentReport) => ({ ...currentReport, [field]: value }))
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }))
    setNotice(null)
  }

  const updateChecklist = (checkId, checked) => {
    setReport((currentReport) => ({
      ...currentReport,
      checklist: { ...currentReport.checklist, [checkId]: checked },
    }))
    setNotice(null)
  }

  const toggleReportOption = (field, option, otherField) => {
    setReport((currentReport) => {
      const currentSelections = Array.isArray(currentReport[field]) ? currentReport[field] : []
      const isSelected = currentSelections.includes(option)
      let nextSelections = isSelected
        ? currentSelections.filter((selection) => selection !== option)
        : [...currentSelections, option]

      if (field === 'findings' && !isSelected) {
        nextSelections =
          option === NO_ABNORMAL_FINDING
            ? [NO_ABNORMAL_FINDING]
            : nextSelections.filter((selection) => selection !== NO_ABNORMAL_FINDING)
      }

      const nextReport = { ...currentReport, [field]: nextSelections }
      if ((option === 'Other' && isSelected) || (field === 'findings' && option === NO_ABNORMAL_FINDING && !isSelected)) {
        nextReport[otherField] = ''
      }
      return nextReport
    })
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }))
    setNotice(null)
  }

  const updateMaterials = (materials) => {
    setReport((currentReport) => ({ ...currentReport, materials }))
    setErrors((currentErrors) => ({ ...currentErrors, materials: undefined }))
    setNotice(null)
  }

  const updateFollowUp = (followUp) => {
    setReport((currentReport) => ({ ...currentReport, followUp }))
    setErrors((currentErrors) => ({ ...currentErrors, followUp: undefined }))
    setNotice(null)
  }

  // ---- Validation (unchanged) ----
  const validateReport = () => {
    const nextErrors = {}

    if (!report.selectedJobId || !selectedJob) {
      nextErrors.selectedJobId = 'Select an assigned job before continuing.'
    }
    if (!Array.isArray(report.findings) || report.findings.length === 0) {
      nextErrors.findings = 'Select at least one finding or observation.'
    }
    if (!Array.isArray(report.actionsTaken) || report.actionsTaken.length === 0) {
      nextErrors.actionsTaken = 'Select at least one action completed during the service.'
    }
    if (!report.overallCondition) {
      nextErrors.overallCondition = 'Select the overall AC condition.'
    }

    const materialErrors = {}
    report.materials.forEach((row) => {
      const rowErrors = {}
      const quantity = Number(row.quantity)
      const unitCost = Number(row.unitCost)
      if (!INVENTORY_ITEM_BY_ID.has(row.itemID)) {
        rowErrors.itemID = 'Select an inventory item.'
      }
      if (row.quantity === '' || !Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        rowErrors.quantity = 'Use a whole quantity greater than 0.'
      }
      if (row.unitCost === '' || !Number.isFinite(unitCost) || unitCost < 0) {
        rowErrors.unitCost = 'Enter a cost of 0 or more.'
      }
      if (Object.keys(rowErrors).length > 0) {
        materialErrors[row.id] = rowErrors
      }
    })
    if (Object.keys(materialErrors).length > 0) {
      nextErrors.materials = materialErrors
    }

    if (report.followUp.required === 'yes') {
      const followUpErrors = {}
      if (!Array.isArray(report.followUp.reasons) || report.followUp.reasons.length === 0) {
        followUpErrors.reasons = 'Select at least one reason for the follow-up.'
      }
      if (!report.followUp.date) {
        followUpErrors.date = 'Choose a recommended follow-up date.'
      }
      if (Object.keys(followUpErrors).length > 0) {
        nextErrors.followUp = followUpErrors
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setNotice({ type: 'error', message: 'Review the highlighted fields before submitting the report.' })
      window.setTimeout(() => { document.querySelector('[aria-invalid="true"]')?.focus() }, 0)
      return false
    }
    return true
  }

  // ---- Save Draft (unchanged) ----
  const handleSaveDraft = () => {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(report))
      setNotice({ type: 'info', message: 'Draft saved in this browser only.' })
    } catch {
      setNotice({ type: 'error', message: 'This browser could not save the draft locally.' })
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setNotice(null)
    if (validateReport()) {
      setShowConfirmation(true)
    }
  }

  // =====================================================================
  // FIX: confirmSubmission now POSTs to the backend API
  // Previously: just showed a fake success message
  // Now: builds payload, sends to /api/technician/reports, handles response
  // =====================================================================
  const confirmSubmission = async () => {
    // Prevent double-submit
    if (submitting) return
    setSubmitting(true)
    setShowConfirmation(false)

    try {
      // Build the payload from form state
      const payload = buildReportPayload(report, selectedJob)

      // Get auth token
      const token = localStorage.getItem('token') || ''

      // POST to backend API
      const response = await fetch(`${API_BASE_URL}/api/technician/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `Server returned ${response.status}: ${response.statusText}`
        )
      }

      const result = await response.json()

      // Clear the local draft on successful submission
      window.localStorage.removeItem(DRAFT_STORAGE_KEY)

      // Show success notice
      setNotice({
        type: 'success',
        message: `Service report submitted successfully. Report ID: ${result.report_ID || 'N/A'}`,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })

      // Redirect to assigned jobs after a short delay so user sees the success message
      setTimeout(() => {
        navigate('/technician/assigned-jobs')
      }, 2000)

    } catch (error) {
      console.error('[TechnicianSubmitReport] Submission error:', error)
      setNotice({
        type: 'error',
        message: `Submission failed: ${error.message}. Your report draft is preserved — try again.`,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/technician/assigned-jobs')
  }

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="technician-submit-report-page cf-report-page">
      <header className="cf-page-header cf-report-header">
        <div>
          <span className="cf-eyebrow">Completed job workflow</span>
          <h1>Submit Service Report</h1>
          <p>
            Record service outcomes, checks performed, materials used, and customer acknowledgement.
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
        <div
          className={`report-notice report-notice-${notice.type}`}
          role={notice.type === 'error' ? 'alert' : 'status'}
        >
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
                  <p>Choose the completed assignment this report belongs to.</p>
                </div>
                <span className="report-eligibility-badge">
                  <span aria-hidden="true" /> Completed jobs only
                </span>
              </div>
              <div className="report-job-selector-block">
                <div className="report-field">
                  <label className="report-label" htmlFor="assigned-job">
                    Select Completed Job <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="assigned-job"
                    className="report-control"
                    value={report.selectedJobId}
                    onChange={(event) => updateReportField('selectedJobId', event.target.value)}
                    aria-required="true"
                    aria-invalid={Boolean(errors.selectedJobId)}
                    aria-describedby={errors.selectedJobId ? 'assigned-job-error' : undefined}
                  >
                    <option value="">Choose a completed job</option>
                    {reportableJobs.map((job) => (
                      <option value={job.id} key={job.id}>
                        {job.id} · {job.customerName} · {job.serviceType} · {job.formattedDate}
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
                    aria-describedby={errors.overallCondition ? 'overall-condition-error' : undefined}
                  >
                    <option value="">Select condition</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Requires Follow-Up">Requires Follow-Up</option>
                  </select>
                  {errors.overallCondition && (
                    <span className="report-field-error" id="overall-condition-error">{errors.overallCondition}</span>
                  )}
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
                  <label className="report-label" htmlFor="completion-date-time">
                    Service completion date / time
                  </label>
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

            {/* ---- Parts & Materials ---- */}
            <div className="report-component-slot report-materials-slot cf-report-card cf-materials-card">
              <PartsMaterialsTable
                rows={report.materials}
                inventoryItems={AVAILABLE_INVENTORY_ITEMS}
                errors={errors.materials}
                onChange={updateMaterials}
              />
            </div>
          </main>

          {/* ---- Sidebar: Checklist + Follow-up + Completion ---- */}
          <aside className="report-support-column cf-report-rail" aria-label="Report completion and follow-up">
            <div className="report-component-slot report-checklist-slot cf-report-side-card">
              <ServiceChecklist values={report.checklist} onChange={updateChecklist} />
            </div>
            <div className="report-component-slot report-follow-up-slot cf-report-side-card">
              <FollowUpSection value={report.followUp} errors={errors.followUp} onChange={updateFollowUp} />
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
              <button type="button" className="cf-button cf-button-secondary" onClick={handleSaveDraft}>
                Save Draft
              </button>
              <button type="button" className="cf-button cf-button-quiet" onClick={handleCancel}>
                Cancel
              </button>
              {/* FIX: Disable submit button while submission is in progress */}
              <button type="submit" className="cf-button cf-button-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </aside>
        </div>
      </form>

      {/* ---- Confirmation Modal ---- */}
      <Modal
        show={showConfirmation}
        onHide={() => setShowConfirmation(false)}
        centered
        contentClassName="report-confirmation-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm service report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            Review the report details before submitting to the server.
          </p>
          <dl className="report-confirmation-summary">
            <div>
              <dt>Job</dt>
              <dd>{selectedJob?.id} · {selectedJob?.customerName}</dd>
            </div>
            <div>
              <dt>Overall condition</dt>
              <dd>{report.overallCondition}</dd>
            </div>
            <div>
              <dt>Materials total</dt>
              <dd>{currencyFormatter.format(materialsTotal)}</dd>
            </div>
            <div>
              <dt>Follow-up required</dt>
              <dd>{report.followUp.required === 'yes' ? `Yes — ${report.followUp.priority} priority` : 'No'}</dd>
            </div>
            <div>
              <dt>Customer acknowledged</dt>
              <dd>{report.customerAcknowledged ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
          {/* FIX: Removed "Backend integration is not connected" warning */}
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowConfirmation(false)}
          >
            Continue Editing
          </button>
          {/* FIX: Disable confirm button during submission */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={confirmSubmission}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Confirm Submit'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default TechnicianSubmitReport