import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const API = "http://localhost:5000/api/admin";

const statusTone = {
  Confirmed: "success",
  Pending: "warning",
  Assigned: "accent",
  Completed: "success",
  Cancelled: "danger",
};

const statusFilters = ["All", "Confirmed", "Pending", "Assigned", "Completed", "Cancelled"];

// Admin can only assign/reassign while the booking is still open
const isAssignable = (booking) => !["Completed", "Cancelled"].includes(booking.status);

const AssignTechnician = () => {
  const [bookings, setBookings] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null); // { mode: "view" | "assign", record }
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const formatLocalDateString = (dateInput) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const bookRes = await fetch(`${API}/bookings`, { headers });
      const bookData = await bookRes.json();
      if (bookRes.ok && bookData.success && Array.isArray(bookData.bookings)) {
        setBookings(
          bookData.bookings.map((b) => {
            const rawId = b.booking_ID || b.id || 0;
            return {
              booking_ID: rawId,
              id: `#BK${String(rawId).padStart(3, "0")}`,
              customer_name: b.customer_name || "Guest Customer",
              technician_ID: b.technician_ID ? String(b.technician_ID) : "",
              technician_name: b.technician_name || "Unassigned",
              booking_date: formatLocalDateString(b.booking_date),
              status: b.status || "Pending",
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

  const filtered = bookings.filter((booking) => {
    const q = search.toLowerCase();
    const matchesStatus = activeStatus === "All" || booking.status === activeStatus;
    const matchesSearch =
      booking.customer_name.toLowerCase().includes(q) ||
      booking.id.toLowerCase().includes(q) ||
      booking.technician_name.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const technicianOptions = technicians.map((t) => ({
    label: t.technician_name || t.username,
    value: String(t.technician_ID),
  }));

  // Everything is read-only except the technician dropdown
  const assignFields = [
    { key: "id", label: "Booking ID", type: "text", readOnly: true },
    { key: "customer_name", label: "Customer", type: "text", readOnly: true },
    { key: "booking_date", label: "Booking Date", type: "text", readOnly: true },
    { key: "status", label: "Status", type: "text", readOnly: true },
    { key: "technician_ID", label: "Technician", type: "select", required: true, options: technicianOptions },
  ];

  const viewFields = [
    { key: "id", label: "Booking ID" },
    { key: "customer_name", label: "Customer" },
    { key: "technician_name", label: "Technician" },
    { key: "booking_date", label: "Booking Date" },
    { key: "status", label: "Status" },
  ];

  const handleAssign = async (formData) => {
    if (!formData.technician_ID) {
      showToast("Error: Please select a technician");
      return;
    }

    try {
      const token = localStorage.getItem("token") || "";
      const record = modal.record;

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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to assign technician");

      showToast(`Technician assigned to ${record.id}`);
      setModal(null);
      fetchData();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="dash">
      <Sidebar active="Assign Technician" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Assign Technician to Booking</h1>
            <p>Assign or reassign a technician to each Cool Fix service booking</p>
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

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Technician</th>
                  <th>Date</th>
                  <th>Status</th>
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
                ) : filtered.length > 0 ? (
                  filtered.map((booking) => (
                    <tr key={booking.booking_ID}>
                      <td className="dash-mono">{booking.id}</td>
                      <td><strong>{booking.customer_name}</strong></td>
                      <td>{booking.technician_name}</td>
                      <td className="dash-mono">{booking.booking_date || "Pending"}</td>
                      <td>
                        <span className={`dash-status dash-status-${statusTone[booking.status] || "accent"}`}>
                          <i />
                          {booking.status}
                        </span>
                      </td>
                      <td>
                        <div className="dash-row-actions">
                          <button className="dash-row-btn" onClick={() => setModal({ mode: "view", record: booking })}>
                            View
                          </button>
                          {isAssignable(booking) && (
                            <button className="dash-row-btn" onClick={() => setModal({ mode: "assign", record: booking })}>
                              {booking.technician_ID ? "Reassign" : "Assign"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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
            <span>Showing {filtered.length} of {bookings.length} bookings</span>
          </div>
        </section>
      </main>

      {modal && (
        <RecordModal
          mode={modal.mode === "assign" ? "edit" : "view"}
          title={modal.mode === "assign" ? "Assign Technician" : "Booking Details"}
          fields={modal.mode === "assign" ? assignFields : viewFields}
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={handleAssign}
        />
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  );
};

export default AssignTechnician;
