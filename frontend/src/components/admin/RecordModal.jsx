import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";

const RecordModal = ({ mode, title, fields, data, onClose, onSave }) => {
  const [form, setForm] = useState(data || {});

  // Compute local timezone YYYY-MM-DD string to block past calendar dates
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayDateString = `${year}-${month}-${day}`;

  useEffect(() => {
    setForm(data || {});
  }, [data]);

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
              <span className="dash-view-row-value">{data ? data[field.key] : "N/A"}</span>
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

              {/* Render Dropdown Select */}
              {field.type === "select" ? (
                <select
                  className="dash-form-select"
                  value={form[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                >
                  <option value="">-- Select Option --</option>
                  {(field.options || []).map((opt, idx) => {
                    const isObj = typeof opt === "object" && opt !== null;
                    const val = isObj ? opt.value : opt;
                    const lbl = isObj ? opt.label : opt;

                    return (
                      <option key={isObj ? opt.value : idx} value={val}>
                        {lbl}
                      </option>
                    );
                  })}
                </select>
              ) : (
                /* Native Date Input: Applies min={todayDateString} to disable past dates */
                <input
                  className="dash-form-input"
                  type={field.type || "text"}
                  min={field.type === "date" ? todayDateString : undefined} // Blocks dates before today
                  value={form[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  readOnly={field.readOnly || false}
                  required={field.required !== false && !field.readOnly}
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