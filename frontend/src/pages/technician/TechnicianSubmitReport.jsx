import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from 'react-bootstrap/Modal'
import {
  selectAssignedJobViewModels,
  selectCurrentInventoryItems,
  selectCurrentTechnicianContext,
} from "../../data/technician/technicianSelectors";

import JobStatusBadge from '../../components/technician/JobStatusBadge'
import ServiceChecklist from '../../components/technician/ServiceChecklist'
import PartsMaterialsTable from '../../components/technician/PartsMaterialsTable'
import FollowUpSection from '../../components/technician/FollowUpSection'

const DRAFT_STORAGE_KEY = 'aircon-care-technician-report-draft'
const CURRENT_TECHNICIAN = selectCurrentTechnicianContext()
const SELECTABLE_JOBS = CURRENT_TECHNICIAN
  ? selectAssignedJobViewModels(CURRENT_TECHNICIAN.technician_ID)
  : []
const AVAILABLE_INVENTORY_ITEMS = selectCurrentInventoryItems()
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

const OVERALL_CONDITIONS = new Set([
  'Excellent',
  'Good',
  'Fair',
  'Poor',
  'Requires Follow-Up',
])
const FOLLOW_UP_PRIORITIES = new Set(['Low', 'Normal', 'High'])
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

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
      // Pending schema confirmation: quantity and cost remain form-only values.
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
    findings: '',
    actionsTaken: '',
    overallCondition: '',
    recommendations: '',
    internalNotes: '',
    checklist: {},
    materials: [],
    followUp: {
      required: 'no',
      reason: '',
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

    const savedJobId = sanitizeString(parsedDraft.selectedJobId)
    const selectedJobId = SELECTABLE_JOBS.some((job) => job.id === savedJobId)
      ? savedJobId
      : ''
    const savedCondition = sanitizeString(parsedDraft.overallCondition)
    const savedFollowUp = isPlainObject(parsedDraft.followUp) ? parsedDraft.followUp : {}
    const followUpRequired = savedFollowUp.required === 'yes' ? 'yes' : 'no'
    const savedPriority = sanitizeString(savedFollowUp.priority)
    const savedFollowUpDate = sanitizeString(savedFollowUp.date)
    const savedCompletionDateTime = sanitizeString(parsedDraft.completionDateTime)

    return {
      ...initialReport,
      selectedJobId,
      findings: sanitizeString(parsedDraft.findings),
      actionsTaken: sanitizeString(parsedDraft.actionsTaken),
      overallCondition: OVERALL_CONDITIONS.has(savedCondition) ? savedCondition : '',
      recommendations: sanitizeString(parsedDraft.recommendations),
      internalNotes: sanitizeString(parsedDraft.internalNotes),
      checklist: sanitizeChecklist(parsedDraft.checklist),
      materials: sanitizeMaterials(parsedDraft.materials),
      followUp: {
        required: followUpRequired,
        reason: sanitizeString(savedFollowUp.reason),
        date: DATE_PATTERN.test(savedFollowUpDate) ? savedFollowUpDate : '',
        priority: FOLLOW_UP_PRIORITIES.has(savedPriority) ? savedPriority : 'Normal',
      },
      completionDateTime: DATE_TIME_PATTERN.test(savedCompletionDateTime)
        ? savedCompletionDateTime
        : initialReport.completionDateTime,
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

function TechnicianSubmitReport() {
  const navigate = useNavigate()
  const [report, setReport] = useState(loadLocalDraft)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const selectedJob = useMemo(
    () => SELECTABLE_JOBS.find((job) => job.id === report.selectedJobId) || null,
    [report.selectedJobId],
  )

  const materialsTotal = useMemo(
    () => calculateMaterialsTotal(report.materials),
    [report.materials],
  )

  const updateReportField = (field, value) => {
    setReport((currentReport) => ({ ...currentReport, [field]: value }))
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }))
    setNotice(null)
  }

  const updateChecklist = (checkId, checked) => {
    setReport((currentReport) => ({
      ...currentReport,
      checklist: {
        ...currentReport.checklist,
        [checkId]: checked,
      },
    }))
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

  const validateReport = () => {
    const nextErrors = {}

    if (!report.selectedJobId || !selectedJob) {
      nextErrors.selectedJobId = 'Select an assigned job before continuing.'
    }

    if (!report.findings.trim()) {
      nextErrors.findings = 'Enter the findings and observations.'
    }

    if (!report.actionsTaken.trim()) {
      nextErrors.actionsTaken = 'Enter the actions completed during the service.'
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

      if (
        row.quantity === '' ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isInteger(quantity)
      ) {
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

      if (!report.followUp.reason.trim()) {
        followUpErrors.reason = 'Explain why follow-up work is required.'
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
      setNotice({
        type: 'error',
        message: 'Review the highlighted fields before submitting the report.',
      })

      window.setTimeout(() => {
        document.querySelector('[aria-invalid="true"]')?.focus()
      }, 0)

      return false
    }

    return true
  }

  const handleSaveDraft = () => {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(report))
      setNotice({
        type: 'info',
        message: 'Draft saved in this browser only.',
      })
    } catch {
      setNotice({
        type: 'error',
        message: 'This browser could not save the draft locally. Your current form remains open.',
      })
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setNotice(null)

    if (validateReport()) {
      setShowConfirmation(true)
    }
  }

  const confirmSubmission = () => {
    setShowConfirmation(false)
    setNotice({
      type: 'success',
      message:
        'Report validation is complete. No information was sent because backend submission is not connected yet.',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = () => {
    navigate('/technician/assigned-jobs')
  }

  return (
    <div className="technician-submit-report-page">
      <div className="report-page-header">
        <div>
          <div className="page-kicker">TECHNICIAN FIELD OPS</div>
          <h2 className="page-title">Submit Service Report</h2>
          <p className="page-subtitle mb-0">
            Record service outcomes, checks performed, materials used, and customer acknowledgement.
          </p>
        </div>
        <button type="button" className="btn btn-outline-primary" onClick={handleSaveDraft}>
          Save Draft
        </button>
      </div>

      {notice && (
        <div
          className={`report-notice report-notice-${notice.type}`}
          role={notice.type === 'error' ? 'alert' : 'status'}
        >
          {notice.message}
        </div>
      )}

      <form className="service-report-form" onSubmit={handleSubmit} noValidate>
        <section className="report-section" aria-labelledby="job-selection-title">
          <div className="report-section-heading">
            <div>
              <h3 id="job-selection-title">Job Selection</h3>
              <p>Select the assigned job this service report belongs to.</p>
            </div>
          </div>

          <div className="report-field">
            <label className="report-label" htmlFor="assigned-job">
              Assigned job <span aria-hidden="true">*</span>
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
              <option value="">Choose an assigned job</option>
              {SELECTABLE_JOBS.map((job) => (
                <option value={job.id} key={job.id}>
                  {job.id} · {job.customerName} · {job.serviceType} · {job.formattedDate}
                </option>
              ))}
            </select>
            {errors.selectedJobId && (
              <span className="report-field-error" id="assigned-job-error">
                {errors.selectedJobId}
              </span>
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
                <div>
                  <dt>Service type</dt>
                  <dd>{selectedJob.serviceType}</dd>
                </div>
                <div>
                  <dt>Scheduled</dt>
                  <dd>
                    {selectedJob.formattedDate} · {selectedJob.time}
                  </dd>
                </div>
                <div>
                  <dt>Service address</dt>
                  <dd>
                    {selectedJob.address}
                    {selectedJob.postalCode ? ` · S${selectedJob.postalCode}` : ''}
                  </dd>
                </div>
                <div>
                  <dt>Equipment / AC units</dt>
                  <dd>{selectedJob.unitType || 'Not specified'}</dd>
                </div>
              </dl>
            </div>
          )}
        </section>

        <section className="report-section" aria-labelledby="service-report-title">
          <div className="report-section-heading">
            <div>
              <h3 id="service-report-title">Service Report</h3>
              <p>Provide a clear record of the unit condition and work completed.</p>
            </div>
          </div>

          <div className="report-fields-grid">
            <div className="report-field report-field-full">
              <label className="report-label" htmlFor="report-findings">
                Findings &amp; Observations <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="report-findings"
                className="report-control"
                rows="4"
                value={report.findings}
                placeholder="Describe the condition found, symptoms observed, and inspection results."
                onChange={(event) => updateReportField('findings', event.target.value)}
                aria-required="true"
                aria-invalid={Boolean(errors.findings)}
                aria-describedby={errors.findings ? 'report-findings-error' : undefined}
              />
              {errors.findings && (
                <span className="report-field-error" id="report-findings-error">
                  {errors.findings}
                </span>
              )}
            </div>

            <div className="report-field report-field-full">
              <label className="report-label" htmlFor="actions-taken">
                Actions Taken <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="actions-taken"
                className="report-control"
                rows="4"
                value={report.actionsTaken}
                placeholder="List the servicing, repairs, testing, or adjustments completed."
                onChange={(event) => updateReportField('actionsTaken', event.target.value)}
                aria-required="true"
                aria-invalid={Boolean(errors.actionsTaken)}
                aria-describedby={errors.actionsTaken ? 'actions-taken-error' : undefined}
              />
              {errors.actionsTaken && (
                <span className="report-field-error" id="actions-taken-error">
                  {errors.actionsTaken}
                </span>
              )}
            </div>

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
                <span className="report-field-error" id="overall-condition-error">
                  {errors.overallCondition}
                </span>
              )}
            </div>

            <div className="report-field report-field-full">
              <label className="report-label" htmlFor="technician-recommendations">
                Technician Recommendations
              </label>
              <textarea
                id="technician-recommendations"
                className="report-control"
                rows="3"
                value={report.recommendations}
                placeholder="Recommend preventive maintenance, repairs, or customer actions."
                onChange={(event) => updateReportField('recommendations', event.target.value)}
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

        <ServiceChecklist values={report.checklist} onChange={updateChecklist} />

        <PartsMaterialsTable
          rows={report.materials}
          inventoryItems={AVAILABLE_INVENTORY_ITEMS}
          errors={errors.materials}
          onChange={updateMaterials}
        />

        <FollowUpSection
          value={report.followUp}
          errors={errors.followUp}
          onChange={updateFollowUp}
        />

        <section className="report-section" aria-labelledby="completion-information-title">
          <div className="report-section-heading">
            <div>
              <h3 id="completion-information-title">Completion Information</h3>
              <p>Record when the work finished and whether the customer reviewed the outcome.</p>
            </div>
          </div>

          <div className="report-fields-grid">
            <div className="report-field">
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

            <div className="report-field">
              <label className="customer-acknowledgement">
                <input
                  type="checkbox"
                  checked={report.customerAcknowledged}
                  onChange={(event) =>
                    updateReportField('customerAcknowledged', event.target.checked)
                  }
                />
                <span>
                  <strong>Customer acknowledgement</strong>
                  <small>The customer has reviewed the completed work and report summary.</small>
                </span>
              </label>
            </div>
          </div>
        </section>

        <div className="report-form-actions">
          <button type="button" className="btn btn-outline-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Submit Report
          </button>
        </div>
      </form>

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
            Review the report details before confirming this frontend-only submission.
          </p>
          <dl className="report-confirmation-summary">
            <div>
              <dt>Job</dt>
              <dd>
                {selectedJob?.id} · {selectedJob?.customerName}
              </dd>
            </div>
            <div>
              <dt>Overall condition</dt>
              <dd>{report.overallCondition}</dd>
            </div>
            <div>
              <dt>Materials total</dt>
              <dd>{currencyFormatter.format(materialsTotal)}</dd>
            </div>
          </dl>
          <p className="report-confirmation-note mb-0">
            Backend integration is not connected. Confirming will not send or save information to a server.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowConfirmation(false)}
          >
            Continue Editing
          </button>
          <button type="button" className="btn btn-primary" onClick={confirmSubmission}>
            Confirm Submit
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default TechnicianSubmitReport
