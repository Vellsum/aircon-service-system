/* ============================================================
   AdminDashboard.jsx — REVIEW FIXES 28 Oct 2026
   1. [FIX] Summary endpoint wiring — old code checked
      sJson.success + sJson.summary.byMonth, which never matched
      the controller (it returns ok + revenue.monthly). Now reads
      the real shape; year-view prefers server quarterly.
   2. [FIX] Ratings — merged from summary.techRatings (guaranteed
      source) because /bookings/technicians may not return the
      new technician_rating column. Fallback kept.
   3. [FIX] normStatus upgraded: underscores/hyphens → spaces +
      aliases, so 'in_progress'/'Request_Reschedule' style values
      no longer fall into pipeline "Other". Matches controller.
   4. [FIX] "Evening" session removed — db.sql defines timing as
      morning/afternoon only; the column was always-empty.
      Unknown timings counted in the footnote instead.
   5. [FIX] Free-count clamped at 0 (stray technician IDs).
   6. [FIX] Smart S$ formatting (no more "S$0.4k").
   Everything else (stats, pipeline, recent, queue, grid,
   calendar) unchanged from the 28 Oct "fully live" version.
   ============================================================ */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar";
import PortalWelcomeBanner from "../../components/common/PortalWelcomeBanner";
import "../../styles/shared.css";

const API = "http://localhost:5000/api/admin";

/* ---------- constants ---------- */
const SESSIONS = ["Morning", "Afternoon"]; // db.sql: timing = morning or afternoon
const BUSY_BLOCKERS = ["completed", "cancelled"]; // statuses that do NOT hold a slot
const AVAIL_DAYS = 14;

const PIPELINE = [
  { key: "pending", label: "Pending", color: "#f59e0b" },
  { key: "assigned", label: "Assigned", color: "#3b82f6" },
  { key: "confirmed", label: "Confirmed", color: "#14b8a6" },
  { key: "in progress", label: "In Progress", color: "#8b5cf6" },
  { key: "completed", label: "Completed", color: "#22c55e" },
];

const statusTone = {
  pending: "warning",
  assigned: "accent",
  confirmed: "success",
  "in progress": "accent",
  completed: "success",
  cancelled: "danger",
  "request reschedule": "warning",
  "rr pending": "warning",
  "rr reserved": "accent",
};

