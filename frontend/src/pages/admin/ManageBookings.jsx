import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

// Status badge styling map
const statusTone = {
  Confirmed: "success",
  Pending: "warning",
  Assigned: "accent",
  Completed: "success",
  Cancelled: "danger",
};

const statusFilters = ["All", "Confirmed", "Pending", "Assigned", "Completed", "Cancelled"];

const ManageBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null); // Structure: { mode: 'view' | 'edit' | 'create', record }
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Safe converter for database dates to local YYYY-MM-DD
  const formatLocalDateString = (dateInput) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Fetch bookings and technicians from Express backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 1. Fetch Bookings
      const bookRes = await fetch("http://localhost:5000/api/admin/bookings", { headers });
      const bookData = await bookRes.json();

      if (bookRes.ok && bookData.success && Array.isArray(bookData.bookings)) {
        const formatted = bookData.bookings.map((b) => {
          const rawId = b.booking_ID || b.id || 0;
          return {
            booking_ID: rawId,
            id: `#BK${String(rawId).padStart(3, "0")}`,
            customer_ID: b.customer_ID || "",
            customer_name: b.customer_name || "Guest Customer",
            technician_ID: b.technician_ID || "",
            technician_name: b.technician_name || "Unassigned",
            booking_date: formatLocalDateString(b.booking_date),
            status: b.status || "Pending",
            location: b.location || "Singapore",
            time: b.time || "09:00:00",
          };
        });
        setBookings(formatted);
      }

      // 2. Fetch Technicians list directly from user3.technician table
      const techRes = await fetch("http://localhost:5000/api/admin/bookings/technicians", { headers });
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

  // Filter bookings based on active status filter and search query
  const filtered = bookings.filter((booking) => {
    const matchesStatus = activeStatus === "All" || booking.status === activeStatus;
    const matchesSearch =
      (booking.customer_name && booking.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (booking.id && booking.id.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Modal schema configuration
  const isEditing = modal && modal.mode === "edit";

  const bookingFields = isEditing
    ? [
        { key: "customer_name", label: "Customer Name", type: "text", readOnly: true },
        { 
          key: "technician_ID", 
          label: "Technician", 
          type: "select", 
          options: technicians.map((t) => ({ 
            label: t.technician_name || t.username, 
            value: String(t.technician_ID) // Strictly bind value to technician_ID
          })) 
        },
        { key: "booking_date", label: "Booking Date", type: "date" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["Confirmed", "Pending", "Assigned", "Completed", "Cancelled"],
        },
      ]
    : [
        { key: "customer_ID", label: "Customer ID (Number, e.g. 1)", type: "text", required: true },
        { 
          key: "technician_ID", 
          label: "Technician", 
          type: "select", 
          options: technicians.map((t) => ({ 
            label: t.technician_name || t.username, 
            value: String(t.technician_ID) // Strictly bind value to technician_ID
          })) 
        },
        { key: "booking_date", label: "Booking Date", type: "date" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["Confirmed", "Pending", "Assigned", "Completed", "Cancelled"],
        },
      ];

  const bookingViewFields = [{ key: "id", label: "Booking ID" }, ...bookingFields];

  // Save handler for creating or updating bookings
  const handleSave = async (formData) => {
    const token = localStorage.getItem("token") || "";

    // Parse date into YYYY-MM-DD string
    let formattedDate = formData.booking_date || null;
    if (formattedDate) {
      const d = new Date(formattedDate);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        formattedDate = `${year}-${month}-${day}`;
      }
    }

    if (modal.mode === "create") {
      try {
        const res = await fetch("http://localhost:5000/api/admin/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customer_ID: parseInt(formData.customer_ID, 10) || 1, // Enforce integer ID
            technician_ID: formData.technician_ID ? parseInt(formData.technician_ID, 10) : null,
            booking_date: formattedDate,
            time: "09:00:00", // Satisfy NOT NULL [time]
            location: "Singapore Main Branch", // Satisfy NOT NULL [location]
            isFollowup: 0, // Satisfy NOT NULL [isFollowup]
            status: formData.status || "Pending",
            comments: "New booking request"
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create booking");

        showToast("Cool Fix booking created successfully!");
        setModal(null);
        fetchData();
      } catch (err) {
        showToast(`Error: ${err.message}`);
      }
    } else if (modal.mode === "edit") {
      try {
        const targetId = formData.booking_ID || (modal.record && modal.record.booking_ID);

        if (!targetId) throw new Error("Missing Booking ID for update request.");

        const res = await fetch(`http://localhost:5000/api/admin/bookings/${targetId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: formData.status,
            technician_ID: formData.technician_ID || null,
            booking_date: formattedDate,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update booking");

        showToast("Cool Fix booking updated successfully!");
        setModal(null);
        fetchData();
      } catch (err) {
        showToast(`Error: ${err.message}`);
      }
    }
  };

  const handleCancel = async (booking) => {
    if (!window.confirm(`Are you sure you want to cancel booking ${booking.id}?`)) return;

    try {
      const token = localStorage.getItem("token") || "";
      const targetId = booking.booking_ID;

      const res = await fetch(`http://localhost:5000/api/admin/bookings/${targetId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "Cancelled" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel booking");

      showToast(`Booking ${booking.id} set to Cancelled`);
      fetchData();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Bookings" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Bookings</h1>
            <p>View, filter, and manage all Cool Fix service bookings</p>
          </div>
          <button className="dash-btn dash-btn-primary" onClick={() => setModal({ mode: "create", record: {} })}>
            + New Booking
          </button>
        </header>

        <section className="dash-panel">
          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by customer name or booking ID..."
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
                          <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: booking })}>
                            Edit
                          </button>
                          <button className="dash-row-btn is-danger" onClick={() => handleCancel(booking)}>
                            Cancel
                          </button>
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
          mode={modal.mode}
          title={modal.mode === "create" ? "New Booking" : modal.mode === "edit" ? "Edit Booking" : "Booking Details"}
          fields={modal.mode === "view" ? bookingViewFields : bookingFields}
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  );
};

export default ManageBookings;