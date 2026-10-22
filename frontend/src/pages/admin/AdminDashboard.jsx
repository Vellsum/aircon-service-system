import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar";
import PortalWelcomeBanner from "../../components/common/PortalWelcomeBanner";
import "../../styles/shared.css";

const API = "http://localhost:5000/api/admin";

const statusTone = {
  Confirmed: "success",
  Pending: "warning",
  Assigned: "accent",
  Completed: "success",
  Cancelled: "danger",
};

// NOTE: still sample data. Replace with a real revenue endpoint when one exists.
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

const formatLocalDateString = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

//component itself =====================================================================================
const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalBookings: 0,
    totalTechnicians: 0,
    totalCustomers: 0,
    pendingBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [topTechnicians, setTopTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Everything is computed from the same endpoints the management pages use,
  // so the dashboard always matches what admin sees there.
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token") || "";
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const [bookRes, techRes, custRes] = await Promise.all([
        fetch(`${API}/bookings`, { headers }),
        fetch(`${API}/bookings/technicians`, { headers }),
        fetch(`${API}/users/customers`, { headers }),
      ]);

      const [bookData, techData, custData] = await Promise.all([
        bookRes.json(),
        techRes.json(),
        custRes.json(),
      ]);

      const bookingList =
        bookRes.ok && Array.isArray(bookData.bookings) ? bookData.bookings : [];
      const technicianList =
        techRes.ok && Array.isArray(techData.technicians) ? techData.technicians : [];
      const customerList =
        custRes.ok && Array.isArray(custData.customers) ? custData.customers : [];

      if (!bookRes.ok || !techRes.ok || !custRes.ok) {
        setError("Some dashboard data could not be loaded from the server.");
      }

      // Stats
      setStats({
        totalBookings: bookingList.length,
        totalTechnicians: technicianList.length,
        totalCustomers: customerList.length,
        pendingBookings: bookingList.filter((b) => (b.status || "Pending") === "Pending").length,
      });

      // Recent bookings: newest 5
      const formatted = bookingList
        .map((b) => {
          const rawId = b.booking_ID || b.id || 0;
          return {
            rawId,
            id: `#BK${String(rawId).padStart(3, "0")}`,
            customer: b.customer_name || "Guest Customer",
            technician: b.technician_name || "Unassigned",
            date: formatLocalDateString(b.booking_date) || "Pending",
            status: b.status || "Pending",
          };
        })
        .sort((a, b) => b.rawId - a.rawId)
        .slice(0, 5);
      setRecentBookings(formatted);

      // Top technicians: completed jobs per technician
      const jobsByTech = {};
      bookingList.forEach((b) => {
        if (b.status === "Completed" && b.technician_ID) {
          const key = String(b.technician_ID);
          jobsByTech[key] = (jobsByTech[key] || 0) + 1;
        }
      });
      const leaderboard = technicianList
        .map((t) => {
          const name = t.technician_name || t.username || `Technician #${t.technician_ID}`;
          return {
            id: t.technician_ID,
            username: name,
            jobs: jobsByTech[String(t.technician_ID)] || 0,
            initials: getInitials(name),
          };
        })
        .sort((a, b) => b.jobs - a.jobs)
        .slice(0, 5);
      setTopTechnicians(leaderboard);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Cannot reach the server. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const maxJobs = Math.max(...topTechnicians.map((t) => t.jobs), 1);

  const liveStats = [
    { label: "Total Bookings", value: stats.totalBookings, delta: "Live Database", tone: "accent", icon: "📅" },
    { label: "Active Technicians", value: stats.totalTechnicians, delta: "Available now", tone: "cyan", icon: "🛠" },
    { label: "Customers", value: stats.totalCustomers, delta: "Registered total", tone: "accent", icon: "👥" },
    { label: "Pending Bookings", value: stats.pendingBookings, delta: "Requires Action", tone: "warning", icon: "⏳" },
  ];


  //html of dashboard =================================================================================================================================
  return (
    <div className="dash">
      <Sidebar active="Dashboard" />

      <main className="dash-main">
        <PortalWelcomeBanner
          title="Welcome back, Admin 👋"
          subtitle="Here's what's happening with your aircon service system today."
        />

        {error && (
          <div
            style={{
              margin: "16px 0",
              padding: "12px 16px",
              borderRadius: 8,
              background: "#fef2f2",
              color: "#b91c1c",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{error}</span>
            <button className="dash-btn dash-btn-ghost" onClick={fetchDashboardData}>
              Retry
            </button>
          </div>
        )}

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
          {/* Recent Bookings */}
          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Recent Bookings</h2>
              <button className="dash-btn dash-btn-ghost" onClick={() => navigate("/admin/bookings")}>
                View All
              </button>
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
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.length > 0 ? (
                    recentBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="dash-mono">{booking.id}</td>
                        <td>{booking.customer}</td>
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
                      <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                        {loading ? "Loading bookings..." : "No recent bookings found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Top Technicians (read-only, completed jobs) */}
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

        {/* Revenue Chart (sample data) */}
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