/* ---------- helpers ---------- */
const normStatus = (s) => {
  const k = String(s || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const alias = {
    inprogress: "in progress",
    ongoing: "in progress",
    canceled: "cancelled",
    done: "completed",
    scheduled: "confirmed",
  };
  return alias[k] || k;
};

const normSession = (t) => {
  const s = String(t || "").trim().toLowerCase();
  if (!s) return "Unspecified";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const toDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatLocalDateString = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return toDateKey(d);
};

const getInitials = (name = "") =>
  name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`; // m is 0-based

const fmtSgd = (v) => (v >= 1000 ? `S$${(v / 1000).toFixed(1)}k` : `S$${v}`);

function buildCalendarCells(anchor) {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // Monday = 0
  const cells = [];
  for (let i = 0; i < 42; i++) cells.push(new Date(y, m, 1 - offset + i));
  return cells;
}

/* ---------- component ---------- */
const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({ totalBookings: 0, totalTechnicians: 0, totalCustomers: 0, pendingBookings: 0 });
  const [bookings, setBookings] = useState([]);       // normalized rows
  const [technicians, setTechnicians] = useState([]); // {id, name, rating}
  const [recentBookings, setRecentBookings] = useState([]);
  const [topTechnicians, setTopTechnicians] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState({});
  const [revenueSource, setRevenueSource] = useState("computing...");
  const [serverSummary, setServerSummary] = useState(null); // ok:true payload from /dashboard/summary
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [revenueView, setRevenueView] = useState("6m"); // '6m' | 'year'
  const [calAnchor, setCalAnchor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedCalDate, setSelectedCalDate] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token") || "";
      const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

      const [bookRes, techRes, custRes] = await Promise.all([
        fetch(`${API}/bookings`, { headers }),
        fetch(`${API}/bookings/technicians`, { headers }),
        fetch(`${API}/users/customers`, { headers }),
      ]);

      const [bookData, techData, custData] = await Promise.all([
        bookRes.json().catch(() => ({})),
        techRes.json().catch(() => ({})),
        custRes.json().catch(() => ({})),
      ]);

      const rawBookings = bookRes.ok && Array.isArray(bookData.bookings) ? bookData.bookings : [];
      const rawTechs = techRes.ok && Array.isArray(techData.technicians) ? techData.technicians : [];
      const rawCustomers = custRes.ok && Array.isArray(custData.customers) ? custData.customers : [];

      if (!bookRes.ok || !techRes.ok || !custRes.ok) {
        setError("Some dashboard data could not be loaded from the server.");
      }

      /* Optional server summary (revenue + ratings). The dashboard
         still works fully if this endpoint is missing. */
      let summary = null;
      try {
        const sRes = await fetch(`${API}/dashboard/summary`, { headers });
        if (sRes.ok) {
          const sJson = await sRes.json();
          if (sJson && sJson.ok) summary = sJson;
        }
      } catch {
        /* optional endpoint */
      }
      setServerSummary(summary);

      /* Rating lookup: server summary first (it queries
         user3.technician directly), fallback to the technicians
         endpoint's own field if it ever includes it. */
      const ratingById = {};
      ((summary && summary.techRatings) || []).forEach((tr) => {
        const id = Number(tr.technician_ID ?? tr.technician_id ?? tr.id);
        if (!Number.isNaN(id)) ratingById[id] = Number(tr.technician_rating ?? tr.rating ?? 0);
      });

      const techs = rawTechs.map((t) => {
        const id = Number(t.technician_ID);
        return {
          id,
          name: t.technician_name || t.username || `Technician #${t.technician_ID}`,
          rating: Number(t.technician_rating ?? ratingById[id] ?? 0) || 0,
        };
      });

      /* Normalize once — every section below reads these */
      const books = rawBookings.map((b) => ({
        rawId: b.booking_ID || b.id || 0,
        statusKey: normStatus(b.status),
        statusLabel: b.status || "Pending",
        dateKey: formatLocalDateString(b.booking_date || b.date || b.appointment_date),
        session: normSession(b.timing),
        techId: b.technician_ID != null ? Number(b.technician_ID) : null,
        cost: Number(b.estimateTotalCost || 0),
        customer: b.customer_name || "Guest Customer",
        technician: b.technician_name || "Unassigned",
      }));

      setTechnicians(techs);
      setBookings(books);

      setStats({
        totalBookings: books.length,
        totalTechnicians: techs.length,
        totalCustomers: rawCustomers.length,
        pendingBookings: books.filter((b) => b.statusKey === "pending").length, // case-insensitive
      });

      setRecentBookings(
        books
          .map((b) => ({ ...b, displayId: `#BK${String(b.rawId).padStart(3, "0")}` }))
          .sort((a, b) => b.rawId - a.rawId)
          .slice(0, 5)
      );

      /* Top technicians: completed jobs + rating */
      const jobsByTech = {};
      books.forEach((b) => {
        if (b.statusKey === "completed" && b.techId != null) {
          jobsByTech[b.techId] = (jobsByTech[b.techId] || 0) + 1;
        }
      });
      setTopTechnicians(
        techs
          .map((t) => ({ ...t, jobs: jobsByTech[t.id] || 0, initials: getInitials(t.name) }))
          .sort((a, b) => b.jobs - a.jobs || b.rating - a.rating)
          .slice(0, 5)
      );

      /* Unassigned open bookings (no technician, still live) */
      setUnassigned(
        books
          .filter((b) => b.techId == null && !BUSY_BLOCKERS.includes(b.statusKey))
          .sort((a, b) => b.rawId - a.rawId)
          .slice(0, 6)
          .map((b) => ({ ...b, displayId: `#BK${String(b.rawId).padStart(3, "0")}` }))
      );

      /* Revenue: prefer the server summary, else compute client-side */
      let byMonth = {};
      books.forEach((b) => {
        if (b.statusKey === "completed" && b.dateKey) {
          const k = b.dateKey.slice(0, 7);
          byMonth[k] = (byMonth[k] || 0) + b.cost;
        }
      });
      let source = "computed client-side from /bookings";
      if (summary && Array.isArray(summary.revenue && summary.revenue.monthly) && summary.revenue.monthly.length) {
        byMonth = {};
        summary.revenue.monthly.forEach((m) => { byMonth[m.key] = Number(m.value) || 0; });
        source = "server summary endpoint";
      }
      setRevenueByMonth(byMonth);
      setRevenueSource(source);
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

  /* ---------- derived ---------- */
  const techNameById = useMemo(() => {
    const map = {};
    technicians.forEach((t) => { map[t.id] = t.name; });
    return map;
  }, [technicians]);

  /* busy = tech assigned AND status not Completed/Cancelled (RR_reserved holds the slot) */
  const busyByCell = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      if (BUSY_BLOCKERS.includes(b.statusKey)) return;
      if (b.techId == null || !b.dateKey) return;
      const key = `${b.dateKey}|${b.session}`;
      if (!map[key]) map[key] = new Set();
      map[key].add(b.techId);
    });
    return map;
  }, [bookings]);

  const cellBusy = (dateKey, session) => {
    const set = busyByCell[`${dateKey}|${session}`];
    return set ? [...set] : [];
  };

  /* open bookings whose timing is not Morning/Afternoon (incl. missing) */
  const unspecifiedCount = useMemo(
    () => bookings.filter((b) => !SESSIONS.includes(b.session) && !BUSY_BLOCKERS.includes(b.statusKey)).length,
    [bookings]
  );

  const pipeline = useMemo(() => {
    const counts = { pending: 0, assigned: 0, confirmed: 0, "in progress": 0, completed: 0 };
    bookings.forEach((b) => { if (counts[b.statusKey] != null) counts[b.statusKey] += 1; });
    const mapped = PIPELINE.reduce((sum, seg) => sum + counts[seg.key], 0);
    return { counts, total: bookings.length, other: bookings.length - mapped };
  }, [bookings]);

  const todayKey = toDateKey(new Date());

  const availRows = useMemo(() => {
    const now = new Date();
    const rows = [];
    for (let i = 0; i < AVAIL_DAYS; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      rows.push({
        key: toDateKey(d),
        isToday: i === 0,
        label: d.toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short" }),
      });
    }
    return rows;
  }, []); // fixed for this page load

  const revenueBars = useMemo(() => {
    const map = revenueByMonth || {};
    const now = new Date();
    if (revenueView === "6m") {
      const out = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const k = monthKey(d.getFullYear(), d.getMonth());
        out.push({ key: k, label: d.toLocaleDateString("en-SG", { month: "short" }), value: Number(map[k] || 0) });
      }
      return out;
    }
    /* year by quarter — prefer the server's quarterly (covers Jan–Dec) */
    if (serverSummary && Array.isArray(serverSummary.revenue && serverSummary.revenue.quarterly) && serverSummary.revenue.quarterly.length) {
      return serverSummary.revenue.quarterly.map((q, i) => ({
        key: `Q${i + 1}`,
        label: q.label ? q.label.split(" ")[0] : `Q${i + 1}`,
        value: Number(q.value) || 0,
      }));
    }
    const y = now.getFullYear();
    return [1, 2, 3, 4].map((q) => {
      let v = 0;
      for (let m = (q - 1) * 3; m < q * 3; m++) v += Number(map[monthKey(y, m)] || 0);
      return { key: `Q${q}-${y}`, label: `Q${q}`, value: v };
    });
  }, [revenueByMonth, revenueView, serverSummary]);

  const revenueMax = Math.max(...revenueBars.map((b) => b.value), 1);
  const revenueHasAny = revenueBars.some((b) => b.value > 0);

  const calCells = useMemo(() => buildCalendarCells(calAnchor), [calAnchor]);
  const calMonthLabel = calAnchor.toLocaleDateString("en-SG", { month: "long", year: "numeric" });

  const loadColor = (busyCount) => {
    if (!technicians.length) return "#cbd5e1";
    if (busyCount === 0) return "#22c55e";
    if (busyCount >= technicians.length) return "#ef4444";
    return "#f59e0b";
  };

  const calDetail = selectedCalDate
    ? SESSIONS.map((s) => {
        const who = cellBusy(selectedCalDate, s).map((id) => techNameById[id] || `Tech #${id}`);
        return `${s}: ${who.length ? `${who.join(", ")} busy` : "all free"}`;
      }).join(" · ")
    : null;

  const maxJobs = Math.max(...topTechnicians.map((t) => t.jobs), 1);

  const liveStats = [
    { label: "Total Bookings", value: stats.totalBookings, delta: "Live Database", tone: "accent", icon: "📅" },
    { label: "Active Technicians", value: stats.totalTechnicians, delta: "Available now", tone: "cyan", icon: "🛠" },
    { label: "Customers", value: stats.totalCustomers, delta: "Registered total", tone: "accent", icon: "👥" },
    { label: "Pending Bookings", value: stats.pendingBookings, delta: "Requires Action", tone: "warning", icon: "⏳" },
  ];

  return (
    <div className="dash">
      <Sidebar active="Dashboard" />

      <main className="dash-main">
        <PortalWelcomeBanner
          title="Welcome back, Admin 👋"
          subtitle="Here's what's happening with your aircon service system today."
        />

        {error && (
          <div style={{ margin: "16px 0", padding: "12px 16px", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{error}</span>
            <button className="dash-btn dash-btn-ghost" onClick={fetchDashboardData}>Retry</button>
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

        {/* Booking Pipeline */}
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Booking Pipeline</h2>
            <span className="dash-badge-warn">{pipeline.total} total</span>
          </div>
          <div className="dash-pipeline">
            {PIPELINE.map((seg) => (
              <div
                key={seg.key}
                title={`${seg.label}: ${pipeline.counts[seg.key]}`}
                style={{ width: `${pipeline.total ? (pipeline.counts[seg.key] / pipeline.total) * 100 : 0}%`, background: seg.color }}
              />
            ))}
            {pipeline.other > 0 && (
              <div title={`Other: ${pipeline.other}`} style={{ width: `${(pipeline.other / pipeline.total) * 100}%`, background: "#94a3b8" }} />
            )}
          </div>
          <div className="dash-pipeline-legend">
            {PIPELINE.map((seg) => (
              <span key={seg.key}>
                <i style={{ background: seg.color }} />{seg.label} <strong>{pipeline.counts[seg.key]}</strong>
              </span>
            ))}
            {pipeline.other > 0 && <span><i style={{ background: "#94a3b8" }} />Other <strong>{pipeline.other}</strong></span>}
          </div>
        </section>

        <div className="dash-two-col">
          {/* Recent Bookings */}
          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Recent Bookings</h2>
              <button className="dash-btn dash-btn-ghost" onClick={() => navigate("/admin/bookings")}>View All</button>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Booking ID</th><th>Customer</th><th>Technician</th><th>Date</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.length > 0 ? (
                    recentBookings.map((booking) => (
                      <tr key={booking.rawId}>
                        <td className="dash-mono">{booking.displayId}</td>
                        <td>{booking.customer}</td>
                        <td>{booking.technician}</td>
                        <td className="dash-mono">{booking.dateKey || "—"}</td>
                        <td>
                          <span className={`dash-status dash-status-${statusTone[booking.statusKey] || "accent"}`}>
                            <i />{booking.statusLabel}
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

          {/* Top Technicians (completed jobs + rating) */}
          <section className="dash-panel">
            <h2>Top Technicians</h2>
            {topTechnicians.length > 0 ? (
              topTechnicians.map((tech) => (
                <div className="dash-leaderboard-row" key={tech.id}>
                  <div className="dash-avatar">{tech.initials}</div>
                  <div style={{ flex: 1 }}>
                    <p className="dash-leaderboard-name">{tech.name}</p>
                    <div className="dash-leaderboard-track">
                      <div className="dash-leaderboard-fill" style={{ width: `${(tech.jobs / maxJobs) * 100}%` }} />
                    </div>
                  </div>
                  <span className="dash-leaderboard-value" style={{ textAlign: "right" }}>
                    {tech.jobs} jobs
                    {tech.rating > 0 && (
                      <span style={{ display: "block", fontSize: 11.5, color: "#f59e0b" }}>
                        {"★".repeat(Math.round(tech.rating))}{"☆".repeat(5 - Math.round(tech.rating))}
                      </span>
                    )}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ padding: "20px 0" }}>{loading ? "Loading technicians..." : "No active technicians."}</p>
            )}
          </section>
        </div>

        <div className="dash-two-col">
          {/* Revenue Trend — live */}
          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Revenue Trend</h2>
              <div className="dash-seg-toggle">
                <button className={revenueView === "6m" ? "active" : ""} onClick={() => setRevenueView("6m")}>Last 6 months</button>
                <button className={revenueView === "year" ? "active" : ""} onClick={() => setRevenueView("year")}>{new Date().getFullYear()} by quarter</button>
              </div>
            </div>
            {loading ? (
              <p style={{ padding: "20px 0" }}>Loading revenue...</p>
            ) : revenueHasAny ? (
              <div className="dash-chart">
                {revenueBars.map((bar) => (
                  <div className="dash-chart-bar" key={bar.key}>
                    <span className="dash-chart-bar-value">{bar.value > 0 ? fmtSgd(bar.value) : "—"}</span>
                    <div className="dash-chart-bar-fill" style={{ height: `${(bar.value / revenueMax) * 100}%` }} />
                    <span className="dash-chart-bar-label">{bar.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 13.5, color: "#92400e" }}>
                No completed bookings with <code>estimateTotalCost</code> yet — run the seed UPDATE (it derives each price from the booking's service) and this chart fills in.
              </div>
            )}
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#94a3b8" }}>Live from {revenueSource}.</p>
          </section>

          {/* Unassigned queue */}
          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Unassigned Bookings</h2>
              <span className="dash-badge-warn">{unassigned.length} waiting</span>
            </div>
            {unassigned.length > 0 ? (
              unassigned.map((b) => (
                <div className="dash-queue-row" key={b.rawId}>
                  <div>
                    <strong className="dash-mono">{b.displayId}</strong> — {b.customer}
                    <div style={{ fontSize: 12, color: "#64748b" }}>{b.dateKey || "No date"} · {b.session}</div>
                  </div>
                  <button className="dash-btn dash-btn-ghost" onClick={() => navigate("/admin/bookings")}>Assign</button>
                </div>
              ))
            ) : (
              <p style={{ padding: "14px 0", color: loading ? "#64748b" : "#15803d" }}>
                {loading ? "Checking bookings..." : "Every open booking has a technician. Nice."}
              </p>
            )}
          </section>
        </div>

        {/* Availability grid: next 14 days x Morning/Afternoon */}
        <section className="dash-panel" style={{ marginTop: 20 }}>
          <div className="dash-panel-head">
            <h2>Technician Availability — Next {AVAIL_DAYS} Days</h2>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Busy = technician assigned &amp; booking not Completed/Cancelled</span>
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table dash-avail-table">
              <thead>
                <tr><th>Date</th><th>Morning</th><th>Afternoon</th></tr>
              </thead>
              <tbody>
                {technicians.length === 0 && !loading ? (
                  <tr><td colSpan="3" style={{ textAlign: "center", padding: "18px" }}>No technicians loaded.</td></tr>
                ) : (
                  availRows.map((r) => (
                    <tr key={r.key} className={r.key === todayKey ? "dash-row-today" : ""}>
                      <td>{r.key === todayKey ? <strong>{r.label} · Today</strong> : r.label}</td>
                      {SESSIONS.map((s) => {
                        const names = cellBusy(r.key, s).map((id) => techNameById[id] || `Tech #${id}`);
                        const free = Math.max(0, technicians.length - names.length);
                        return (
                          <td key={s}>
                            {names.length > 0 ? (
                              <>
                                <span className="dash-chip dash-chip-busy">🔴 {names.join(", ")}</span>
                                <div className="dash-chip-free-line">🟢 {free} available</div>
                              </>
                            ) : (
                              <span className="dash-chip dash-chip-free">🟢 All available ({technicians.length})</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {unspecifiedCount > 0 && (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#94a3b8" }}>
              {unspecifiedCount} open booking(s) have no Morning/Afternoon timing set and are not shown in the grid.
            </p>
          )}
        </section>

        {/* Month heat calendar */}
        <section className="dash-panel" style={{ marginTop: 20 }}>
          <div className="dash-cal-head">
            <h2>Availability Calendar — {calMonthLabel}</h2>
            <div className="dash-cal-nav">
              <button onClick={() => setCalAnchor(new Date(calAnchor.getFullYear(), calAnchor.getMonth() - 1, 1))}>◀</button>
              <button onClick={() => { const n = new Date(); setCalAnchor(new Date(n.getFullYear(), n.getMonth(), 1)); setSelectedCalDate(null); }}>Today</button>
              <button onClick={() => setCalAnchor(new Date(calAnchor.getFullYear(), calAnchor.getMonth() + 1, 1))}>▶</button>
            </div>
          </div>
          <div className="dash-cal-grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="dash-cal-dow">{d}</div>
            ))}
            {calCells.map((d) => {
              const key = toDateKey(d);
              const inMonth = d.getMonth() === calAnchor.getMonth();
              return (
                <div
                  key={key}
                  className={`dash-cal-cell${inMonth ? "" : " dash-cal-out"}${selectedCalDate === key ? " dash-cal-selected" : ""}`}
                  onClick={() => setSelectedCalDate(selectedCalDate === key ? null : key)}
                >
                  <span className="dash-cal-day">{d.getDate()}</span>
                  <div className="dash-cal-dots">
                    {SESSIONS.map((s) => (
                      <i key={s} style={{ background: loadColor(cellBusy(key, s).length) }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {selectedCalDate && (
            <div className="dash-cal-detail"><strong>{selectedCalDate}</strong> — {calDetail}</div>
          )}
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#94a3b8" }}>
            Dots per day: Morning · Afternoon. 🟢 free · 🟡 partly busy · 🔴 fully booked. Click a day for details.
          </p>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;