import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BookingDetailsModal, { formatCustomerTechnicianRating } from "../../components/customer/BookingDetailsModal";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import { EmptyStateArt, Icon } from "../../components/customer/CustomerIcons";
import { cancelBooking, getMyBookings, getMyUnits, rateBooking } from "../../api/customerApi";
import { useAuth } from "../../context/AuthContext";
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
  const { user, token } = useAuth();
  const session = useMemo(() => ({}), [token, user?.user_ID, user?.customer_ID]);
  const scopeRef = useRef(null);
  if (scopeRef.current?.session !== session) {
    if (scopeRef.current) scopeRef.current.alive = false;
    scopeRef.current = {
      session, generation: (scopeRef.current?.generation || 0) + 1,
      alive: true, request: 0, pending: new Set(), refreshing: new Set(), saved: new Set(), uncertain: new Set(),
    };
  }
  const scope = scopeRef.current;

  const [bookingRecords, setBookings] = useState([]);
  const [unitRecords, setUnits] = useState([]);
  const [loadedScope, setLoadedScope] = useState(null);
  const bookings = loadedScope === scope ? bookingRecords : [];
  const units = loadedScope === scope ? unitRecords : [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState("upcoming");
  const [openBooking, setOpenBooking] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [ratingRequests, setRatingRequests] = useState({ scope, entries: {} });
  const selectedBooking = bookings.find((b) => b.booking_ID === openBooking?.booking_ID) || null;
  const selectedRef = useRef(null);
  selectedRef.current = selectedBooking?.booking_ID;
  const ratingState = ratingRequests.scope === scope
    ? ratingRequests.entries[selectedBooking?.booking_ID] || {} : {};
  const isCurrent = useCallback(() => scope.alive && scopeRef.current === scope, [scope]);
  const updateRating = useCallback((id, patch) => {
    if (!scope.alive || scopeRef.current !== scope) return;
    setRatingRequests((previous) => {
      const entries = previous.scope === scope ? previous.entries : {};
      return { scope, entries: { ...entries, [id]: { ...entries[id], ...patch } } };
    });
  }, [scope]);

  const loadData = useCallback(async ({ background = false } = {}) => {
    if (!scope.alive || scopeRef.current !== scope) return null;
    const request = ++scope.request;
    const current = () => scope.alive && scopeRef.current === scope && request === scope.request;
    if (!background) setLoading(true);
    try {
      const [bookRes, unitRes] = await Promise.all([getMyBookings(), getMyUnits()]);
      if (!current()) return null;
      if (!Array.isArray(bookRes.bookings) || !Array.isArray(unitRes.units)) {
        throw new Error("Booking details are unavailable. Please refresh.");
      }
      setBookings(bookRes.bookings || []);
      setUnits(unitRes.units || []);
      setLoadedScope(scope);
      setError("");
      return bookRes.bookings;
    } catch (err) {
      if (!current()) return null;
      if (background) throw err;
      setError(err.message);
      setLoadedScope(scope);
    } finally {
      if (current()) setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    scope.alive = true;
    loadData();
    return () => { scope.alive = false; scope.request += 1; };
  }, [loadData, scope]);

  const openDetails = (booking) => {
    updateRating(booking.booking_ID, { error: "" });
    setOpenBooking(booking);
  };

  const refreshRating = async () => {
    const id = selectedBooking?.booking_ID;
    if (!isCurrent() || !id || scope.pending.has(id) || scope.refreshing.has(id)) return;
    scope.refreshing.add(id);
    updateRating(id, { refreshing: true, refreshError: false });
    try {
      const refreshed = await loadData({ background: true });
      if (!isCurrent()) return;
      const booking = refreshed?.find((b) => b.booking_ID === id);
      if (!booking || !Object.prototype.hasOwnProperty.call(booking, "rating")
        || (scope.saved.has(id) && !booking.rating)) throw new Error("Rating readback unavailable");
      scope.uncertain.delete(id);
      updateRating(id, { uncertain: false, error: "", refreshError: false });
    } catch {
      updateRating(id, { refreshError: true });
    } finally {
      scope.refreshing.delete(id);
      updateRating(id, { refreshing: false });
    }
  };

  const submitRating = async (stars) => {
    const booking = selectedBooking;
    const id = booking?.booking_ID;
    if (!isCurrent() || selectedRef.current !== id || !token || !booking
      || String(booking.status).trim().toLowerCase() !== "completed" || !Object.prototype.hasOwnProperty.call(booking, "rating")
      || booking.rating !== null || scope.saved.has(id) || scope.pending.has(id)
      || scope.refreshing.has(id) || scope.uncertain.has(id)
      || !Number.isInteger(stars) || stars < 1 || stars > 5) return;
    scope.pending.add(id);
    updateRating(id, { pending: true, error: "", refreshError: false });
    try {
      const result = await rateBooking(id, stars);
      if (!isCurrent()) return;
      scope.saved.add(id);
      scope.request += 1; // Invalidate any GET that started before this confirmed save.
      updateRating(id, { saved: true, uncertain: false, refreshing: true });
      const saved = result.rating;
      if (saved?.booking_ID === id && saved.stars === stars
        && Number.isSafeInteger(saved.technicianID) && saved.technicianID > 0 && saved.submittedAt) {
        setBookings((previous) => previous.map((b) => b.booking_ID === id ? { ...b, rating: saved } : b));
      }
      try {
        const refreshed = await loadData({ background: true });
        if (!isCurrent()) return;
        if (!refreshed?.find((b) => b.booking_ID === id)?.rating) throw new Error("Rating readback unavailable");
      } catch {
        updateRating(id, { refreshError: true });
      }
    } catch (err) {
      if (err.uncertain) scope.uncertain.add(id);
      updateRating(id, { error: err.message, uncertain: Boolean(err.uncertain) });
    } finally {
      scope.pending.delete(id);
      updateRating(id, { pending: false, refreshing: false });
    }
  };

  // Selectors get the REAL arrays passed in — never their mock defaults
  const upcoming = useMemo(() => getUpcomingBookings(bookings), [bookings]);
  const past = useMemo(() => getPastBookings(bookings), [bookings]);

  const handleCancel = async (booking) => {
    if (!isCurrent()) return;
    if (!window.confirm(
      `Cancel ${booking.service_name} on ${formatDate(booking.date)}?\nThis cannot be undone.`
    )) return;
    if (!isCurrent()) return;

    setCancellingId(booking.booking_ID);
    setActionError("");
    try {
      await cancelBooking(booking.booking_ID);
      if (!isCurrent()) return;
      await loadData(); // refresh so the cancelled item moves to History
    } catch (err) {
      if (isCurrent()) setActionError(err.message);
    } finally {
      if (isCurrent()) setCancellingId(null);
    }
  };

  if (loading || loadedScope !== scope) {
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
                            {formatCustomerTechnicianRating(booking.technician)} · {booking.technician.jobs_done} jobs completed
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
                      onClick={() => openDetails(booking)}
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
                    onClick={() => openDetails(booking)}
                  >
                    View details →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      )}

      <BookingDetailsModal
        key={`${scope.generation}:${selectedBooking?.booking_ID || "closed"}`}
        booking={selectedBooking}
        onClose={() => setOpenBooking(null)}
        allowRating={Boolean(token)}
        onRateBooking={submitRating}
        onRefreshRating={refreshRating}
        ratingState={ratingState}
      />
    </>
  );
};

export default CustomerBookings;
