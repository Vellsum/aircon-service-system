import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BookingDetailsModal from "../../components/customer/BookingDetailsModal";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import { EmptyStateArt, Icon } from "../../components/customer/CustomerIcons";
import { MY_BOOKINGS } from "../../data/customer/customerMockData";
import {
  describeBookingUnits,
  describeCountdown,
  formatDate,
  formatMoney,
  isOpenBooking,
} from "../../data/customer/customerSelectors";

const FILTERS = ["All", "Upcoming", "Completed", "Cancelled"];

const CustomerBookings = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [openBooking, setOpenBooking] = useState(null);
  const [toast, setToast] = useState(null);

  // Cancellation is local-only in this build; the real call is a status
  // update on new_jobBooking.Booking.
  const [cancelledIds, setCancelledIds] = useState([]);

  const bookings = useMemo(
    () =>
      MY_BOOKINGS.map((booking) =>
        cancelledIds.includes(booking.booking_ID)
          ? { ...booking, status: "Cancelled" }
          : booking
      ),
    [cancelledIds]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return bookings
      .filter((booking) => {
        if (filter === "Upcoming") return isOpenBooking(booking);
        if (filter === "Completed") return booking.status === "Completed";
        if (filter === "Cancelled") return booking.status === "Cancelled";
        return true;
      })
      .filter((booking) => {
        if (!term) return true;
        return (
          booking.reference.toLowerCase().includes(term) ||
          booking.service_name.toLowerCase().includes(term) ||
          booking.location.toLowerCase().includes(term) ||
          (booking.technician?.name || "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [bookings, filter, search]);

  const counts = useMemo(
    () => ({
      All: bookings.length,
      Upcoming: bookings.filter(isOpenBooking).length,
      Completed: bookings.filter((booking) => booking.status === "Completed").length,
      Cancelled: bookings.filter((booking) => booking.status === "Cancelled").length,
    }),
    [bookings]
  );

  const handleCancel = (booking) => {
    setCancelledIds((current) => [...current, booking.booking_ID]);
    setOpenBooking(null);
    setToast(`Booking ${booking.reference} cancelled.`);
    window.setTimeout(() => setToast(null), 3200);
  };

  return (
    <>
      <div className="cust-page-head">
        <div>
          <h1>My bookings</h1>
          <p>Every service visit you've booked with us, past and upcoming.</p>
        </div>
        <div className="cust-head-actions">
          <button className="dash-btn dash-btn-primary" onClick={() => navigate("/customer/book")}>
            <Icon name="plus" size={13} /> Book a service
          </button>
        </div>
      </div>

      <section className="cust-panel">
        <div className="dash-filterbar">
          <input
            className="dash-search"
            placeholder="Search by reference, service, technician or address…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search bookings"
          />
          <div className="dash-chips">
            {FILTERS.map((entry) => (
              <button
                key={entry}
                className={`dash-chip${filter === entry ? " is-active" : ""}`}
                onClick={() => setFilter(entry)}
              >
                {entry} ({counts[entry]})
              </button>
            ))}
          </div>
        </div>

        {visible.length > 0 ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Service</th>
                  <th>Units</th>
                  <th>Date</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((booking) => (
                  <tr key={booking.booking_ID}>
                    <td className="dash-mono">{booking.reference}</td>
                    <td>{booking.service_name}</td>
                    <td>{describeBookingUnits(booking)}</td>
                    <td>
                      {formatDate(booking.date)}
                      {isOpenBooking(booking) && (
                        <span
                          style={{
                            display: "block",
                            fontSize: 11.5,
                            color: "var(--accent)",
                          }}
                        >
                          {describeCountdown(booking.date)}
                        </span>
                      )}
                    </td>
                    <td>
                      {booking.technician ? (
                        booking.technician.name
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>Not assigned</span>
                      )}
                    </td>
                    <td>
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="dash-mono" style={{ textAlign: "right" }}>
                      {formatMoney(booking.amount)}
                    </td>
                    <td>
                      <div className="dash-row-actions">
                        <button
                          className="dash-row-btn"
                          onClick={() => setOpenBooking(booking)}
                        >
                          View
                        </button>
                        {isOpenBooking(booking) && (
                          <button
                            className="dash-row-btn is-danger"
                            onClick={() => handleCancel(booking)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cust-empty">
            <EmptyStateArt />
            <h3>No bookings found</h3>
            <p>
              {search || filter !== "All"
                ? "Try a different search or filter."
                : "You haven't booked a service yet. It only takes a minute."}
            </p>
            <button className="dash-btn dash-btn-primary" onClick={() => navigate("/customer/book")}>
              Book a service
            </button>
          </div>
        )}

        {visible.length > 0 && (
          <div className="dash-pagination">
            <span>
              Showing {visible.length} of {bookings.length} bookings
            </span>
          </div>
        )}
      </section>

      <BookingDetailsModal
        booking={openBooking}
        onClose={() => setOpenBooking(null)}
        onCancelBooking={handleCancel}
      />

      {toast && (
        <div className="cust-toast">
          <Icon name="checkCircle" size={16} />
          {toast}
        </div>
      )}
    </>
  );
};

export default CustomerBookings;
