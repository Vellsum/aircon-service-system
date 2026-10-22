import React, { useMemo } from 'react'

const currencyFormatter = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
})

function formatStock(value) {
  const stock = typeof value === 'string' && /^\d+$/.test(value.trim())
    ? Number(value) : value
  return typeof stock === 'number' && Number.isSafeInteger(stock) && stock >= 0
    ? stock : 'Unavailable'
}

function inventoryPrice(value) {
  if (typeof value !== 'number' && (typeof value !== 'string'
    || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) return null
  const price = Number(value)
  return Number.isFinite(price) && price >= 0 ? price : null
}

function createMaterialRow() {
  const uniqueId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `material-${Date.now()}-${Math.random().toString(16).slice(2)}`

  return {
    id: uniqueId,
    itemID: '',
    // Pending schema confirmation: quantity and cost are presentation-only fields.
    quantity: '1',
    unitCost: '',
  }
}

function calculateRowTotal(row) {
  const quantity = Number(row.quantity)
  const unitCost = Number(row.unitCost)

  if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return 0
  if (quantity <= 0 || unitCost < 0) return 0

  return quantity * unitCost
}

function PartsMaterialsTable({ rows, inventoryItems = [], errors = {}, onChange }) {
  const inventoryById = useMemo(
    () => new Map(inventoryItems.map((item) => [item.itemID, item])),
    [inventoryItems],
  )
  const materialsTotal = useMemo(
    () => rows.reduce((total, row) => total + calculateRowTotal(row), 0),
    [rows],
  )

  const addRow = () => {
    onChange([...rows, createMaterialRow()])
  }

  const updateRow = (rowId, field, value) => {
    onChange(
      rows.map((row) => {
        if (row.id !== rowId) return row
        if (field === 'itemID') {
          if (row.itemID === value) return row
          const price = inventoryPrice(inventoryById.get(value)?.price)
          return { ...row, itemID: value, unitCost: price === null ? '' : String(price) }
        }
        return { ...row, [field]: value }
      }),
    )
  }

  const deleteRow = (rowId) => {
    onChange(rows.filter((row) => row.id !== rowId))
  }

  return (
    <section className="report-section" aria-labelledby="parts-materials-title">
      <div className="report-section-heading report-section-heading-with-action">
        <div>
          <h3 id="parts-materials-title">Parts &amp; Materials Used</h3>
          <p>Select inventory items consumed during this service visit.</p>
        </div>
        <button type="button" className="cf-button cf-button-secondary text-nowrap" onClick={addRow}>
          <span aria-hidden="true">+</span> Add Row
        </button>
      </div>

      {rows.length > 0 ? (
        <div className="materials-list">
          <div className="materials-grid materials-grid-header" aria-hidden="true">
            <span>Inventory item</span>
            <span>Quantity</span>
            <span>Unit cost (SGD)</span>
            <span>Row total</span>
            <span />
          </div>

          {rows.map((row, index) => {
            const rowErrors = errors[row.id] || {}
            const selectedInventoryItem = inventoryById.get(row.itemID)
            const itemErrorId = `material-${row.id}-item-error`
            const quantityErrorId = `material-${row.id}-quantity-error`
            const costErrorId = `material-${row.id}-cost-error`
            const priceUnavailable = row.itemID !== '' && inventoryPrice(selectedInventoryItem?.price) === null
            const priceUnavailableId = `material-${row.id}-price-unavailable`

            return (
              <div className="materials-grid materials-grid-row" key={row.id}>
                <div className="materials-field materials-item-field">
                  <label htmlFor={`material-${row.id}-item`} className="materials-field-label">
                    Inventory item
                  </label>
                  <select
                    id={`material-${row.id}-item`}
                    className="report-control"
                    value={row.itemID}
                    onChange={(event) =>
                      updateRow(
                        row.id,
                        'itemID',
                        event.target.value === '' ? '' : Number(event.target.value),
                      )
                    }
                    aria-required="true"
                    aria-invalid={Boolean(rowErrors.itemID)}
                    aria-describedby={rowErrors.itemID ? itemErrorId : undefined}
                  >
                    <option value="">Choose an inventory item</option>
                    {inventoryItems.map((item) => (
                      <option value={item.itemID} key={item.itemID}>
                        {item.itemName} · {item.itemType}
                      </option>
                    ))}
                  </select>
                  {selectedInventoryItem && (
                    <div className="materials-inventory-details">
                      <div>
                        <span>{selectedInventoryItem.itemType}</span>
                        <span>Stock: {formatStock(selectedInventoryItem.stock)}</span>
                      </div>
                      <small>{selectedInventoryItem.description}</small>
                    </div>
                  )}
                  {rowErrors.itemID && (
                    <span className="report-field-error" id={itemErrorId}>
                      {rowErrors.itemID}
                    </span>
                  )}
                </div>

                <div className="materials-field">
                  <label htmlFor={`material-${row.id}-quantity`} className="materials-field-label">
                    Quantity
                  </label>
                  <input
                    id={`material-${row.id}-quantity`}
                    type="number"
                    className="report-control"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={row.quantity}
                    onChange={(event) => updateRow(row.id, 'quantity', event.target.value)}
                    aria-required="true"
                    aria-invalid={Boolean(rowErrors.quantity)}
                    aria-describedby={rowErrors.quantity ? quantityErrorId : undefined}
                  />
                  {rowErrors.quantity && (
                    <span className="report-field-error" id={quantityErrorId}>
                      {rowErrors.quantity}
                    </span>
                  )}
                </div>

                <div className="materials-field">
                  <label htmlFor={`material-${row.id}-cost`} className="materials-field-label">
                    Unit cost (SGD)
                  </label>
                  <input
                    id={`material-${row.id}-cost`}
                    type="number"
                    className="report-control"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={row.unitCost}
                    onChange={(event) => updateRow(row.id, 'unitCost', event.target.value)}
                    aria-required="true"
                    aria-invalid={Boolean(rowErrors.unitCost)}
                    aria-describedby={[rowErrors.unitCost && costErrorId, priceUnavailable && priceUnavailableId].filter(Boolean).join(' ') || undefined}
                  />
                  {priceUnavailable && (
                    <small className="form-text d-block" id={priceUnavailableId}>
                      Inventory price unavailable. Enter Unit Cost manually.
                    </small>
                  )}
                  {rowErrors.unitCost && (
                    <span className="report-field-error" id={costErrorId}>
                      {rowErrors.unitCost}
                    </span>
                  )}
                </div>

                <div className="materials-row-total">
                  <span className="materials-field-label">Row total</span>
                  <strong>{currencyFormatter.format(calculateRowTotal(row))}</strong>
                </div>

                <button
                  type="button"
                  className="materials-delete-btn"
                  onClick={() => deleteRow(row.id)}
                  aria-label={`Delete material row ${index + 1}`}
                  title="Delete row"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6m3 0V4h8v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
            )
          })}

          <div className="materials-summary">
            <span>Total materials cost</span>
            <strong>{currencyFormatter.format(materialsTotal)}</strong>
          </div>
        </div>
      ) : (
        <div className="report-empty-inline">
          No parts or materials recorded. Add a row if items were used.
        </div>
      )}
    </section>
  )
}

export default PartsMaterialsTable
