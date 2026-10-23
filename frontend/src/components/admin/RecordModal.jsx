
import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";

const RecordModal = ({
  mode,
  title,
  fields,
  data,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState(data || {});

  const bookingStatus = String(data?.status || "")
    .trim()
    .toLowerCase();

  const isConfirmed = bookingStatus === "confirmed";

  const isRescheduleRequested = [
    "request_reschedule",
    "reschedule_requested",
  ].includes(bookingStatus);

  const isTechnicianField = (key) =>
    ["technician_id", "technicianid", "technician"].includes(
      String(key).toLowerCase()
    );

  const isTimeField = (key) =>
    [
      "time",
      "timing",
      "booking_time",
      "bookingtime",
      "processedtime",
      "newtime",
     // "newtime",
    ].includes(String(key).toLowerCase());

  const isReasonField = (key) =>
    ["reason", "reassignmentreason"].includes(
      String(key).toLowerCase()
    );

  useEffect(() => {
    setForm(data || {});
  }, [data]);

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();console.log("RecordModal handleSubmit fired");

    if (isConfirmed) {
      const technicianField = fields.find((field) =>
        isTechnicianField(field.key)
      );

      const reasonField = fields.find((field) =>
        isReasonField(field.key)
      );

      if (!technicianField) {
        alert("The form must include a technician field.");
        return;
      }

      if (!form[technicianField.key]) {
        alert("Please select a new technician.");
        return;
      }

      if (
        String(form[technicianField.key]) ===
        String(data?.[technicianField.key] ?? "")
      ) {
        alert("Please select a different technician.");
        return;
      }

      if (
        !reasonField ||
        !String(form[reasonField.key] || "").trim()
      ) {
        alert("Please provide a reason for reassignment.");
        return;
      }
    }

   if (isRescheduleRequested) {
  const newTime = String(form.newTime || "").trim().slice(0, 5);
  const originalTime = String(data?.processedTime || "")
    .trim()
    .slice(0, 5);
console.log("New time:", form.newTime);
console.log("Original time:", data?.processedTime);
  if (!newTime) {
    alert("Please select a new booking time.");
    return;
  }
/**   if (newTime === originalTime) {
    alert("Please select a different booking time.");
    return;
  }*/


      if (!newTime) {
        alert("Please select a new booking time.");
        return;
      }

      if (newTime === originalTime) {
        alert("Please choose a different booking time.");
        return;
      }
    }
console.log("Modal form data:", form);
console.log("Modal fields:", fields.map(f => ({
  key: f.key,
  type: f.type,
  value: form[f.key]
})));
console.log("FORM STATE:", JSON.stringify(form, null, 2));
console.log(
  "TIME FIELDS:",
  fields.filter((f) => String(f.key).toLowerCase().includes("time"))
);
onSave(form);
   // onSave(form);
  };

  if (mode === "view") {
    return (
      <Modal title={title} onClose={onClose}>
        <div className="dash-modal-body">
          {fields.map((field) => (
            <div className="dash-view-row" key={field.key}>
              <span className="dash-view-row-label">
                {field.label}
              </span>
              <span className="dash-view-row-value">
                {data?.[field.key] ?? "N/A"}
              </span>
            </div>
          ))}
        </div>

        <div className="dash-modal-footer">
          <button
            type="button"
            className="dash-btn dash-btn-outline"
            onClick={onClose}
          >
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
          {isConfirmed && (
            <p>
              Reassign the technician for this confirmed booking.
              A reason is required. The booking date and time
              cannot be changed here.
            </p>
          )}

          {isRescheduleRequested && (
            <p>
              Select a new booking time. The technician, booking
              date, and reassignment reason cannot be changed here.
            </p>
          )}

          {fields.map((field) => {
            const key = field.key;
            const technicianField = isTechnicianField(key);
            const timeField = isTimeField(key);
            const reasonField = isReasonField(key);

            let readOnly = Boolean(field.readOnly);
            let disabled = false;
            let required = field.required !== false;

          if (isConfirmed) {
  readOnly = !technicianField && !reasonField;
  disabled = !technicianField && !reasonField;
  required = technicianField || reasonField;
  
} else if (isRescheduleRequested) {
  readOnly = !timeField;
  disabled = !timeField && !technicianField;
  required = timeField || technicianField;
}

else if (bookingStatus === "pending") {
  const isInitialAssignmentTime = timeField;

  readOnly = !technicianField && !isInitialAssignmentTime;
  disabled = !technicianField && !isInitialAssignmentTime;
  required = technicianField || isInitialAssignmentTime;
}

            return (
              <div className="dash-form-row" key={key}>
                <label className="dash-form-label">
                  {field.label}
                  {required && " *"}
                </label>

                {field.type === "select" ? (
                  <select
                    className="dash-form-select"
                    value={form[key] ?? ""}
                    onChange={(e) =>
                      handleChange(key, e.target.value)
                    }
                    required={required}
                    disabled={disabled}
                  >
                    <option value="">-- Select Option --</option>

                    {(field.options || []).map((opt, idx) => {
                      const isObj =
                        typeof opt === "object" && opt !== null;

                      const value = isObj ? opt.value : opt;
                      const label = isObj ? opt.label : opt;

                      return (
                        <option
                          key={isObj ? opt.value : idx}
                          value={value}
                        >
                          {label}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    className="dash-form-input"
                    type={field.type || "text"}
                    value={form[key] ?? ""}
                    onChange={(e) => {
  console.log("INPUT CHANGED:", key, e.target.value);
  handleChange(key, e.target.value);
}}
                    readOnly={readOnly}
                    disabled={disabled}
                    required={required}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="dash-modal-footer">
          <button
            type="button"
            className="dash-btn dash-btn-outline"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="dash-btn dash-btn-primary"
          >
            {isConfirmed
              ? "Reassign Technician"
              : isRescheduleRequested
                ? "Update Booking Time"
                : mode === "create"
                  ? "Create"
                  : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RecordModal;
