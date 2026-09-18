import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import RecordModal from "../components/RecordModal";
import "../styles/shared.css";

const stats = [
  { label: "Total Bookings", value: "128", delta: "↑ 12% vs Aug 2026", tone: "accent", icon: "📅" },
  { label: "Active Technicians", value: "24", delta: "Available now", tone: "cyan", icon: "🛠" },
  { label: "Customers", value: "356", delta: "Registered total", tone: "accent", icon: "👥" },
  { label: "Monthly Revenue", value: "$18,450", delta: "↑ 8.5% vs Aug 2026", tone: "success", icon: "💰" },
];

const statusTone = {
  Confirmed: "success",
  Pending: "warning",
  Assigned: "accent",
};

const initialBookings = [
  { id: "#BK001", customer: "John Tan", service: "Aircon Servicing", technician: "Michael", date: "04 Sep 2026", status: "Confirmed" },
  { id: "#BK002", customer: "Sarah Lim", service: "Chemical Cleaning", technician: "David", date: "04 Sep 2026", status: "Pending" },
  { id: "#BK003", customer: "James Lee", service: "Aircon Repair", technician: "Alex", date: "05 Sep 2026", status: "Assigned" },
];

const revenueTrend = [
  { label: "Apr", value: 12800 },
  { label: "May", value: 14200 },
  { label: "Jun", value: 13950 },
  { label: "Jul", value: 16700 },
  { label: "Aug", value: 17100 },
  { label: "Sep", value: 18450 },
];

const maxRevenue = Math.max(...revenueTrend.map((m) => m.value));

const initialTopTechnicians = [
  { id: "#TC001", name: "Michael Chua", jobs: 142, initials: "MC" },
  { id: "#TC002", name: "Alex Foo", jobs: 176, initials: "AF" },
  { id: "#TC003", name: "David Krishnan", jobs: 98, initials: "DK" },
];

const techLeaderboardFields = [
  { key: "name", label: "Name", type: "text" },
  { key: "jobs", label: "Jobs Done", type: "number" },
];

const quickActionSchemas = {
  booking: {
    title: "New Booking",
    icon: "📅",
    fields: [
      { key: "customer", label: "Customer", type: "text" },
      { key: "service", label: "Service", type: "text" },
      { key: "technician", label: "Technician", type: "text" },
      { key: "date", label: "Date", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Confirmed", "Pending", "Assigned"] },
    ],
  },
  technician: {
    title: "Add Technician",
    icon: "🛠",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "specialty", label: "Specialty", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Available", "On Job", "Off Duty"] },
    ],
  },
  service: {
    title: "Add Service",
    icon: "🧰",
    fields: [
      { key: "name", label: "Service Name", type: "text" },
      { key: "category", label: "Category", type: "select", options: ["Servicing", "Cleaning", "Repair", "Installation"] },
      { key: "price", label: "Price", type: "text" },
      { key: "duration", label: "Duration", type: "text" },
    ],
  },
  promotion: {
    title: "Create Promotion",
    icon: "🏷",
    fields: [
      { key: "code", label: "Promo Code", type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "discount", label: "Discount", type: "text" },
      { key: "validFrom", label: "Valid From", type: "text" },
      { key: "validTo", label: "Valid To", type: "text" },
    ],
  },
};

const quickActions = [
  { key: "booking", label: "New Booking" },
  { key: "technician", label: "Add Technician" },
  { key: "service", label: "Add Service" },
  { key: "promotion", label: "Create Promotion" },
];

const getInitials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const AdminDashboard = () => {
  const [bookings, setBookings] = useState(initialBookings);
  const [topTechnicians, setTopTechnicians] = useState(initialTopTechnicians);
  const [activeAction, setActiveAction] = useState(null);
  const [editingTech, setEditingTech] = useState(null);
  const [toast, setToast] = useState(null);

  const maxJobs = Math.max(...topTechnicians.map((t) => t.jobs));

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSave = (formData) => {
    if (activeAction === "booking") {
      const newId = `#BK${String(bookings.length + 1).padStart(3, "0")}`;
      setBookings([{ ...formData, id: newId }, ...bookings]);
      showToast("Booking created");
    } else {
      showToast(`${quickActionSchemas[activeAction].title} saved`);
    }
    setActiveAction(null);
  };

  const handleSaveTech = (formData) => {
    setTopTechnicians(
      topTechnicians.map((t) =>
        t.id === editingTech.id
          ? { ...t, name: formData.name, jobs: Number(formData.jobs), initials: getInitials(formData.name) }
          : t
      )
    );
    setEditingTech(null);
  };

  return (
    <div className="dash">
      <Sidebar active="Dashboard" />

      <main className="dash-main">
        <div className="dash-banner">
          <div>
            <h1>Welcome back, Admin 👋</h1>
            <p>Here's what's happening with your aircon service system today.</p>
          </div>
          <button className="dash-btn dash-btn-outline">Admin Profile</button>
        </div>

        <section className="dash-stats">
          {stats.map((stat) => (
            <div className={`dash-stat dash-stat-${stat.tone}`} key={stat.label}>
              <div className="dash-stat-icon">{stat.icon}</div>
              <p className="dash-stat-label">{stat.label}</p>
              <p className="dash-stat-value">{stat.value}</p>
              <p className="dash-stat-delta">{stat.delta}</p>
            </div>
          ))}
        </section>

        <section className="dash-panel">
          <h2>Quick Actions</h2>
          <div className="dash-actions">
            {quickActions.map((action) => (
              <button className="dash-action" key={action.key} onClick={() => setActiveAction(action.key)}>
                <span className="dash-action-plus">{quickActionSchemas[action.key].icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </section>

        <div className="dash-two-col">
          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Recent Bookings</h2>
              <button className="dash-btn dash-btn-ghost">View All</button>
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
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dash-panel">
            <h2>Top Technicians</h2>
            {topTechnicians.map((tech) => (
              <div className="dash-leaderboard-row" key={tech.id}>
                <div className="dash-avatar">{tech.initials}</div>
                <div style={{ flex: 1 }}>
                  <p className="dash-leaderboard-name">{tech.name}</p>
                  <div className="dash-leaderboard-track">
                    <div
                      className="dash-leaderboard-fill"
                      style={{ width: `${(tech.jobs / maxJobs) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="dash-leaderboard-value">{tech.jobs} jobs</span>
                <button className="dash-row-btn" onClick={() => setEditingTech(tech)}>
                  Edit
                </button>
              </div>
            ))}
          </section>
        </div>

        <section className="dash-panel" style={{ marginTop: 20 }}>
          <h2>Revenue Trend</h2>
          <div className="dash-chart">
            {revenueTrend.map((m) => (
              <div className="dash-chart-bar" key={m.label}>
                <span className="dash-chart-bar-value">${(m.value / 1000).toFixed(1)}k</span>
                <div
                  className="dash-chart-bar-fill"
                  style={{ height: `${(m.value / maxRevenue) * 100}%` }}
                />
                <span className="dash-chart-bar-label">{m.label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {activeAction && (
        <RecordModal
          mode="create"
          title={quickActionSchemas[activeAction].title}
          fields={quickActionSchemas[activeAction].fields}
          data={{}}
          onClose={() => setActiveAction(null)}
          onSave={handleSave}
        />
      )}

      {editingTech && (
        <RecordModal
          mode="edit"
          title="Edit Technician Ranking"
          fields={techLeaderboardFields}
          data={editingTech}
          onClose={() => setEditingTech(null)}
          onSave={handleSaveTech}
        />
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  );
};

export default AdminDashboard;
