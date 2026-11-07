import React, { useId, useState } from "react";
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

export function formatCustomerTechnicianRating(technician) {
  const average = technician?.customerRatingAverage;
  const count = technician?.customerReviewCount;
  if (!Number.isSafeInteger(count) || count < 0) return "Rating unavailable.";
  if (count === 0 && average === null) return "No customer ratings yet.";
  if (count > 0 && typeof average === "number" && Number.isFinite(average)
    && average >= 1 && average <= 5) {
    return (
      <span className="cust-customer-rating">
        {average.toFixed(1)} <Icon name="star" size={16} />
        <span className="visually-hidden">out of 5</span>
        <span>· {count} {count === 1 ? "review" : "reviews"}</span>
      </span>
    );
  }
  return "Rating unavailable.";
}

const BookingRating = ({ booking, allowRating, onRateBooking, onRefreshRating, state }) => {
  const [stars, setStars] = useState("");
  const [hoverStars, setHoverStars] = useState(null);
  const [focusStars, setFocusStars] = useState(null);
  const controlId = useId();
  const hasRating = Object.prototype.hasOwnProperty.call(booking, "rating");
  const savedStars = booking.rating?.stars;
  const validSaved = Number.isInteger(savedStars) && savedStars >= 1 && savedStars <= 5;
  const busy = Boolean(state.pending || state.refreshing);
  const isCompletedForRating = String(booking.status).trim().toLowerCase() === "completed";
  const eligible = allowRating && typeof onRateBooking === "function"
    && isCompletedForRating && hasRating && booking.rating === null
    && !state.saved && !state.uncertain;
  const displayedStars = !busy && eligible
    ? hoverStars ?? focusStars ?? Number(stars)
    : Number(stars);
  if (!isCompletedForRating && !booking.rating) return null;

  return (
    <section aria-labelledby={`${controlId}-heading`} style={{ marginBottom: 18 }}>
      <h4 id={`${controlId}-heading`} style={{ fontSize: 14 }}>Your service rating</h4>
      {validSaved ? (
        <p>You rated this visit <strong>{savedStars} / 5</strong>.</p>
      ) : state.saved ? null : !hasRating || booking.rating !== null ? (
        <p>Rating unavailable.</p>
      ) : !eligible && !state.uncertain ? (
        <p>Rating entry is available in My Bookings.</p>
      ) : null}
      {state.saved && (
        <p role="status" aria-live="polite">
          {state.refreshError
            ? "Rating saved. Booking details could not be refreshed. Do not submit again."
            : state.refreshing ? "Rating saved. Refreshing booking details…" : "Rating saved."}
        </p>
      )}
      {state.error && <p id={`${controlId}-error`} role="alert">{state.error}</p>}
      {state.uncertain && !state.error && (
        <p role="alert">The save outcome could not be confirmed. Refresh booking details before trying again.</p>
      )}
      {state.refreshError && !state.saved && (
        <p role="alert">Booking details could not be refreshed. Please try refreshing again.</p>
      )}
      {(eligible || state.pending || state.uncertain) && !state.saved && (
        <form onSubmit={(event) => {
          event.preventDefault();
          if (eligible && !busy && stars !== "") onRateBooking(Number(stars));
        }}>
          <fieldset className="cust-rating-picker" disabled={busy || !eligible}
            aria-describedby={`${controlId}-selection${state.error ? ` ${controlId}-error` : ""}`}>
            <legend style={{ fontSize: 13 }}>Choose your rating (1–5)</legend>
            <div className="cust-rating-stars" onPointerLeave={() => setHoverStars(null)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className="cust-rating-star-option"
                  onPointerEnter={(event) => {
                    if (event.pointerType !== "touch" && !busy && eligible) setHoverStars(value);
                  }}>
                  <input type="radio" name={`${controlId}-stars`} value={value} required
                    aria-label={`${value} out of 5 stars`}
                    checked={stars === String(value)} onChange={() => setStars(String(value))}
                    onFocus={() => {
                      setHoverStars(null);
                      if (!busy && eligible) setFocusStars(value);
                    }}
                    onBlur={() => setFocusStars(null)} />
                  <span className={`cust-rating-star-icon${value <= displayedStars ? " is-filled" : ""}`}>
                    <Icon name="star" size={28} />
                  </span>
                </label>
              ))}
            </div>
            <p id={`${controlId}-selection`} className="cust-rating-selection" aria-live="polite">
              {displayedStars ? `${displayedStars} out of 5.` : "Select a rating"}
            </p>
            <button type="submit" className="dash-btn dash-btn-primary" disabled={busy || !eligible || stars === ""}>
              {state.pending ? "Saving rating…" : "Submit rating"}
            </button>
          </fieldset>
          {state.pending && <p role="status" aria-live="polite">Saving your rating…</p>}
        </form>
      )}
      {(state.refreshError || state.uncertain || state.error) && typeof onRefreshRating === "function" && (
        <button type="button" className="dash-btn dash-btn-outline" disabled={busy} onClick={onRefreshRating}>
          {state.refreshing ? "Refreshing…" : "Refresh booking details"}
        </button>
      )}
    </section>
  );
};

/**
 * Full detail view for one booking, including the technician's service
 * report once the visit is done. Reuses the dash-modal shell from shared.css
 * so it matches the admin record modals.
 */
const BookingDetailsModal = ({ booking, onClose, onCancelBooking, allowRating = false,
  onRateBooking, onRefreshRating, ratingState = {} }) => {
  if (!booking) return null;

  const report = booking.report;
  const parts = Array.isArray(report?.parts_used) ? report.parts_used : [];
  const phone = typeof booking.technician?.phone === "string" ? booking.technician.phone.trim() : "";
  const partsTotal = parts.reduce(
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
              {/**              <Icon name="snowflake" size={16} />
  <div>
                <p className="cust-meta-label">Units</p>
                <p className="cust-meta-value">{describeBookingUnits(booking)}</p>
              </div>*/}
             
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
                  {formatCustomerTechnicianRating(booking.technician)} · {booking.technician.jobs_done} jobs completed
                </p>
              </div>

{/*** {phone ? <a
                className="dash-btn dash-btn-outline"
                href={`tel:${phone.replace(/\s/g, "")}`}
              >
                Call
              </a> : <button className="dash-btn dash-btn-outline" disabled title="Phone unavailable">Call</button>}
 */}
             

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

              {parts.length > 0 && (
                <>
                  <p className="cust-meta-label">Parts used</p>
                  {parts.map((part) => (
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

            </div>
          )}

          <BookingRating key={booking.booking_ID} booking={booking} allowRating={allowRating}
            onRateBooking={onRateBooking} onRefreshRating={onRefreshRating} state={ratingState} />

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
