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

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from 'react-bootstrap/Modal'

import { useTechnicianWorkflow } from '../../context/TechnicianWorkflowContext'
import { useAuth } from '../../context/AuthContext'
import JobStatusBadge from '../../components/technician/JobStatusBadge'
import ServiceChecklist from '../../components/technician/ServiceChecklist'
import FollowUpSection, {
  FOLLOW_UP_REASON_OPTIONS,
} from '../../components/technician/FollowUpSection'

// ---- Config ----
const DRAFT_STORAGE_KEY = 'aircon-care-technician-report-draft'
const API_BASE_URL = 'http://localhost:5000'

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

function loadLocalDraft() {
  const initialReport = createInitialReport()
  if (typeof window === 'undefined') return initialReport
  try {
    const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!savedDraft) return initialReport
    const parsedDraft = JSON.parse(savedDraft)
    if (!isPlainObject(parsedDraft)) return initialReport
    const selectedJobId = sanitizeString(parsedDraft.selectedJobId)
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
      // There is no Technician-safe inventory catalogue endpoint yet, so
      // draft material rows cannot be validated and must not be resubmitted.
      materials: [],
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

// =============================================================================
// Helper: Build the payload that gets sent to the backend
// Maps frontend form state → backend API expected format
// =============================================================================
function buildReportPayload(report, selectedJob) {
  return {
    // Job reference
    job_ID: selectedJob.job_ID,

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

    // The current partsUsed contract persists only reportID + itemID. No
    // Technician-safe inventory catalogue is available, so no item IDs can
    // be selected or truthfully submitted from this page yet.
    materials: [],

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
  const {
    reportableJobs,
    loading: jobsLoading,
    error: jobsError,
    dataAvailable: jobsDataAvailable,
    refreshJobs,
  } = useTechnicianWorkflow()
  const { user, token } = useAuth()
  const technicianID = user?.technician_ID ?? null
  const [report, setReport] = useState(loadLocalDraft)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // NEW: Track submission state to prevent double-submit
  const [submitting, setSubmitting] = useState(false)
  const [submittedReportID, setSubmittedReportID] = useState(null)

  const jobsReady = Boolean(technicianID) && jobsDataAvailable && !jobsLoading
  const hasReportableJobs = jobsReady && reportableJobs.length > 0

  const selectedJob = useMemo(
    () => reportableJobs.find((job) => job.id === report.selectedJobId) || null,
    [report.selectedJobId, reportableJobs],
  )

  useEffect(() => {
    if (!jobsReady || jobsError) return
    setReport((currentReport) => {
      if (!currentReport.selectedJobId || reportableJobs.some((job) => job.id === currentReport.selectedJobId)) {
        return currentReport
      }
      return { ...currentReport, selectedJobId: '' }
    })
  }, [jobsReady, jobsError, reportableJobs])

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

  const updateFollowUp = (followUp) => {
    setReport((currentReport) => ({ ...currentReport, followUp }))
    setErrors((currentErrors) => ({ ...currentErrors, followUp: undefined }))
    setNotice(null)
  }

  // ---- Validation (unchanged) ----
  const validateReport = () => {
    const nextErrors = {}

    if (!technicianID) {
      nextErrors.selectedJobId = 'Technician identity is unavailable for this session.'
    } else if (!jobsDataAvailable || jobsError) {
      nextErrors.selectedJobId = 'Completed-job data is currently unavailable.'
    } else if (!report.selectedJobId || !selectedJob || selectedJob.status !== 'Completed') {
      nextErrors.selectedJobId = 'Select a completed assigned job before continuing.'
    } else if (!Number.isInteger(Number(selectedJob.job_ID))) {
      nextErrors.selectedJobId = 'The selected job does not have a valid booking reference.'
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
    if (submittedReportID !== null) return
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
    if (submitting || submittedReportID !== null) return

    if (!validateReport()) {
      setShowConfirmation(false)
      return
    }

    setSubmitting(true)
    setShowConfirmation(false)

    let confirmedReportID
    try {
      // Build the payload from form state
      const payload = buildReportPayload(report, selectedJob)

      // POST to backend API
      const response = await fetch(`${API_BASE_URL}/api/technician/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || result.success !== true) {
        throw new Error(result.error || result.message || `Request failed (${response.status})`)
      }

      if (result.reportID === null || result.reportID === undefined) {
        throw new Error('The server did not return a report identifier')
      }

      confirmedReportID = result.reportID
    } catch (error) {
      console.error('[TechnicianSubmitReport] Submission error:', error)
      setNotice({
        type: 'error',
        message: 'Service report could not be submitted. Please try again. Your form has been preserved.',
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    } finally {
      setSubmitting(false)
    }

    setSubmittedReportID(confirmedReportID)
    setNotice({
      type: 'success',
      message: `Service report submitted successfully. Report ID: ${confirmedReportID}`,
    })
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch (error) {
      console.warn('[TechnicianSubmitReport] Could not clear the local draft after submission:', error)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Redirect to assigned jobs after a short delay so user sees the success message
    setTimeout(() => {
      navigate('/technician/assigned-jobs')
    }, 2000)
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

      {(!jobsReady || !selectedJob) && (
        <div className="report-draft-context" role="status">
          <strong>Unlinked local draft</strong>
          <p>
            You can prepare this form and save it in this browser. Until a completed assignment is
            selected and the report is submitted, these details are not linked to a verified visit
            or recorded by the server.
          </p>
        </div>
      )}

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
                    disabled={!hasReportableJobs}
                    aria-required="true"
                    aria-invalid={Boolean(errors.selectedJobId)}
                    aria-describedby={errors.selectedJobId ? 'assigned-job-error' : undefined}
                  >
                    <option value="">
                      {jobsLoading
                        ? 'Loading completed jobs…'
                        : !technicianID
                          ? 'Technician identity unavailable'
                          : !jobsDataAvailable || jobsError
                            ? 'Completed jobs unavailable'
                            : reportableJobs.length === 0
                              ? 'No completed jobs available'
                              : 'Choose a completed job'}
                    </option>
                    {reportableJobs.map((job) => (
                      <option value={job.id} key={job.id}>
                        {job.id} · {job.customerName} · {job.serviceType} · {job.formattedDate}
                      </option>
                    ))}
                  </select>
                  {jobsLoading ? (
                    <div className="report-empty-inline" role="status" aria-live="polite">
                      Loading completed assignments…
                    </div>
                  ) : !technicianID ? (
                    <div className="report-empty-inline" role="alert">
                      Technician identity is unavailable. Service report submission cannot continue.
                    </div>
                  ) : !jobsDataAvailable || jobsError ? (
                    <div className="report-empty-inline" role="alert">
                      <span>Completed-job data is currently unavailable.</span>{' '}
                      <button type="button" className="cf-button cf-button-secondary" onClick={refreshJobs}>
                        Retry
                      </button>
                    </div>
                  ) : reportableJobs.length === 0 ? (
                    <div className="report-empty-inline" role="status">
                      No completed jobs are currently available for reporting.
                    </div>
                  ) : null}
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
                  <p className="report-field-hint">
                    Confirm the actual service completion time before submitting; this local value is not server-verified.
                  </p>
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

          </main>

          {/* ---- Sidebar: Checklist + Follow-up + Completion ---- */}
          <aside className="report-support-column cf-report-rail" aria-label="Report completion and follow-up">
            <div className="report-component-slot report-checklist-slot cf-report-side-card">
              <ServiceChecklist values={report.checklist} onChange={updateChecklist} />
            </div>
            <div className="report-component-slot report-follow-up-slot cf-report-side-card">
              <FollowUpSection value={report.followUp} errors={errors.followUp} onChange={updateFollowUp} />
              <p className="report-follow-up-note">
                These are report recommendations; selecting Yes does not schedule another visit.
              </p>
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
                      <small>Select only if the customer reviewed the work. This remains a draft assertion until submission.</small>
                    </span>
                  </label>
                </div>
              </div>
            </section>
          </aside>

          {/* ---- Parts & Materials stay visible, without unsupported inventory choices ---- */}
          <div className="report-component-slot report-materials-slot cf-report-card cf-materials-card">
            <section className="report-section" aria-labelledby="parts-materials-title">
              <div className="report-section-heading">
                <div>
                  <h3 id="parts-materials-title">Parts &amp; Materials Used</h3>
                  <p>Inventory references cannot currently be selected in this form.</p>
                </div>
              </div>
              <div className="report-empty-inline" role="status">
                Inventory items are currently unavailable for technician selection. Submit only if no parts or materials were used.
              </div>
            </section>
          </div>

          <div className="report-form-actions cf-report-action-dock">
            <div>
              <strong>Ready to finish?</strong>
              <span>Save in this browser, or submit after selecting a completed assignment.</span>
            </div>
            <button type="button" className="cf-button cf-button-secondary" onClick={handleSaveDraft}>
              Save Draft
            </button>
            <button type="button" className="cf-button cf-button-quiet" onClick={handleCancel}>
              Cancel
            </button>
            {/* FIX: Disable submit button while submission is in progress */}
            <button
              type="submit"
              className="cf-button cf-button-primary"
              disabled={submitting || submittedReportID !== null || !hasReportableJobs}
            >
              {submitting ? 'Submitting...' : submittedReportID !== null ? 'Submitted' : 'Submit Report'}
            </button>
          </div>
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
              <dt>Parts &amp; materials</dt>
              <dd>Not included — inventory unavailable</dd>
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
            disabled={submitting || submittedReportID !== null}
          >
            {submitting ? 'Submitting...' : 'Confirm Submit'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default TechnicianSubmitReport
