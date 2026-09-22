import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BookingDetailsModal from "../../components/customer/BookingDetailsModal";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import {
  AirconUnitArt,
  EmptyStateArt,
  Icon,
  SnowfieldBackdrop,
} from "../../components/customer/CustomerIcons";
import { CURRENT_CUSTOMER, MY_BOOKINGS, MY_UNITS } from "../../data/customer/customerMockData";
import {
  describeBookingUnits,
  describeCountdown,
  formatDate,
  formatLongDate,
  formatMoney,
  getDashboardStats,
  getNextBooking,
  getPastBookings,
  getUnitsDueSoon,
  isUnitOverdue,
  statusTone,
} from "../../data/customer/customerSelectors";
import { useAuth } from "../../context/AuthContext";

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const quickActions = [
  { label: "Book a service", icon: "plus", path: "/customer/book" },
  { label: "View my bookings", icon: "calendar", path: "/customer/bookings" },
  { label: "Browse services", icon: "grid", path: "/customer/services" },
  { label: "My aircon units", icon: "snowflake", path: "/customer/units" },
];

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openBooking, setOpenBooking] = useState(null);

  const stats = useMemo(() => getDashboardStats(), []);
  const nextBooking = useMemo(() => getNextBooking(), []);
  const recent = useMemo(() => getPastBookings().slice(0, 4), []);
  const dueSoon = useMemo(() => getUnitsDueSoon(), []);

  const firstName = (user?.customer_name || CURRENT_CUSTOMER.customer_name).split(" ")[0];

  return (
    <>
      {/* Welcome banner */}
      <section className="cust-banner">
        <SnowfieldBackdrop />
        <div className="cust-banner-text">
          <p className="cust-banner-eyebrow">Welcome back</p>
          <h1>Good to see you, {firstName}.</h1>
          <p>
            {nextBooking
              ? `Your next visit is ${describeCountdown(nextBooking.date).toLowerCase()} — ${
                  nextBooking.service_name
                } on ${formatLongDate(nextBooking.date)}.`
              : "You have no visits booked. Keeping to a servicing schedule keeps your units running efficiently."}
          </p>
          <div className="cust-banner-actions">
            <button
              className="dash-btn dash-btn-primary"
              onClick={() => navigate("/customer/book")}
            >
              Book a service
            </button>
            <button
              className="dash-btn cust-btn-ondark"
              onClick={() => navigate("/customer/bookings")}
            >
              View my bookings
            </button>
          </div>
        </div>
        <div className="cust-banner-art d-none d-md-block">
          <AirconUnitArt width={230} />
        </div>
      </section>

      {/* Service-due nudge */}
      {dueSoon.length > 0 && (
        <div className="cust-alert">
          <Icon name="alert" size={18} />
          <div style={{ flex: 1 }}>
            <p className="cust-alert-title">
              {dueSoon.length} {dueSoon.length === 1 ? "unit is" : "units are"} due for servicing
            </p>
            <p className="cust-alert-text">
              {dueSoon.map((unit) => unit.nickname).join(", ")} — regular servicing keeps cooling
              efficient and prevents costly repairs later.
            </p>
          </div>
          <button
            className="dash-btn dash-btn-outline"
            onClick={() => navigate("/customer/book")}
          >
            Book now
          </button>
        </div>
      )}

      {/* Stat row */}
      <section className="cust-stats">
        <article className="cust-stat">
          <div className="cust-stat-icon">
            <Icon name="calendar" size={17} />
          </div>
          <p className="cust-stat-label">Upcoming visits</p>
          <p className="cust-stat-value">{stats.upcoming}</p>
          <p className="cust-stat-note">
            {nextBooking ? `Next: ${formatDate(nextBooking.date)}` : "Nothing scheduled"}
          </p>
        </article>

        <article className="cust-stat cust-stat-cyan">
          <div className="cust-stat-icon">
            <Icon name="snowflake" size={17} />
          </div>
          <p className="cust-stat-label">Registered units</p>
          <p className="cust-stat-value">{stats.units}</p>
          <p className="cust-stat-note">
            {dueSoon.length > 0 ? `${dueSoon.length} due soon` : "All up to date"}
          </p>
        </article>

        <article className="cust-stat cust-stat-success">
          <div className="cust-stat-icon">
            <Icon name="checkCircle" size={17} />
          </div>
          <p className="cust-stat-label">Services completed</p>
          <p className="cust-stat-value">{stats.completed}</p>
          <p className="cust-stat-note">Since you joined</p>
        </article>

        <article className="cust-stat cust-stat-warning">
          <div className="cust-stat-icon">
            <Icon name="receipt" size={17} />
          </div>
          <p className="cust-stat-label">Total spend</p>
          <p className="cust-stat-value">{formatMoney(stats.totalSpend)}</p>
          <p className="cust-stat-note">{CURRENT_CUSTOMER.loyalty_points} loyalty points</p>
        </article>
      </section>

      <div className="cust-grid-2">
        {/* Left column */}
        <div>
          <section className="cust-panel">
            <div className="cust-panel-head">
              <div>
                <h2>Your next visit</h2>
                <p>What to expect on the day</p>
              </div>
              {nextBooking && <BookingStatusBadge status={nextBooking.status} />}
            </div>

            {nextBooking ? (
              <div className="cust-nextvisit">
                <div className="cust-nextvisit-top">
                  <div>
                    <p className="cust-nextvisit-when">
                      {formatLongDate(nextBooking.date)} · {nextBooking.time}
                    </p>
                    <p className="cust-nextvisit-service">
                      {nextBooking.service_name} · {describeBookingUnits(nextBooking)}
                    </p>
                  </div>
                  <span className="cust-countdown">
                    <Icon name="clock" size={13} />
                    {describeCountdown(nextBooking.date)}
                  </span>
                </div>

                <div className="cust-nextvisit-body">
                  <div className="cust-meta-grid">
                    <div className="cust-meta">
                      <Icon name="pin" size={16} />
                      <div>
                        <p className="cust-meta-label">Address</p>
                        <p className="cust-meta-value">{nextBooking.location}</p>
                      </div>
                    </div>
                    <div className="cust-meta">
                      <Icon name="receipt" size={16} />
                      <div>
                        <p className="cust-meta-label">Estimated total</p>
                        <p className="cust-meta-value">{formatMoney(nextBooking.amount)}</p>
                      </div>
                    </div>
                  </div>

                  {nextBooking.technician ? (
                    <div className="cust-tech">
                      <span className="cust-avatar">
                        {getInitials(nextBooking.technician.name)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="cust-tech-name">
                          {nextBooking.technician.name} · your technician
                        </p>
                        <p className="cust-tech-meta">
                          <Icon name="star" size={13} />
                          {nextBooking.technician.rating} ·{" "}
                          {nextBooking.technician.jobs_done} jobs completed
                        </p>
                      </div>
                      <button
                        className="dash-btn dash-btn-outline"
                        onClick={() => setOpenBooking(nextBooking)}
                      >
                        Details
                      </button>
                    </div>
                  ) : (
                    <div className="cust-tech-unassigned">
                      <Icon name="clock" size={16} />
                      <span style={{ flex: 1 }}>
                        A technician will be assigned closer to the date.
                      </span>
                      <button
                        className="dash-btn dash-btn-outline"
                        onClick={() => setOpenBooking(nextBooking)}
                      >
                        Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="cust-empty">
                <EmptyStateArt />
                <h3>No visits booked</h3>
                <p>When you book a service it will show up here with your technician's details.</p>
                <button
                  className="dash-btn dash-btn-primary"
                  onClick={() => navigate("/customer/book")}
                >
                  Book a service
                </button>
              </div>
            )}
          </section>

          <section className="cust-panel">
            <div className="cust-panel-head">
              <div>
                <h2>Recent activity</h2>
                <p>Your last few service visits</p>
              </div>
              <button
                className="dash-btn dash-btn-ghost"
                onClick={() => navigate("/customer/bookings")}
              >
                View all →
              </button>
            </div>

            {recent.length > 0 ? (
              <div className="cust-timeline">
                {recent.map((booking) => (
                  <div
                    className={`cust-timeline-item tone-${statusTone(booking.status)}`}
                    key={booking.booking_ID}
                  >
                    <p className="cust-timeline-date">{formatDate(booking.date)}</p>
                    <p className="cust-timeline-title">
                      {booking.service_name} · {describeBookingUnits(booking)}
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
            ) : (
              <div className="cust-empty">
                <EmptyStateArt />
                <h3>Nothing here yet</h3>
                <p>Your completed visits and service reports will appear here.</p>
              </div>
            )}
          </section>
        </div>

        {/* Right column */}
        <div>
          <section className="cust-panel">
            <div className="cust-panel-head">
              <h2>Quick actions</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {quickActions.map((action) => (
                <button
                  key={action.path}
                  className="dash-action"
                  style={{ justifyContent: "flex-start", gap: 10 }}
                  onClick={() => navigate(action.path)}
                >
                  <Icon name={action.icon} size={16} />
                  {action.label}
                </button>
              ))}
            </div>
          </section>

          <section className="cust-panel">
            <div className="cust-panel-head">
              <div>
                <h2>My units</h2>
                <p>Servicing status at a glance</p>
              </div>
            </div>

            {MY_UNITS.map((unit) => {
              const overdue = isUnitOverdue(unit);
              return (
                <div
                  key={unit.installed_ID}
                  className="cust-unit-row"
                  style={{ alignItems: "center" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 500 }}>
                      {unit.nickname}
                    </p>
                    <p className="cust-unit-row-label" style={{ margin: 0, fontSize: 11.5 }}>
                      {unit.brand} · next {formatDate(unit.next_due)}
                    </p>
                  </div>
                  <span
                    className={`cust-badge tone-${overdue ? "warning" : "success"}`}
                    style={{ flexShrink: 0 }}
                  >
                    <i />
                    {overdue ? "Due" : "OK"}
                  </span>
                </div>
              );
            })}

            <button
              className="dash-btn dash-btn-outline"
              style={{ width: "100%", marginTop: 14 }}
              onClick={() => navigate("/customer/units")}
            >
              Manage units
            </button>
          </section>

          <section className="cust-panel">
            <div className="cust-panel-head">
              <h2>Need help?</h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 14px", lineHeight: 1.6 }}>
              Our support team is available Monday to Saturday, 9am–6pm.
            </p>
            <div className="cust-meta" style={{ marginBottom: 12 }}>
              <Icon name="phone" size={16} />
              <div>
                <p className="cust-meta-label">Hotline</p>
                <p className="cust-meta-value">+65 6123 4567</p>
              </div>
            </div>
            <div className="cust-meta">
              <Icon name="shield" size={16} />
              <div>
                <p className="cust-meta-label">Service guarantee</p>
                <p className="cust-meta-value">30-day workmanship cover</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <BookingDetailsModal booking={openBooking} onClose={() => setOpenBooking(null)} />
    </>
  );
};

export default CustomerDashboard;
