import React, { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const API = "http://localhost:5000/api/admin"; //the api? wat the bloody fuck is this fucking doign???
const MAX_MONTHS_AHEAD = 2;

const statusTone = {   //dafuq is this used for???
  Confirmed: "success",
  Pending: "warning",
  Assigned: "accent",
  Completed: "success",
  Cancelled: "danger",
  reschedule_requested: "warning",
  Reschedule_Requested: "warning",
};

//NAME MUST FOLLOW DB DATA
const statusFilters = [
  "All",
  "confirmed",
  "pending",
  "Assigned",
  "Completed",
  "Cancelled",
  "request_reschedule",  "RR_reserved"
];

//this is wat the columns r . key is key, label is text. following order in db
const columns = [
  { key: "booking_ID", label: "Booking ID" },
  { key: "customer_name", label: "Customer" },
  { key: "technician_name", label: "Technician" },
  { key: "booking_date", label: "Date" },
// {key: "processedTime", label: "Time"},          //removed from below
  {key: "isFollowup", label: "is it follow up?"},
  {key: "customerAddress", label: "Location"},
  { key: "status", label: "Status" },
  {key: "comments", label: "Customer Comments"},
  {key: "timing", label: "Chosen time period"},
  {key: "NO_U", label: "Number of units"},
  {key: "totalTime", label: "total time"},
  {key: "totalCost", label: "total cost"},
  {key: "reassignmentReason", label: "reason for reassignment"},
  //the html gets key from here
];

const toDateString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatLocalDateString = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return toDateString(d);
};

// Latest booking date (YYYY-MM-DD) that can be assigned today: today + 2 months
const getAssignLimit = () => {
  const now = new Date();
  const day = now.getDate();
  const limit = new Date(now.getFullYear(), now.getMonth() + MAX_MONTHS_AHEAD, day);
  if (limit.getDate() !== day) limit.setDate(0); // e.g. 31 Dec -> end of Feb
  return toDateString(limit);
};

const isOpen = (booking) => !["Completed", "Cancelled"].includes(booking.status);
const isTooFarAhead = (booking, limit) => Boolean(booking.booking_date) && booking.booking_date > limit;


