import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AirconUnitArt,
  HealthRing,
  Icon,
} from "../../components/customer/CustomerIcons";
import { MY_BOOKINGS, MY_UNITS } from "../../data/customer/customerMockData";
import {
  formatDate,
  getUnitsDueSoon,
  healthLabel,
  healthTone,
  isUnitOverdue,
} from "../../data/customer/customerSelectors";

// healthTone() speaks in shared.css tone names; AirconUnitArt speaks in
// airflow names. This is the bridge between the two.
const ART_TONE_BY_HEALTH = { success: "cool", warning: "warn", danger: "alert" };

const CustomerMyUnits = () => {
  const navigate = useNavigate();
  const [historyUnit, setHistoryUnit] = useState(null);

  const dueSoon = useMemo(() => getUnitsDueSoon(), []);

  // Visits that touched a given unit, newest first.
  const historyFor = (unit) =>
    MY_BOOKINGS.filter((booking) => booking.unit_ids.includes(unit.installed_ID)).sort((a, b) =>
      b.date.localeCompare(a.date)
    );

  return (
    <>
      <div className="cust-page-head">
        <div>
          <h1>My aircon units</h1>
          <p>Every unit registered to your account, with its servicing history.</p>
        </div>
        <div className="cust-head-actions">
          <button className="dash-btn dash-btn-outline">
            <Icon name="plus" size={13} /> Register a unit
          </button>
          <button className="dash-btn dash-btn-primary" onClick={() => navigate("/customer/book")}>
            Book servicing
          </button>
        </div>
      </div>

      {dueSoon.length > 0 && (
        <div className="cust-alert">
          <Icon name="alert" size={18} />
          <div style={{ flex: 1 }}>
            <p className="cust-alert-title">Servicing due</p>
            <p className="cust-alert-text">
              {dueSoon.map((unit) => unit.nickname).join(", ")} —{" "}
              {dueSoon.length === 1 ? "this unit is" : "these units are"} at or past the
              recommended 3-month servicing interval.
            </p>
          </div>
        </div>
      )}

      <div className="cust-unit-grid">
        {MY_UNITS.map((unit) => {
          const overdue = isUnitOverdue(unit);
          const tone = healthTone(unit.health);

          return (
            <article className="cust-unit-card" key={unit.installed_ID}>
              <div className="cust-unit-art">
                <AirconUnitArt width={200} tone={ART_TONE_BY_HEALTH[tone]} />
              </div>

              <div className="cust-unit-body">
                <div className="cust-unit-head">
                  <div style={{ minWidth: 0 }}>
                    <h3 className="cust-unit-name">{unit.nickname}</h3>
                    <p className="cust-unit-model">
                      {unit.brand} {unit.model}
                    </p>
                  </div>
                  <HealthRing value={unit.health} tone={tone} size={60} />
                </div>

                <span className={`cust-badge tone-${tone}`} style={{ marginBottom: 12 }}>
                  <i />
                  {healthLabel(unit.health)}
                </span>

                <div className="cust-unit-rows">
                  <div className="cust-unit-row">
                    <span className="cust-unit-row-label">Type</span>
                    <span className="cust-unit-row-value">{unit.type}</span>
                  </div>
                  <div className="cust-unit-row">
                    <span className="cust-unit-row-label">Capacity</span>
                    <span className="cust-unit-row-value">{unit.capacity}</span>
                  </div>
                  <div className="cust-unit-row">
                    <span className="cust-unit-row-label">Installed</span>
                    <span className="cust-unit-row-value">{formatDate(unit.installed_on)}</span>
                  </div>
                  <div className="cust-unit-row">
                    <span className="cust-unit-row-label">Last serviced</span>
                    <span className="cust-unit-row-value">{formatDate(unit.last_serviced)}</span>
                  </div>
                  <div className="cust-unit-row">
                    <span className="cust-unit-row-label">Next due</span>
                    <span
                      className="cust-unit-row-value"
                      style={overdue ? { color: "var(--warning)" } : undefined}
                    >
                      {formatDate(unit.next_due)}
                    </span>
                  </div>
                  <div className="cust-unit-row">
                    <span className="cust-unit-row-label">Warranty</span>
                    <span className="cust-unit-row-value">
                      {unit.warranty_until ? `Until ${formatDate(unit.warranty_until)}` : "Expired"}
                    </span>
                  </div>
                  <div className="cust-unit-row">
                    <span className="cust-unit-row-label">Services to date</span>
                    <span className="cust-unit-row-value">{unit.service_count}</span>
                  </div>
                </div>
              </div>

              <div className="cust-unit-foot">
                <button
                  className="dash-btn dash-btn-outline"
                  onClick={() => setHistoryUnit(historyUnit?.installed_ID === unit.installed_ID ? null : unit)}
                >
                  {historyUnit?.installed_ID === unit.installed_ID ? "Hide history" : "History"}
                </button>
                <button
                  className="dash-btn dash-btn-primary"
                  onClick={() => navigate(`/customer/book?unit=${unit.installed_ID}`)}
                >
                  Book service
                </button>
              </div>

              {historyUnit?.installed_ID === unit.installed_ID && (
                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    padding: "16px 18px",
                    background: "var(--bg-app)",
                  }}
                >
                  <p className="cust-meta-label" style={{ marginBottom: 12 }}>
                    Service history
                  </p>
                  <div className="cust-timeline">
                    {historyFor(unit).map((booking) => (
                      <div className="cust-timeline-item tone-success" key={booking.booking_ID}>
                        <p className="cust-timeline-date">{formatDate(booking.date)}</p>
                        <p className="cust-timeline-title">{booking.service_name}</p>
                        <p className="cust-timeline-note">
                          {booking.technician
                            ? `${booking.technician.name} · ${booking.status}`
                            : booking.status}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
};

export default CustomerMyUnits;
