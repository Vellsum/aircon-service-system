import React, { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const API = "http://localhost:5000/api/admin";
const MAX_MONTHS_AHEAD = 2;

const statusTone = {
  Confirmed: "success",
  Pending: "warning",
  Assigned: "accent",
  Completed: "success",
  Cancelled: "danger",
};

const statusFilters = ["All", "Confirmed", "Pending", "Assigned", "Completed", "Cancelled"];

//this is wat the columns r . key is key, label is text. following order in db
const columns = [
  { key: "booking_ID", label: "Booking ID" },
  { key: "customer_name", label: "Customer" },
  { key: "technician_name", label: "Technician" },
  { key: "booking_date", label: "Date" },
  {key: "processedTime", label: "Time"},
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
              processedTime: b.time,
              isFollowup: b.isFollowup,
              customerAddress: b.location,
                status: b.status,
                comments: b.comments,
                timing: b.timing,
                NO_U: b.numberOfUnits,
                totalTime: b.estimateTotalTime_minutes,
                totalCost: b.estimateTotalCost,
                reassignmentReason: b.reasonOfReassignment,


            };
          })
        );
      }

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

  const isReassign = modal?.mode === "assign" && Boolean(modal.record.technician_ID);

  // When reassigning, the current technician is not offered again
  const technicianOptions = technicians
    .map((t) => ({
      label: t.technician_name || t.username,
      value: String(t.technician_ID),
    }))
    .filter((o) => !isReassign || o.value !== modal.record.technician_ID);

  // Everything is read-only except the technician (and the reason when reassigning)
  const assignFields = [
    { key: "id", label: "Booking ID", type: "text", readOnly: true },
    { key: "customer_name", label: "Customer", type: "text", readOnly: true },
    { key: "booking_date", label: "Booking Date", type: "text", readOnly: true },
    { key: "status", label: "Status", type: "text", readOnly: true },
    ...(isReassign
      ? [{ key: "technician_name", label: "Current Technician", type: "text", readOnly: true }]
      : []),
    {
      key: "technician_ID",
      label: isReassign ? "New Technician" : "Technician",
      type: "select",
      required: true,
      options: technicianOptions,
    },
    ...(isReassign
      ? [{ key: "reason", label: "Reason for reassignment", type: "text", required: true }]
      : []),
  ];

  const viewFields = [
    { key: "id", label: "Booking ID" },
    { key: "customer_name", label: "Customer" },
    { key: "technician_name", label: "Technician" },
    { key: "booking_date", label: "Booking Date" },
    { key: "status", label: "Status" },
  ];

  const handleAssign = async (formData) => {
    const record = modal.record;

    if (!formData.technician_ID) {
      showToast("Error: Please select a technician");
      return;
    }
    if (isReassign && formData.technician_ID === record.technician_ID) {
      showToast("Error: Please choose a different technician");
      return;
    }
    const reason = String(formData.reason || "").trim();
    if (isReassign && !reason) {
      showToast("Error: A reason is required to reassign");
      return;
    }
    if (isTooFarAhead(record, assignLimit)) {
      showToast(`Error: Technicians can only be assigned up to ${MAX_MONTHS_AHEAD} months ahead`);
      return;
    }

    try {
      const token = localStorage.getItem("token") || "";

      // Assigning a technician moves an open booking to "Assigned"
      const nextStatus = ["Pending", "Confirmed"].includes(record.status) ? "Assigned" : record.status;

      const res = await fetch(`${API}/bookings/${record.booking_ID}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          technician_ID: parseInt(formData.technician_ID, 10),
          status: nextStatus,
          ...(isReassign && { reason }),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to assign technician");

      showToast(isReassign ? `${record.id} reassigned` : `Technician assigned to ${record.id}`);
      setModal(null);
      fetchData();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

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
        {/** processed time*/}      <td className="dash-mono"> {booking.processedTime}</td>
         {/**is followup */} <td> {String(booking.isFollowup) }</td>     {/**not showing properly */}
         {/**location */} <td> {booking.customerAddress}</td>
         {/**status */}                    <td>  <span className={`dash-status dash-status-${statusTone[booking.status] || "accent"}`}>  <i />    {booking.status}  </span> </td>
                        {/**comment */} <td>  {booking.comments}</td>
                        {/**timing */} <td> {booking.timing}</td>    
                        {/**number of units */} <td> {booking.NO_U}</td> {/**not showing properly */}
                        {/**total time */} <td> {booking.totalTime}</td>
                        {/**total cost */} <td> { booking.totalCost} </td>
                        {/**reason for reassignment */} <td> {booking. reasonOfReassignment} </td>                   
                        
                       {/**action buttons  */}
                        <td>
                          <div className="dash-row-actions">
                            <button
                              className="dash-row-btn"
                              onClick={() => setModal({ mode: "view", record: booking })}
                            >
                              View
                            </button>
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

      {modal && (
        <RecordModal
          mode={modal.mode === "assign" ? "edit" : "view"}
          title={
            modal.mode === "assign"
              ? isReassign
                ? "Reassign Technician"
                : "Assign Technician"
              : "Booking Details"
          }
          fields={modal.mode === "assign" ? assignFields : viewFields}
          data={modal.mode === "assign" ? { ...modal.record, technician_ID: "", reason: "" } : modal.record}
          onClose={() => setModal(null)}
          onSave={handleAssign}
        />
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  );
};

export default AssignTechnician;
