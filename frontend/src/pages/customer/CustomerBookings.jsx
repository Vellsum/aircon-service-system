import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BookingDetailsModal from "../../components/customer/BookingDetailsModal";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import { EmptyStateArt, Icon } from "../../components/customer/CustomerIcons";
import { cancelBooking, getMyBookings, getMyUnits } from "../../api/customerApi";
import {
  describeBookingUnits,
  formatDate,
  formatMoney,
  getPastBookings,
  getUpcomingBookings,
  statusTone,
} from "../../data/customer/customerSelectors";

const getInitials = (name = "") =>
  name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const refCode = (id) => `#BK${String(id).padStart(3, "0")}`;

const CustomerBookings = () => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState("upcoming");
  const [openBooking, setOpenBooking] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [actionError, setActionError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bookRes, unitRes] = await Promise.all([getMyBookings(), getMyUnits()]);
      setBookings(bookRes.bookings || []);
      setUnits(unitRes.units || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selectors get the REAL arrays passed in — never their mock defaults
  const upcoming = useMemo(() => getUpcomingBookings(bookings), [bookings]);
  const past = useMemo(() => getPastBookings(bookings), [bookings]);

  const handleCancel = async (booking) => {
    if (!window.confirm(
      `Cancel ${booking.service_name} on ${formatDate(booking.date)}?\nThis cannot be undone.`
    )) return;

    setCancellingId(booking.booking_ID);
    setActionError("");
    try {
      await cancelBooking(booking.booking_ID);
      await loadData(); // refresh so the cancelled item moves to History
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <section className="cust-panel" style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading your bookings…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="cust-panel" style={{ padding: 48, textAlign: "center" }}>
        <h2>Couldn't load your bookings</h2>
        <p style={{ color: "var(--text-secondary)", margin: "8px 0 16px" }}>{error}</p>
        <button className="dash-btn dash-btn-primary" onClick={loadData}>Try again</button>
      </section>
    );
  }

  return (
    <>
      <div className="cust-page-head">
        <div>
          <h1>My bookings</h1>
          <p>Every visit you've booked — upcoming and past.</p>
        </div>
        <div className="cust-head-actions">
          <button className="dash-btn dash-btn-primary" onClick={() => navigate("/customer/book-service")}>
            <Icon name="plus" size={13} /> Book a service
          </button>
        </div>
      </div>

      {actionError && (
        <div className="cust-alert" style={{ marginBottom: 16 }}>
          <Icon name="alert" size={18} />
          <p className="cust-alert-text" style={{ flex: 1, margin: 0 }}>{actionError}</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { id: "upcoming", label: "Upcoming", count: upcoming.length },
          { id: "history", label: "History", count: past.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? "dash-btn dash-btn-primary" : "dash-btn dash-btn-outline"}
          >
            {t.label} · {t.count}
          </button>
        ))}
      </div>

      {/* ================= UPCOMING ================= */}
      {tab === "upcoming" && (
        upcoming.length === 0 ? (
          <section className="cust-panel">
            <div className="cust-empty">
              <EmptyStateArt />
              <h3>No upcoming visits</h3>
              <p>When you book a service it will show up here with your technician's details.</p>
              <button className="dash-btn dash-btn-primary" onClick={() => navigate("/customer/book-service")}>
                Book a service
              </button>
            </div>
          </section>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {upcoming.map((booking) => (
              <section className="cust-panel" key={booking.booking_ID}>
                <div
                  style={{
                    display: "flex", gap: 18, alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Date block */}
                  <div
                    style={{
                      minWidth: 110, textAlign: "center",
                      background: "var(--bg-app)", borderRadius: "var(--radius)",
                      padding: "12px 10px", border: "1px solid var(--border)",
                    }}
                  >
                    <p className="cust-meta-label" style={{ margin: 0 }}>{formatDate(booking.date)}</p>
                    <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 14 }}>{booking.time}</p>
                    <p className="dash-mono" style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--text-secondary)" }}>
                      {refCode(booking.booking_ID)}
                    </p>
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontSize: 16 }}>{booking.service_name}</h3>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                      {describeBookingUnits(booking, units)} · {booking.location}
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 13.5, fontWeight: 500 }}>
                      {formatMoney(booking.amount)}
                    </p>

                    {booking.technician ? (
                      <div className="cust-tech" style={{ marginTop: 12 }}>
                        <span className="cust-avatar">{getInitials(booking.technician.name)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="cust-tech-name">{booking.technician.name} · your technician</p>
                          <p className="cust-tech-meta">
                            <Icon name="star" size={13} />
                            {booking.technician.rating} · {booking.technician.jobs_done} jobs completed
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="cust-tech-unassigned" style={{ marginTop: 12 }}>
                        <Icon name="clock" size={16} />
                        <span>A technician will be assigned closer to the date.</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 130 }}>
                    <button
                      className="dash-btn dash-btn-outline"
                      onClick={() => setOpenBooking(booking)}
                    >
                      Details
                    </button>
                    <button
                      className="dash-btn dash-btn-outline"
                      style={{ color: "var(--danger, #c0392b)", borderColor: "var(--danger, #c0392b)" }}
                      disabled={cancellingId === booking.booking_ID}
                      onClick={() => handleCancel(booking)}
                    >
                      {cancellingId === booking.booking_ID ? "Cancelling…" : "Cancel booking"}
                    </button>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )
      )}

      {/* ================= HISTORY ================= */}
      {tab === "history" && (
        past.length === 0 ? (
          <section className="cust-panel">
            <div className="cust-empty">
              <EmptyStateArt />
              <h3>Nothing here yet</h3>
              <p>Your completed visits and service reports will appear here.</p>
            </div>
          </section>
        ) : (
          <section className="cust-panel">
            <div className="cust-panel-head">
              <div>
                <h2>Past visits</h2>
                <p>Completed and cancelled bookings, most recent first.</p>
              </div>
            </div>
            <div className="cust-timeline">
              {past.map((booking) => (
                <div
                  className={`cust-timeline-item tone-${statusTone(booking.status)}`}
                  key={booking.booking_ID}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <p className="cust-timeline-date">
                      {formatDate(booking.date)} · <span className="dash-mono">{refCode(booking.booking_ID)}</span>
                    </p>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <p className="cust-timeline-title">
                    {booking.service_name} · {describeBookingUnits(booking, units)} · {formatMoney(booking.amount)}
                  </p>
                  <p className="cust-timeline-note">
                    {booking.status === "Cancelled"
                      ? booking.notes || "Booking cancelled."
                      : booking.report?.summary || "Service completed."}
                  </p>
                  <button
                    className="dash-btn dash-btn-ghost"
                    style={{ padding: "4px 0", marginTop: 4 }}
                    onClick={() => setOpenBooking(booking)}
                  >
                    View details →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      )}

      <BookingDetailsModal booking={openBooking} onClose={() => setOpenBooking(null)} />
    </>
  );
};

export default CustomerBookings;