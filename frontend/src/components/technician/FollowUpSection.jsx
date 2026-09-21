import React from 'react'

function FollowUpSection({ value, errors = {}, onChange }) {
  const updateField = (field, fieldValue) => {
    onChange({ ...value, [field]: fieldValue })
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
          <div className="report-field report-field-full">
            <label className="report-label" htmlFor="follow-up-reason">
              Reason <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="follow-up-reason"
              className="report-control"
              rows="3"
              value={value.reason}
              placeholder="Describe the unresolved issue or recommended next action."
              onChange={(event) => updateField('reason', event.target.value)}
              aria-required="true"
              aria-invalid={Boolean(errors.reason)}
              aria-describedby={errors.reason ? 'follow-up-reason-error' : undefined}
            />
            {errors.reason && (
              <span className="report-field-error" id="follow-up-reason-error">
                {errors.reason}
              </span>
            )}
          </div>

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
