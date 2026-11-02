
import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";

//the component itsef, takes in many arguments
const RecordModal = ({
  mode,
  title,
  fields,
  data,
  onClose,
  onSave,
  alternativeFields,
  onProposeAlternatives,
  onSaveAlternatives,
  getTechnicianOptions,
  action
}) => {
  const [form, setForm] = useState(data || {});
 // console.log("ACTION:", action);
//console.log("IS PROPOSING:", isProposingAlternatives);
//console.log("FIELDS TO DISPLAY:", fieldsToDisplay);

  const bookingStatus = String(data?.status || "") .trim() .toLowerCase(); //get booking status
  const isConfirmed = bookingStatus === "confirmed"; //will state a var for wat is indeed confirmed

  //for this state, the different spelling
  const isRescheduleRequested = ["request_reschedule",  "reschedule_requested",  ].includes(bookingStatus);
    
const isTechnicianField = (key) =>
  [
    "technician_id",
    "technicianid",
    "technician",
    "technician_id_2",
    "technicianid_2",
    "assisting",
    "rr1",
    "rr2",
    "rr3",
    "option1_technician_id",
    "option2_technician_id",
    "option3_technician_id",
  ].includes(String(key).toLowerCase());
    //check booking data, state the  timefields (var refered to in this modal), as those spellings
  const isTimeField = (key) =>
    [
      "time",
     // "timing",
      "booking_time",
      "bookingtime",
      "processedtime",
      "newtime",
     // "newtime",
    ].includes(String(key).toLowerCase());

    //booking data - reassignment reason
  const isReasonField = (key) => ["reason", "reassignmentreason"].includes(String(key).toLowerCase());
       
    //on component moount, set the data
  useEffect(() => { setForm(data || {}); }, [data]);
   
 const isPending = bookingStatus === "pending";//use to determine if on pending status
const isProposingAlternatives = action === "propose";

const fieldsToDisplay = isProposingAlternatives
  ? alternativeFields
  : fields;
  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  /*** const assignData = useMemo(
  () => (modal ? { ...modal.record, technician_ID: "", reason: "" } : null),
  [modal]
);*/

  //on the final button click==================================================================================
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

    // based on which status, do the checks -------------------------------------------------------------
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


    /**     if (!newTime) {
        alert("Please select a new booking time.");
        return;
      }

      if (newTime === originalTime) {
        alert("Please choose a different booking time.");
        return;
      }
     */
 
    }
    //debuggin print statements -------------------------------------------
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

  if (isProposingAlternatives) {
  onSaveAlternatives?.(form);
} else {
  onSave(form);
}//send data to db
   // onSave(form);

  };//end of handle submit button



 //view mode of the popup=======================================================================================
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

  //else return the full input popup ====================================================================
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
<h2>
  {isProposingAlternatives
    ? "Propose Alternative Booking Times"
    : title}
</h2>

          {fieldsToDisplay.map((field) => {
            const key = field.key;
            const technicianField = isTechnicianField(key);
            const timeField = isTimeField(key);
            const reasonField = isReasonField(key);

            let readOnly = Boolean(field.readOnly);
            let disabled = false;
            let required = field.required !== false;


//these set the field input restrictions based on status of booking ====================================================
   if (!isProposingAlternatives && isConfirmed) {
  readOnly = !technicianField && !reasonField;
  disabled = !technicianField && !reasonField;
  required = technicianField || reasonField;
} else if (!isProposingAlternatives && isRescheduleRequested) {
  readOnly = !timeField;
  disabled = !timeField && !technicianField;
  required = timeField || technicianField;
}

else if (bookingStatus === "pending" && !isProposingAlternatives) {
  const isInitialAssignmentTime = timeField;

  readOnly = !technicianField && !isInitialAssignmentTime;
  disabled = !technicianField && !isInitialAssignmentTime;
  required = technicianField || isInitialAssignmentTime;
}
/** const isProposingAlternatives = action === "propose";

const fieldsToDisplay = isProposingAlternatives
  ? alternativeFields
  : fields;
*/

//return html =========================================================================================================================================
            return (
              
              <div className="dash-form-row" key={key}>


                <label className="dash-form-label">
                  {field.label}
                  {required && " *"}
                </label>

{/**turn the options into  a dropdown */}
             
{field.type === "select" ? (
  (() => {
    // Start with the options supplied by ManageBookings
    //let options = field.options || [];
    let options = (field.options || []).map((o) =>
  typeof o === "string" ? { label: o, value: o } : o
);

    // For technician dropdowns, calculate availability
    if (isTechnicianField(key) && getTechnicianOptions) {
      let date;
      let time;
      let excludeTechnicianIds = [];

      // Initial assignment
      if (key === "technician_ID" || key === "technician_ID_2") {
        date = data?.booking_date;
        time = data?.timing;

        // Prevent Technician 2 from being the same as Technician 1
        if (key === "technician_ID_2" && form.technician_ID) {
          excludeTechnicianIds = [form.technician_ID];
        }
      }

      // Alternative 1
      if (key === "option1_technician_ID" || key === "RR1") {
        date = form.option1_date;
        time = form.option1_time;

        if (key === "RR1" && form.option1_technician_ID) {
          excludeTechnicianIds = [form.option1_technician_ID];
        }
      }

      // Alternative 2
      if (key === "option2_technician_ID" || key === "RR2") {
        date = form.option2_date;
        time = form.option2_time;

        if (key === "RR2" && form.option2_technician_ID) {
          excludeTechnicianIds = [form.option2_technician_ID];
        }
      }

      // Alternative 3
      if (key === "option3_technician_ID" || key === "RR3") {
        date = form.option3_date;
        time = form.option3_time;

        if (key === "RR3" && form.option3_technician_ID) {
          excludeTechnicianIds = [form.option3_technician_ID];
        }
      }

      options = getTechnicianOptions(
        date,
        time,
        data?.booking_ID,
        excludeTechnicianIds
      );
      
    }

    return (
      <select
        className="dash-form-select"
        value={form[key] ?? ""}
        onChange={(e) => handleChange(key, e.target.value)}
        required={required}
        disabled={disabled}
      >
        <option value="">
          {isTechnicianField(key) && options.length === 0
            ? "-- Pick date & time first --"
            : "-- Select Option --"}
        </option>
        {options.map((opt, idx) => (
          <option key={`${opt.value}-${idx}`} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  })()
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

{/** this little part of the options button below the modal --------------------------------------------------- */}
        <div className="dash-modal-footer">

          {/**cancel button */}
      <button
  type="button"
  className="dash-btn dash-btn-outline"
  onClick={() => {
    if (isProposingAlternatives) {
      onProposeAlternatives?.("default");
    } else {
      onClose();
    }
  }}
>
  Cancel
</button>

{/** new button here to make the 3 options */}
  {isPending &&!isProposingAlternatives &&  (
    <>
      

      <button
        type="button"            className="dash-btn dash-btn-outline"

        onClick={() => onProposeAlternatives?.(form)}
      >
        Propose Alternatives
      </button>
    </>
  )}




            {/**save changes, in pending status it says Assign technician */}
          <button
            type="submit"
            className="dash-btn dash-btn-primary"
          >
            {/**show button text based on status workflow */}
           {isProposingAlternatives
  ? "Submit Alternatives"
  : isConfirmed
    ? "Reassign Technician"
    : isRescheduleRequested
      ? "Update Booking Time"
      : mode === "create"
        ? "Create"
        : "Assign Technician"}
                  
                 
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RecordModal;