//this part handles the modal? =======================================================================================
//this is actually the component
const AssignTechnician = () => {
  const [bookings, setBookings] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [sortKey, setSortKey] = useState("booking_ID");
  const [sortDir, setSortDir] = useState("desc");
  const [modal, setModal] = useState(null); // { mode: "view" | "assign", record }
  const [toast, setToast] = useState(null);

  const assignLimit = getAssignLimit();

  const [modalAction, setModalAction] = useState("default");  //This tracks what the admin is doing inside the modal.

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {  //this chunk return the data?
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const bookRes = await fetch(`${API}/bookings`, { headers });
      const bookData = await bookRes.json();
      if (bookRes.ok && bookData.success && Array.isArray(bookData.bookings)) {
        //this part calls api to get all bookings
        // the b is the booking row than get by column
        setBookings(
          bookData.bookings.map((b) => {
            const rawId = b.booking_ID || b.id || 0;
            return {
              booking_ID: rawId,
              id: `#BK${String(rawId).padStart(3, "0")}`, //wateve rdafuw booking id

              customer_name: b.customer_name || "Guest Customer", //the controllers convert their id to names for us
              technician_ID: b.technician_ID ? String(b.technician_ID) : "",
              technician_name: b.technician_name || "Unassigned",
              booking_date: formatLocalDateString(b.booking_date),
              status: b.status || "Pending",
            //  processedTime: b.time,
              isFollowup: b.isFollowup,
              customerAddress: b.location,
                status: b.status,
                comments: b.comments,
                timing: b.timing,     //this is returned
                NO_U: b.numberOfUnits,
                totalTime: b.estimateTotalTime_minutes,
                totalCost: b.estimateTotalCost,
                reassignmentReason: b.reasonOfReassignment,


            };
          })
        );
      }

      //technciican data is fetched here, but its only for display
      const techRes = await fetch(`${API}/bookings/technicians`, { headers });
      const techData = await techRes.json();
      if (techRes.ok && techData.success && Array.isArray(techData.technicians)) {
        setTechnicians(techData.technicians);
      }
    } catch (err) {
      console.error("Error fetching booking data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Filter, then sort
  const visibleBookings = useMemo(() => {
    const q = search.toLowerCase();
    const dir = sortDir === "asc" ? 1 : -1;

    return bookings
      .filter((booking) => {
        const matchesStatus = activeStatus === "All" || booking.status === activeStatus;
        const matchesSearch =
          booking.customer_name.toLowerCase().includes(q) ||
          booking.id.toLowerCase().includes(q) ||
          booking.technician_name.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortKey === "booking_ID") return (Number(a.booking_ID) - Number(b.booking_ID)) * dir;
        return String(a[sortKey]).localeCompare(String(b[sortKey])) * dir;
      });
  }, [bookings, search, activeStatus, sortKey, sortDir]);
const timingOptions = ["Morning", "Afternoon"];
  const isReassign = modal?.mode === "assign" && Boolean(modal.record.technician_ID);

  // When reassigning, the current technician is not offered again
  /**IT IS BELOW  THIS KEY VALUE PAIRS THAT HOLDS THE TECHNICIAN OPTIONS.
   * so sum, u would need below method to call an api to get only technicians that r free, for that date n time
   */
//bro, below gets all the  technicians but if we want one that filters by date time need to make another one of these or something, depends on ur api
  const technicianOptions = technicians
    .map((t) => ({
      label: t.technician_name || t.username,
      value: String(t.technician_ID),
    }))
    .filter((o) => !isReassign || o.value !== modal.record.technician_ID);

  // Reschedule requests: change time only.
// Confirmed bookings: allow technician reassignment.
// Everything else remains read-only.
const isRescheduleRequested =
  String(modal?.record?.status || "").toLowerCase() ===
  "reschedule_requested";

  // wat the modal shows when in assigning mode ======================================================================================
const assignFields = [
  {
    key: "id",
    label: "Booking ID",
    type: "text",
    readOnly: true,
  },
  {
    key: "customer_name",
    label: "Customer",
    type: "text",
    readOnly: true,
  },
  {
    key: "booking_date",
    label: "Service Date",
    type: "text",
    readOnly: true,
  },
  {
    key: "timing",
    label: "Time slot",
    type:"text",
    readOnly: true,
  },
  {
    key: "status",
    label: "Status",
    type: "text",
    readOnly: true,
  },

  ...(isReassign
    ? [
        {
          key: "technician_name",
          label: "Current Technician",
          type: "text",
          readOnly: true,
        },
      ]
    : []),


    //tehcnician fields ----------------------------------------------
    //This is the field definition that tells RecordModal.jsx to display a dropdown.
    /***key: "technician_ID" identifies the form value.
              label controls the text displayed above the dropdown.
              type: "select" tells the modal to render a dropdown.
              options: technicianOptions supplies the choices. */
  {
    key: "technician_ID",
    label: isReassign ? "New Technician" : "Technician",
    type: "select",
    required: true,
    options: technicianOptions,
  },

  /**   the original am pm time 
   *  {
    key: "newTime",
    label: isRescheduleRequested
      ? "New Booking Time"
      : "Booking Time",
    type: "time",
    required: isRescheduleRequested,
    readOnly: !isRescheduleRequested,
  },*/
 

  ...(isReassign
    ? [
        {
          key: "reason",
          label: "Reason for reassignment",
          type: "text",
           options: timingOptions,
          required: true,
        },
      ]
    : []),
];

//alternative field for request rescheduel----------------------------------------------

const alternativeFields = [
  {
    key: "option1_date",
    label: "Alternative 1 — Date",
    type: "date",
    required: true,
  },
  {
    key: "option1_time",
    label: "Alternative 1 — Time",
    type: "select",
    options: timingOptions,
    required: true,
  },
  {
    key: "option1_technician_ID",
    label: "Alternative 1 — Technician",
    type: "select",
    options: technicianOptions,
    required: true,
  },

  {
    key: "option2_date",
    label: "Alternative 2 — Date",
    type: "date",
    required: true,
  },
  {
    key: "option2_time",
    label: "Alternative 2 — Time",
    type: "select",
    options: timingOptions,
    required: true,
  },
  {
    key: "option2_technician_ID",
    label: "Alternative 2 — Technician",
    type: "select",
    options: technicianOptions,
    required: true,
  },

  {
    key: "option3_date",
    label: "Alternative 3 — Date",
    type: "date",
    required: true,
  },
  {
    key: "option3_time",
    label: "Alternative 3 — Time",
    type: "select",
    options: timingOptions,
    required: true,
  },
  {
    key: "option3_technician_ID",
    label: "Alternative 3 — Technician",
    type: "select",
    options: technicianOptions,
    required: true,
  },
];


//wat shows when modal opens ===================================================================
const viewFields = [
  { key: "id", label: "Booking ID" },
  { key: "customer_name", label: "Customer" },
  { key: "technician_name", label: "Technician" },
  { key: "booking_date", label: "Service Date" },
 // { key: "processedTime", label: "Booking Time" },
  { key: "status", label: "Status" },
  {key: "timing", label: "Time Slot"} //new
];

//this duc fucker======================================================================
//sends data to api
const handleAssign = async (formData) => {
  const record = modal.record;

  //get the booking status
  const status = String(record.status || "") .trim() .toLowerCase();
   
   

    //similiar to modal, states a var to be according to spelling
  const isConfirmed = status === "confirmed";

  const isRescheduleRequested = [ "request_reschedule","reschedule_requested",].includes(status);
   
    
  

  //when its a fresh booking, pending status with no technician assigned
  const isInitialAssignment =status === "pending" &&  !record.technician_ID;
    
  

    console.log("Booking status:", record.status);
console.log("Normalized status:", status);
console.log("Technician ID:", record.technician_ID);
console.log("Is confirmed:", isConfirmed);
console.log("Is reschedule:", isRescheduleRequested);
console.log("Is initial assignment:", isInitialAssignment);

  if (
    !isConfirmed &&
    !isRescheduleRequested &&
    !isInitialAssignment
  ) {
    showToast("Error: This booking cannot be edited using this form");
    return;
  }

  if (isTooFarAhead(record, assignLimit)) {
    showToast(
      `Error: Bookings can only be assigned up to ${MAX_MONTHS_AHEAD} months ahead`
    );
    return;
  }

  let endpoint;  //this var shared among all cases, will change so that api method is fixed
  let requestBody;

  if (isConfirmed) {
    // Confirmed status 
    // // change technician and reason only.--------------------------------------------------------------
    const technicianId = String(formData.technician_ID || "");
    const reason = String(formData.reason || "").trim();

    if (!technicianId) {
      showToast("Error: Please select a technician");
      return;
    }

    if (technicianId === String(record.technician_ID || "")) {
      showToast("Error: Please choose a different technician");
      return;
    }

    if (!reason) {
      showToast("Error: A reason is required to reassign");
      return;
    }

    endpoint = `${API}/bookings/${record.booking_ID}/reassign`;
     

    requestBody = {
      technician_ID: Number(technicianId),
      reason,
    };
 } else if (isRescheduleRequested) {
  // for request reschedule status -------------------------------------------------------------
              const newTime = String(formData.newTime || "").trim();
              const technicianId = String(formData.technician_ID || "");
              const currentTime = String(record.processedTime || "").slice(0, 5);

              if (!technicianId) {
                showToast("Error: Please select a technician");
                return;
              }

              if (!newTime) {
                showToast("Error: Please select a new booking time");
                return;
              }

              if (newTime.slice(0, 5) === currentTime) {
                showToast("Error: Please choose a different booking time");
                return;
              }

              endpoint = `${API}/bookings/${record.booking_ID}/reschedule`;

              requestBody = {
                technician_ID: Number(technicianId),
                time: newTime,
              };
  }

else {
  // New pending booking: assign its first technician.---------------------------------------
  const technicianId = String(formData.technician_ID || "");
  const bookingTime = String(formData.newTime || "").trim();

  if (!technicianId) {
    showToast("Error: Please select a technician");
    return;
  }
/**  if (!bookingTime) {
    showToast("Error: Booking time is missing");
    return;
  } */


  endpoint = `${API}/bookings/${record.booking_ID}/status`;

  requestBody = {
    technician_ID: Number(technicianId),
    time: bookingTime,
    status: "confirmed",   //assume technicians available, can just confirm straight away since its the date n time customer wants
    // only for this sprint
  };
}

//send data to db, endpoint adapts to either result-------------------------------------------------------
  try {
    const token = localStorage.getItem("token") || "";

    console.log("Endpoint:", endpoint);
    console.log("Request payload:", requestBody);

    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await res.text();
    console.log("HTTP status:", res.status);
    console.log("Response:", responseText);

    let result = {};

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error(
        `Server returned invalid JSON (HTTP ${res.status}): ${responseText}`
      );
    }

    if (!res.ok) {
      throw new Error(
        result.message || `Request failed (HTTP ${res.status})`
      );
    }

    showToast(
      isConfirmed
        ? `${record.id} reassigned successfully`
        : isRescheduleRequested
          ? `${record.id} booking time updated successfully`
          : `${record.id} technician assigned successfully`
    );

    setModal(null);
    await fetchData();
  } catch (err) {
    console.error("Booking update failed:", err);
    showToast(`Error: ${err.message}`);
  }
};

  //end of shit===================================



// Action : Admin proposes three alternative date/time options

const handleProposeAlternatives = async (formData) => {
  const record = modal.record;

  const alternatives = [
    {
      date: formData.option1_date,
      time: formData.option1_time,
      technician_ID: Number(formData.option1_technician_ID),
    },
    {
      date: formData.option2_date,
      time: formData.option2_time,
      technician_ID: Number(formData.option2_technician_ID),
    },
    {
      date: formData.option3_date,
      time: formData.option3_time,
      technician_ID: Number(formData.option3_technician_ID),
    },
  ];

  // Validate all nine values.
  if (
    alternatives.some(
      (option) =>
        !option.date ||
        !option.time ||
        !Number.isInteger(option.technician_ID) ||
        option.technician_ID <= 0
    )
  ) {
    showToast("Complete all three alternatives.");
    return;
  }

  // Ensure the date/time combinations are different.
  const uniqueOptions = new Set(
    alternatives.map((option) => `${option.date}T${option.time}`)
  );

  if (uniqueOptions.size !== 3) {
    showToast("Please enter three different date/time options.");
    return;
  }

  try {
    const token = localStorage.getItem("token") || "";
//`${API}/bookings/${record.booking_ID}/reassign`
    const response = await fetch(
      `${API}/bookings/${record.booking_ID}/alternatives`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ alternatives }),
      }
    );
    console.log( alternatives );
   // const result = await response.json();
    

