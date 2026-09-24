import React from "react";
import BookingStatusBadge from "./BookingStatusBadge";
import { Icon } from "./CustomerIcons";
import {
  describeBookingUnits,
  formatDate,
  formatMoney,
  isOpenBooking,
} from "../../data/customer/customerSelectors";

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Full detail view for one booking, including the technician's service
 * report once the visit is done. Reuses the dash-modal shell from shared.css
 * so it matches the admin record modals.
 */
const BookingDetailsModal = ({ booking, onClose, onCancelBooking }) => {
  if (!booking) return null;

  const report = booking.report;
  const partsTotal = (report?.parts_used || []).reduce(
    (sum, part) => sum + part.price * part.qty,
    0
  );

  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div
        className="dash-modal"
        style={{ maxWidth: 560 }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Booking ${booking.reference}`}
      >
        <div className="dash-modal-head">
          <div>
            <h3>{booking.service_name}</h3>
            <p className="dash-mono" style={{ margin: "4px 0 0" }}>
              {booking.reference}
            </p>
          </div>
          <button className="dash-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="dash-modal-body">
          <div style={{ marginBottom: 18 }}>
            <BookingStatusBadge status={booking.status} />
          </div>

          <div className="cust-meta-grid" style={{ marginBottom: 20 }}>
            <div className="cust-meta">
              <Icon name="calendar" size={16} />
              <div>
                <p className="cust-meta-label">Date</p>
                <p className="cust-meta-value">{formatDate(booking.date)}</p>
              </div>
            </div>
            <div className="cust-meta">
              <Icon name="clock" size={16} />
              <div>
                <p className="cust-meta-label">Time</p>
                <p className="cust-meta-value">{booking.time}</p>
              </div>
            </div>
            <div className="cust-meta">
              <Icon name="snowflake" size={16} />
              <div>
                <p className="cust-meta-label">Units</p>
                <p className="cust-meta-value">{describeBookingUnits(booking)}</p>
              </div>
            </div>
            <div className="cust-meta">
              <Icon name="pin" size={16} />
              <div>
                <p className="cust-meta-label">Address</p>
                <p className="cust-meta-value">{booking.location}</p>
              </div>
            </div>
          </div>

          {booking.technician ? (
            <div className="cust-tech" style={{ marginTop: 0, marginBottom: 18 }}>
              <span className="cust-avatar">{getInitials(booking.technician.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="cust-tech-name">{booking.technician.name}</p>
                <p className="cust-tech-meta">
                  <Icon name="star" size={13} />
                  {booking.technician.rating} · {booking.technician.jobs_done} jobs completed
                </p>
              </div>
              <a
                className="dash-btn dash-btn-outline"
                href={`tel:${booking.technician.phone.replace(/\s/g, "")}`}
              >
                Call
              </a>
            </div>
          ) : (
            <div className="cust-tech-unassigned" style={{ marginTop: 0, marginBottom: 18 }}>
              <Icon name="clock" size={16} />
              A technician will be assigned closer to your appointment date.
            </div>
          )}

          {booking.notes && (
            <div style={{ marginBottom: 18 }}>
              <p className="cust-meta-label">Your notes</p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>{booking.notes}</p>
            </div>
          )}

          {report && (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "16px 18px",
                background: "var(--bg-app)",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <Icon name="receipt" size={16} />
                <strong style={{ fontSize: 13.5 }}>Service report</strong>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 12.5, lineHeight: 1.6 }}>
                {report.summary}
              </p>

              {report.parts_used.length > 0 && (
                <>
                  <p className="cust-meta-label">Parts used</p>
                  {report.parts_used.map((part) => (
                    <div className="cust-summary-row" key={part.part_name}>
                      <span className="cust-summary-label">
                        {part.part_name} × {part.qty}
                      </span>
                      <span className="cust-summary-value dash-mono">
                        {formatMoney(part.price * part.qty)}
                      </span>
                    </div>
                  ))}
                  <div className="cust-summary-row">
                    <span className="cust-summary-label">Parts subtotal</span>
                    <span className="cust-summary-value dash-mono">
                      {formatMoney(partsTotal)}
                    </span>
                  </div>
                </>
              )}

              {report.rating_given > 0 && (
                <p style={{ margin: "10px 0 0", fontSize: 12.5 }}>
                  You rated this visit{" "}
                  <strong>{report.rating_given} / 5</strong>
                </p>
              )}
            </div>
          )}

          <div className="cust-summary-row" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="cust-summary-label">Total</span>
            <span className="cust-summary-value dash-mono" style={{ fontSize: 15 }}>
              {formatMoney(booking.amount)}
            </span>
          </div>
        </div>

        <div className="dash-modal-footer">
          {isOpenBooking(booking) && onCancelBooking && (
            <button
              className="dash-btn dash-row-btn is-danger"
              onClick={() => onCancelBooking(booking)}
            >
              Cancel booking
            </button>
          )}
          <button className="dash-btn dash-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;
