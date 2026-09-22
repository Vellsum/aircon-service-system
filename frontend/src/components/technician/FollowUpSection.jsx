import React from 'react'

export const FOLLOW_UP_REASON_OPTIONS = Object.freeze([
  'Further diagnosis required',
  'Replacement part required',
  'Additional repair required',
  'Monitor system condition',
  'Customer requested another visit',
  'Other',
])

function FollowUpSection({ value, errors = {}, onChange }) {
  const updateField = (field, fieldValue) => {
    onChange({ ...value, [field]: fieldValue })
  }

  const toggleReason = (reason) => {
    const currentReasons = Array.isArray(value.reasons) ? value.reasons : []
    const isSelected = currentReasons.includes(reason)
    const reasons = isSelected
      ? currentReasons.filter((currentReason) => currentReason !== reason)
      : [...currentReasons, reason]

    onChange({
      ...value,
      reasons,
      otherReason: reason === 'Other' && isSelected ? '' : value.otherReason,
    })
  }

  return (
    <section className="report-section" aria-labelledby="follow-up-title">
      <div className="report-section-heading">
        <div>
          <h3 id="follow-up-title">Follow-Up</h3>
          <p>Flag work that requires another visit or additional attention.</p>
        </div>
      </div>

      <fieldset className="follow-up-choice">
        <legend className="report-label">Follow-up required?</legend>
        <div className="report-option-row">
          <label>
            <input
              type="radio"
              name="followUpRequired"
              value="no"
              checked={value.required === 'no'}
              onChange={(event) => updateField('required', event.target.value)}
            />
            <span>No</span>
          </label>
          <label>
            <input
              type="radio"
              name="followUpRequired"
              value="yes"
              checked={value.required === 'yes'}
              onChange={(event) => updateField('required', event.target.value)}
            />
            <span>Yes</span>
          </label>
        </div>
      </fieldset>

      {value.required === 'yes' && (
        <div className="follow-up-fields">
          <fieldset
            className="report-multi-select report-field-full"
            aria-required="true"
            aria-invalid={Boolean(errors.reasons)}
            aria-describedby={`follow-up-reason-hint${
              errors.reasons ? ' follow-up-reason-error' : ''
            }`}
            tabIndex={errors.reasons ? -1 : undefined}
          >
            <legend className="report-label">
              Reason <span aria-hidden="true">*</span>
            </legend>
            <p className="report-choice-hint" id="follow-up-reason-hint">
              Select all that apply.
            </p>
            <div className="service-checklist-grid">
              {FOLLOW_UP_REASON_OPTIONS.map((reason, index) => {
                const reasonId = `follow-up-reason-${index}`

                return (
                  <label className="service-checklist-item" htmlFor={reasonId} key={reason}>
                    <input
                      id={reasonId}
                      type="checkbox"
                      checked={value.reasons.includes(reason)}
                      onChange={() => toggleReason(reason)}
                    />
                    <span>{reason}</span>
                  </label>
                )
              })}
            </div>
            {value.reasons.includes('Other') && (
              <div className="report-other-details">
                <label className="report-label" htmlFor="follow-up-other-reason">
                  Other explanation <span className="report-optional-label">(optional)</span>
                </label>
                <input
                  id="follow-up-other-reason"
                  type="text"
                  className="report-control"
                  value={value.otherReason}
                  placeholder="Add any follow-up reason not covered above."
                  onChange={(event) => updateField('otherReason', event.target.value)}
                />
              </div>
            )}
            {errors.reasons && (
              <span className="report-field-error" id="follow-up-reason-error">
                {errors.reasons}
              </span>
            )}
          </fieldset>

          <div className="report-field">
            <label className="report-label" htmlFor="follow-up-date">
              Recommended follow-up date <span aria-hidden="true">*</span>
            </label>
            <input
              id="follow-up-date"
              className="report-control"
              type="date"
              value={value.date}
              onChange={(event) => updateField('date', event.target.value)}
              aria-required="true"
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? 'follow-up-date-error' : undefined}
            />
            {errors.date && (
              <span className="report-field-error" id="follow-up-date-error">
                {errors.date}
              </span>
            )}
          </div>

          <div className="report-field">
            <label className="report-label" htmlFor="follow-up-priority">
              Priority
            </label>
            <select
              id="follow-up-priority"
              className="report-control"
              value={value.priority}
              onChange={(event) => updateField('priority', event.target.value)}
            >
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
      )}
    </section>
  )
}

export default FollowUpSection