const responseText = await response.text(); 

console.log("Alternatives HTTP status:", response.status);
console.log("Alternatives response body:", responseText);

let result = {};

if (responseText) {
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Invalid server response: ${responseText}`
    );
  }
}
/**if (!response.ok) {
  throw new Error(
    result.message || `Request failed (HTTP ${response.status})`
  );
}
 */

showToast("Alternative options submitted successfully.");

setModal(null);
setModalAction("default");

await fetchData();
  }catch(err){

  }

/** if (!response.ok) {
      throw new Error(
        result.message || "Failed to submit alternative options."
      );
    
    

    showToast("Alternative options submitted successfully.");
    setModal(null);
    setModalAction("default");
    await fetchData();
  } catch (err) {
    console.error("Submitting alternatives failed:", err);
    showToast(`Error: ${err.message}`);
  }
}*/


};//end of fucking method


  const sortIndicator = (key) => (key === sortKey ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  //component html===================================================================================================
  return (
    <div className="dash">
      {/* Keep this equal to the label in Sidebar.jsx; change both together when renaming */}
      <Sidebar active="Manage Bookings" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Assign Technician to Booking</h1>
            <p>
              Assign or reassign a technician. Bookings dated after {assignLimit} (more than {MAX_MONTHS_AHEAD}{" "}
              months ahead) cannot be assigned yet.
            </p>
          </div>
        </header>

        <section className="dash-panel">
          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by customer, technician or booking ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="dash-chips">
              {statusFilters.map((status) => (
                <button
                  key={status}
                  className={`dash-chip${status === activeStatus ? " is-active" : ""}`}
                  onClick={() => setActiveStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

                {/**the table of bookings themselves=============================================================== */}
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                {/** the columns */}
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{ cursor: "pointer", userSelect: "none" }}
                      title="Click to sort"
                    >
                      {col.label}
                      {sortIndicator(col.key)}
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "24px" }}>
                      Loading bookings from database...
                    </td>
                  </tr>
                ) : visibleBookings.length > 0 ? (
                  visibleBookings.map((booking) => {
                    const tooFar = isTooFarAhead(booking, assignLimit);

                    {/**THIS IS ACTUAL DATA--------------------------------------------------------------- */}
                    {/**the rows */}
                    return (
                      <tr key={booking.booking_ID}>
      {/**booking id */}                  <td className="dash-mono">{booking.id}</td>
         {/**customer */}                   <td><strong>{booking.customer_name}</strong></td>
              {/**technician */}              <td>{booking.technician_name}</td>
          {/** date */}                  <td className="dash-mono">{booking.booking_date || "Pending"}</td>
        {/** processed time*/}     {/**<td className="dash-mono"> */}  {/*{booking.processedTime}*/}{/** </td>*/}
         {/**is followup */} <td> {String(booking.isFollowup) }</td>     {/**not showing properly */}
         {/**location */} <td> {booking.customerAddress}</td>
         {/**status */}                    <td>  <span className={`dash-status dash-status-${statusTone[booking.status] || "accent"}`}>  <i />    {booking.status}  </span> </td>
                        {/**comment */} <td>  {booking.comments}</td>
                        {/**timing */} <td> {booking.timing}</td>    
                        {/**number of units */} <td> {booking.NO_U}</td> {/**not showing properly */}
                        {/**total time */} <td> {booking.totalTime}</td>
                        {/**total cost */} <td> { booking.totalCost} </td>
                        {/**reason for reassignment */} <td> {booking.reassignmentReason} </td>                   
                        



                       {/**action buttons  -----------------------------------------------------------------------------------*/}
                        <td>
                          <div className="dash-row-actions">
                            {/***the button that opens the modal, each role has one
                             * note the mode of the method
                             */}
                            <button
                              className="dash-row-btn"
                              onClick={() => setModal({ mode: "view", record: booking })}
                            >
                              View
                            </button>
                            
                              {/**open modal in assign mode */}
                            {isOpen(booking) && (
                              <button
                                className="dash-row-btn"
                                disabled={tooFar}
                                style={tooFar ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                                title={
                                  tooFar
                                    ? `Can only assign bookings up to ${MAX_MONTHS_AHEAD} months ahead (until ${assignLimit})`
                                    : undefined
                                }
                              
                                onClick={() => setModal({ mode: "assign", record: booking })}
                              >
                                {booking.technician_ID ? "Reassign" : "Assign"}
                              </button>
                            )}
                          </div>
                        </td>


                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      No bookings match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dash-pagination">
            <span>Showing {visibleBookings.length} of {bookings.length} bookings</span>
          </div>
        </section>
      </main>


{/**modal controller ------------------------------------------------------------ */}
     {/** modal &&  - Only displays the modal when modal is not null. */} {/**
      * mode= - Chooses edit mode for Assign/Reassign and view mode for View.
      * title -  Sets the modal's heading.
      * fields - Chooses which fields appear inside it.
      * data - Supplies the selected booking's data.
      *on close -  Closes the modal by resetting modal to null.
      on save  - Sends the form data to your parent component's save handler.
      * 
      */}
      {modal && (  
        <RecordModal
        alternativeFields={alternativeFields}
          mode={modal.mode === "assign" ? "edit" : "view"} 
          title={
            modal.mode === "assign" ? isReassign
          
                ? "Reassign Technician": "Assign Technician"  : "Booking Details"
                
            
          }
          fields={modal.mode === "assign" ? assignFields : viewFields}
          data={modal.mode === "assign" ? { ...modal.record, technician_ID: "", reason: "" } : modal.record}
      onClose={() => {
  setModal(null);
  setModalAction("default");
}}
onSave={handleAssign}
onProposeAlternatives={(nextAction) =>
  setModalAction(nextAction === "default" ? "default" : "propose")
}action={modalAction}
onSaveAlternatives={handleProposeAlternatives}

          // onProposeAlternatives={(formData) =>      handleProposeAlternatives(formData)  }
            //method for admin to suggest dates
  
        />
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  );
};

export default AssignTechnician;  //so this is suppose to be assign technicican. jsx if u follow proper naming convention
