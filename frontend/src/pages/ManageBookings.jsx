import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import RecordModal from "../components/RecordModal";
import "../styles/shared.css";

const statusTone = {
  Confirmed: "success",
  Pending: "warning",
  Assigned: "accent",
  Completed: "success",
  Cancelled: "warning",
};

const initialBookings = [
  { id: "#BK001", customer: "John Tan", service: "Aircon Servicing", technician: "Michael", date: "04 Sep 2026", status: "Confirmed" },
  { id: "#BK002", customer: "Sarah Lim", service: "Chemical Cleaning", technician: "David", date: "04 Sep 2026", status: "Pending" },
  { id: "#BK003", customer: "James Lee", service: "Aircon Repair", technician: "Alex", date: "05 Sep 2026", status: "Assigned" },
  { id: "#BK004", customer: "Priya Nair", service: "Gas Top-up", technician: "Michael", date: "05 Sep 2026", status: "Confirmed" },
  { id: "#BK005", customer: "Wei Ling", service: "Aircon Servicing", technician: "David", date: "06 Sep 2026", status: "Completed" },
  { id: "#BK006", customer: "Ahmad Faiz", service: "Chemical Overhaul", technician: "Alex", date: "06 Sep 2026", status: "Pending" },
  { id: "#BK007", customer: "Rachel Ong", service: "Aircon Repair", technician: "Michael", date: "07 Sep 2026", status: "Cancelled" },
  { id: "#BK008", customer: "Kumar Selvam", service: "Aircon Servicing", technician: "David", date: "07 Sep 2026", status: "Confirmed" },
];

const statusFilters = ["All", "Confirmed", "Pending", "Assigned", "Completed", "Cancelled"];

const bookingFields = [
  { key: "customer", label: "Customer", type: "text" },
  { key: "service", label: "Service", type: "text" },
  { key: "technician", label: "Technician", type: "text" },
  { key: "date", label: "Date", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["Confirmed", "Pending", "Assigned", "Completed", "Cancelled"] },
];

const bookingViewFields = [{ key: "id", label: "Booking ID" }, ...bookingFields];

const ManageBookings = () => {
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null); // { mode: 'view' | 'edit' | 'create', record }

  const filtered = bookings.filter((booking) => {
    const matchesStatus = activeStatus === "All" || booking.status === activeStatus;
    const matchesSearch =
      booking.customer.toLowerCase().includes(search.toLowerCase()) ||
      booking.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSave = (formData) => {
    if (modal.mode === "create") {
      const newId = `#BK${String(bookings.length + 1).padStart(3, "0")}`;
      setBookings([{ ...formData, id: newId }, ...bookings]);
    } else {
      setBookings(bookings.map((b) => (b.id === modal.record.id ? { ...b, ...formData } : b)));
    }
    setModal(null);
  };

  const handleCancel = (booking) => {
    setBookings(bookings.map((b) => (b.id === booking.id ? { ...b, status: "Cancelled" } : b)));
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Bookings" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Bookings</h1>
            <p>View, filter, and manage all service bookings</p>
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
              placeholder="Search by customer or booking ID..."
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
                  <th>Service</th>
                  <th>Technician</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => (
                  <tr key={booking.id}>
                    <td className="dash-mono">{booking.id}</td>
                    <td>{booking.customer}</td>
                    <td>{booking.service}</td>
                    <td>{booking.technician}</td>
                    <td className="dash-mono">{booking.date}</td>
                    <td>
                      <span className={`dash-status dash-status-${statusTone[booking.status]}`}>
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
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      No bookings match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dash-pagination">
            <span>Showing {filtered.length} of {bookings.length} bookings</span>
            <div className="dash-pagination-controls">
              <button className="dash-row-btn">Prev</button>
              <button className="dash-row-btn">Next</button>
            </div>
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
    </div>
  );
};

export default ManageBookings;
