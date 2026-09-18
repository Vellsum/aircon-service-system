import React, { useState } from "react";
import Modal from "./Modal";

// Generic view/edit/create modal driven by a field schema, so the same
// component works for bookings, technicians, customers, services, etc.
//
// fields: [{ key, label, type: "text" | "number" | "select", options?: [] }]
// mode: "view" (read-only) | "edit" (prefilled form) | "create" (blank form)
// data: current values (for view/edit) or {} for create
// onSave: called with the updated data object (edit/create only)
const RecordModal = ({ mode, title, fields, data, onClose, onSave }) => {
  const [form, setForm] = useState(data || {});

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  if (mode === "view") {
    return (
      <Modal title={title} onClose={onClose}>
        <div className="dash-modal-body">
          {fields.map((field) => (
            <div className="dash-view-row" key={field.key}>
              <span className="dash-view-row-label">{field.label}</span>
              <span className="dash-view-row-value">{data[field.key]}</span>
            </div>
          ))}
        </div>
        <div className="dash-modal-footer">
          <button className="dash-btn dash-btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="dash-modal-body">
          {fields.map((field) => (
            <div className="dash-form-row" key={field.key}>
              <label className="dash-form-label">{field.label}</label>

              {field.type === "select" ? (
                <select
                  className="dash-form-select"
                  value={form[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="dash-form-input"
                  type={field.type === "number" ? "number" : "text"}
                  value={form[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  required
                />
              )}
            </div>
          ))}
        </div>

        <div className="dash-modal-footer">
          <button type="button" className="dash-btn dash-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="dash-btn dash-btn-primary">
            {mode === "create" ? "Create" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RecordModal;
