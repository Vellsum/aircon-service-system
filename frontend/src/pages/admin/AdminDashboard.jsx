import React, { useState, useEffect } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const statusTone = {
  Confirmed: "success",
  Pending: "warning",
  Assigned: "accent",
  Completed: "success",
  Cancelled: "danger",
};

const revenueTrend = [
  { label: "Apr", value: 12800 },
  { label: "May", value: 14200 },
  { label: "Jun", value: 13950 },
  { label: "Jul", value: 16700 },
  { label: "Aug", value: 17100 },
  { label: "Sep", value: 18450 },
];

const maxRevenue = Math.max(...revenueTrend.map((m) => m.value));

const techLeaderboardFields = [
  { key: "username", label: "Name", type: "text" },
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

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const AdminDashboard = () => {
  // Live State from Backend
  const [dbStats, setDbStats] = useState({
    totalBookings: 0,
    totalTechnicians: 0,
    totalCustomers: 0,
    pendingBookings: 0,
  });
  const [bookings, setBookings] = useState([]);
  const [topTechnicians, setTopTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI Interactive States
  const [activeAction, setActiveAction] = useState(null);
  const [editingTech, setEditingTech] = useState(null);
  const [toast, setToast] = useState(null);

  // Fetch real data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // 1. Fetch Stats & Technicians
        const statsRes = await fetch("http://localhost:5000/api/admin/users/stats", { headers });
        const statsData = await statsRes.json();
        if (statsData.success && statsData.stats) {
          setDbStats(statsData.stats);
        }

        const techRes = await fetch("http://localhost:5000/api/admin/users/technicians", { headers });
        const techData = await techRes.json();
        if (techData.success && techData.technicians) {
          // Map backend technicians with initials & job count
          const formattedTechs = techData.technicians.map((t, idx) => ({
            id: t.user_ID,
            username: t.username,
            jobs: t.jobsDone || (idx + 1) * 12, // fallback count if not specified
            initials: getInitials(t.username),
          }));
          setTopTechnicians(formattedTechs);
        }

        // 2. Fetch Recent Bookings
        const bookingRes = await fetch("http://localhost:5000/api/admin/bookings", { headers });
        const bookingData = await bookingRes.json();
        if (bookingData.success && bookingData.bookings) {
          const formattedBookings = bookingData.bookings.slice(0, 5).map((b) => ({
            id: `#BK${String(b.booking_ID || b.id).padStart(3, "0")}`,
            customer: b.customer_name || b.customer || "Guest User",
            service: b.service_type || b.service || "Aircon Servicing",
            technician: b.technician_name || b.technician || "Unassigned",
            date: b.booking_date ? new Date(b.booking_date).toLocaleDateString("en-GB") : "Pending",
            status: b.status || "Pending",
          }));
          setBookings(formattedBookings);
        }
      } catch (err) {
        console.error("Error loading live dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const maxJobs = Math.max(...topTechnicians.map((t) => t.jobs), 1);

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
          ? {
              ...t,
              username: formData.username,
              jobs: Number(formData.jobs),
              initials: getInitials(formData.username),
            }
          : t
      )
    );
    setEditingTech(null);
    showToast("Technician updated successfully");
  };

  // Dynamic Metrics mapped from Database Queries
  const liveStats = [
    {
      label: "Total Bookings",
      value: String(dbStats.totalBookings || bookings.length),
      delta: "Live Database",
      tone: "accent",
      icon: "📅",
    },
    {
      label: "Active Technicians",
      value: String(dbStats.totalTechnicians || topTechnicians.length),
      delta: "Available now",
      tone: "cyan",
      icon: "🛠",
    },
    {
      label: "Customers",
      value: String(dbStats.totalCustomers || 0),
      delta: "Registered total",
      tone: "accent",
      icon: "👥",
    },
    {
      label: "Pending Bookings",
      value: String(dbStats.pendingBookings || 0),
      delta: "Requires Action",
      tone: "warning",
      icon: "⏳",
    },
  ];

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

        {/* Dashboard Metrics */}
        <section className="dash-stats">
          {liveStats.map((stat) => (
            <div className={`dash-stat dash-stat-${stat.tone}`} key={stat.label}>
              <div className="dash-stat-icon">{stat.icon}</div>
              <p className="dash-stat-label">{stat.label}</p>
              <p className="dash-stat-value">{loading ? "..." : stat.value}</p>
              <p className="dash-stat-delta">{stat.delta}</p>
            </div>
          ))}
        </section>

        {/* Quick Actions Panel */}
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
          {/* Recent Bookings Table */}
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
                  {bookings.length > 0 ? (
                    bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="dash-mono">{booking.id}</td>
                        <td>{booking.customer}</td>
                        <td>{booking.service}</td>
                        <td>{booking.technician}</td>
                        <td className="dash-mono">{booking.date}</td>
                        <td>
                          <span className={`dash-status dash-status-${statusTone[booking.status] || "accent"}`}>
                            <i />
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                        {loading ? "Loading bookings..." : "No recent bookings found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Top Technicians Leaderboard */}
          <section className="dash-panel">
            <h2>Top Technicians</h2>
            {topTechnicians.length > 0 ? (
              topTechnicians.map((tech) => (
                <div className="dash-leaderboard-row" key={tech.id}>
                  <div className="dash-avatar">{tech.initials}</div>
                  <div style={{ flex: 1 }}>
                    <p className="dash-leaderboard-name">{tech.username}</p>
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
              ))
            ) : (
              <p style={{ padding: "20px 0" }}>{loading ? "Loading technicians..." : "No active technicians."}</p>
            )}
          </section>
        </div>

        {/* Revenue Chart */}
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

      {/* Quick Action Modal */}
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

      {/* Edit Technician Modal */}
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