import React from 'react'

const CHECKLIST_ITEMS = [
  { id: 'filters', label: 'Filters checked / cleaned' },
  { id: 'drainage', label: 'Drainage checked' },
  { id: 'coolingPerformance', label: 'Cooling performance tested' },
  { id: 'indoorUnit', label: 'Indoor unit inspected' },
  { id: 'outdoorUnit', label: 'Outdoor unit inspected' },
  { id: 'refrigerant', label: 'Refrigerant checked' },
  { id: 'electricalConnections', label: 'Electrical connections checked' },
  { id: 'noiseVibration', label: 'Unusual noise / vibration checked' },
]

function ServiceChecklist({ values, onChange }) {
  return (
    <section className="report-section" aria-labelledby="service-checklist-title">
      <div className="report-section-heading">
        <div>
          <h3 id="service-checklist-title">Service Checklist</h3>
          <p>Confirm each inspection or maintenance check completed during the visit.</p>
        </div>
      </div>

      <div className="service-checklist-grid">
        {CHECKLIST_ITEMS.map((item) => (
          <label className="service-checklist-item" key={item.id}>
            <input
              type="checkbox"
              checked={Boolean(values[item.id])}
              onChange={(event) => onChange(item.id, event.target.checked)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </section>
  )
}

export default ServiceChecklist
