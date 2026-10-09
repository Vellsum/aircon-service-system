import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/admin/Sidebar";
import PortalWelcomeBanner from "../../components/common/PortalWelcomeBanner";
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

  // Fetch real data on component mount
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      // 1. Fetch Stats Metrics
      const statsRes = await fetch("http://localhost:5000/api/admin/dashboard/stats", { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.stats) {
          setDbStats(statsData.stats);
        }
      }

      // 2. Fetch Top Technicians Leaderboard
      const techRes = await fetch("http://localhost:5000/api/admin/dashboard/technicians", { headers });
      if (techRes.ok) {
        const techData = await techRes.json();
        if (techData.success && Array.isArray(techData.technicians)) {
          const formattedTechs = techData.technicians.map((t) => ({
            id: t.user_ID,
            username: t.username || `Technician #${t.user_ID}`,
            jobs: t.jobsDone || 0,
            initials: getInitials(t.username || "Tech"),
          }));
          setTopTechnicians(formattedTechs);
        }
      }

      // 3. Fetch Recent Bookings Table
      const bookingRes = await fetch("http://localhost:5000/api/admin/dashboard/recent-bookings", { headers });
      if (bookingRes.ok) {
        const bookingData = await bookingRes.json();
        if (bookingData.success && Array.isArray(bookingData.bookings)) {
          const formattedBookings = bookingData.bookings.slice(0, 5).map((b) => ({
            id: `#BK${String(b.booking_ID || b.id).padStart(3, "0")}`,
            customer: b.customer_name || "Guest Customer",
            service: "Aircon Servicing",
            technician: b.technician_name || "Unassigned",
            date: b.booking_date || "Pending",
            status: b.status || "Pending",
          }));
          setBookings(formattedBookings);
        }
      }
    } catch (err) {
      console.error("Error loading live dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const maxJobs = Math.max(...topTechnicians.map((t) => t.jobs), 1);

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
        <PortalWelcomeBanner
          title="Welcome back, Admin 👋"
          subtitle="Here's what's happening with your aircon service system today."
        />

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

          {/* Top Technicians Leaderboard (read-only) */}
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
    </div>
  );
};

export default AdminDashboard;
