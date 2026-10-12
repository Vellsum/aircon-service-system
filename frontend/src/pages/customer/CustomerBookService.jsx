import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/customer/CustomerIcons";
import { TIME_SLOTS } from "../../data/customer/customerMockData";
import {
  findPromotion,
  findService,
  formatLongDate,
  formatMoney,
  priceBooking,
} from "../../data/customer/customerSelectors";
import {
  createBooking,
  getAddresses,
  getMyUnits,
  getPromotions,
  getServices,
} from "../../api/customerApi";

const STEPS = [
  { id: 1, label: "Service" },
  { id: 2, label: "Units" },
  { id: 3, label: "Date & time" },
  { id: 4, label: "Details" },
  { id: 5, label: "Confirm" },
];

/** Today in YYYY-MM-DD, used as the earliest bookable date. */
function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** "9:00 AM" / "09:00 – 10:00" → "09:00" (24h) for the DB time column. */
function slotStartTime(label) {
  const m = String(label).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!m) return "09:00";
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const CustomerBookService = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Deep links from the catalogue and unit cards preselect the draft,
  // e.g. /customer/book-service?service=2&unit=9003
  const presetServiceId = Number(searchParams.get("service")) || null;
  const presetUnitId = Number(searchParams.get("unit")) || null;

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(presetServiceId);
  const [unitIds, setUnitIds] = useState(presetUnitId ? [presetUnitId] : []);
  const [date, setDate] = useState("");
  const [slotId, setSlotId] = useState(null);
  const [addressId, setAddressId] = useState(null);
  const [notes, setNotes] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState(null);

  // Live data
  const [services, setServices] = useState([]);
  const [units, setUnits] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([getServices(), getMyUnits(), getPromotions(), getAddresses()])
      .then(([svcRes, unitRes, promoRes, addrRes]) => {
        if (!alive) return;
        setServices(svcRes.services || []);
        setUnits(unitRes.units || []);
        setPromotions(promoRes.promotions || []);
        setAddresses(addrRes.addresses || []);
        const defaultAddr = (addrRes.addresses || []).find((a) => a.isDefault) || (addrRes.addresses || [])[0];
        if (defaultAddr) setAddressId(defaultAddr.address_ID);
      })
      .catch((err) => alive && setLoadError(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const service = useMemo(() => findService(serviceId, services), [serviceId, services]);
  const slot = TIME_SLOTS.find((entry) => entry.id === slotId) || null;
  const address = addresses.find((entry) => entry.address_ID === addressId) || null;
  const selectedUnits = units.filter((unit) => unitIds.includes(unit.installed_ID));

  const pricing = useMemo(
    () => priceBooking({ service, unitCount: unitIds.length, promo: appliedPromo }),
    [service, unitIds.length, appliedPromo]
  );

  // Each step gates the "Continue" button until it has what it needs.
  const stepComplete = {
    1: Boolean(service),
    2: unitIds.length > 0,
    3: Boolean(date) && Boolean(slot),
    4: Boolean(address),
    5: true,
  };

  const toggleUnit = (installedId) => {
    setUnitIds((current) =>
      current.includes(installedId)
        ? current.filter((id) => id !== installedId)
        : [...current, installedId]
    );
  };

  const applyPromo = () => {
    const promo = findPromotion(promoInput, promotions);
    if (promo) {
      setAppliedPromo(promo);
      setPromoError("");
    } else {
      setAppliedPromo(null);
      setPromoError("That code isn't valid or has expired.");
    }
  };

  const goNext = () => setStep((current) => Math.min(current + 1, STEPS.length));
  const goBack = () => setStep((current) => Math.max(current - 1, 1));

  const submitBooking = async () => {
    if (!service || !date || !slot || !address) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await createBooking({
        serviceId: service.service_id,
        unitIds: unitIds, // no link table yet — kept for future use
        date,
        time: slotStartTime(slot.label),
        location: `${address.line}${address.postal ? `, Singapore ${address.postal}` : ""}`,
        comments: notes || null,
        promoCode: appliedPromo?.code || null,
      });
      setConfirmed({ reference: res.reference, total: pricing.total });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err.message || "Could not create the booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------ loading / error states */
  if (loading) {
    return (
      <section className="cust-panel" style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading booking options…</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="cust-panel" style={{ padding: 48, textAlign: "center" }}>
        <h2>Couldn't load the booking form</h2>
        <p style={{ color: "var(--text-secondary)", margin: "8px 0 16px" }}>{loadError}</p>
        <button className="dash-btn dash-btn-primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </section>
    );
  }

  /* ------------------------------------------------ confirmation screen */
  if (confirmed) {
    return (
      <section className="cust-panel" style={{ maxWidth: 560, margin: "40px auto" }}>
        <div className="cust-empty">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(27, 138, 90, 0.1)",
              color: "var(--success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
            }}
          >
            <Icon name="checkCircle" size={32} />
          </div>
          <h3 style={{ fontSize: 19 }}>Booking confirmed</h3>
          <p>
            We've received your request for <strong>{service?.service_name}</strong> on{" "}
            <strong>{formatLongDate(date)}</strong> at <strong>{slot?.label}</strong>. A technician
            will be assigned shortly and you'll get a confirmation email.
          </p>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "14px 18px",
              background: "var(--bg-app)",
              marginBottom: 20,
              textAlign: "left",
            }}
          >
            <div className="cust-summary-row">
              <span className="cust-summary-label">Reference</span>
              <span className="cust-summary-value dash-mono">{confirmed.reference}</span>
            </div>
            <div className="cust-summary-row">
              <span className="cust-summary-label">Units</span>
              <span className="cust-summary-value">
                {selectedUnits.map((unit) => unit.nickname).join(", ") || "—"}
              </span>
            </div>
            <div className="cust-summary-row">
              <span className="cust-summary-label">Total</span>
              <span className="cust-summary-value dash-mono">
                {formatMoney(confirmed.total)}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="dash-btn dash-btn-primary"
              onClick={() => navigate("/customer/bookings")}
            >
              View my bookings
            </button>
            <button
              className="dash-btn dash-btn-outline"
              onClick={() => navigate("/customer/dashboard")}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ---------------------------------------------------------- the wizard */
  return (
    <>
      <div className="cust-page-head">
        <div>
          <h1>Book a service</h1>
          <p>Five quick steps and a technician will be on the way.</p>
        </div>
      </div>

      {/* Step indicator */}
      <section className="cust-panel">
        <div className="cust-progress">
          {STEPS.map((entry) => {
            const state =
              entry.id < step ? "is-done" : entry.id === step ? "is-current" : "";
            return (
              <div className={`cust-progress-step ${state}`} key={entry.id}>
                <span className="cust-progress-dot">
                  {entry.id < step ? <Icon name="check" size={13} strokeWidth={2.6} /> : entry.id}
                </span>
                <p className="cust-progress-label">{entry.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="cust-grid-2">
        <div>
          {/* Step 1 — service */}
          {step === 1 && (
            <section className="cust-panel">
              <div className="cust-panel-head">
                <div>
                  <h2>What do you need done?</h2>
                  <p>Pick the service that best matches the problem.</p>
                </div>
              </div>
              {services.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  No services are available right now. Please check back later.
                </p>
              ) : (
                <div className="cust-choice-grid">
                  {services.map((entry) => (
                    <button
                      type="button"
                      key={entry.service_id}
                      className={`cust-choice${serviceId === entry.service_id ? " is-selected" : ""}`}
                      onClick={() => setServiceId(entry.service_id)}
                    >
                      {serviceId === entry.service_id && (
                        <span className="cust-choice-tick">
                          <Icon name="check" size={12} strokeWidth={3} />
                        </span>
                      )}
                      <span className="cust-choice-icon">
                        <Icon name={entry.icon} size={19} />
                      </span>
                      <h3 className="cust-choice-title">{entry.service_name}</h3>
                      <p className="cust-choice-desc">{entry.description}</p>
                      <div className="cust-choice-foot">
                        <span className="cust-price">
                          {formatMoney(entry.price)}
                          <span className="cust-price-unit">{entry.unit_label}</span>
                        </span>
                        <span className="cust-duration">
                          <Icon name="clock" size={12} />
                          {entry.duration_mins} min
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Step 2 — units */}
          {step === 2 && (
            <section className="cust-panel">
              <div className="cust-panel-head">
                <div>
                  <h2>Which units need attention?</h2>
                  <p>Select one or more. Pricing updates as you choose.</p>
                </div>
              </div>
              {units.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  You have no registered units yet. Add one from My Aircon Units first.
                </p>
              ) : (
                <div className="cust-choice-grid">
                  {units.map((unit) => (
                    <button
                      type="button"
                      key={unit.installed_ID}
                      className={`cust-choice${
                        unitIds.includes(unit.installed_ID) ? " is-selected" : ""
                      }`}
                      onClick={() => toggleUnit(unit.installed_ID)}
                    >
                      {unitIds.includes(unit.installed_ID) && (
                        <span className="cust-choice-tick">
                          <Icon name="check" size={12} strokeWidth={3} />
                        </span>
                      )}
                      <span className="cust-choice-icon">
                        <Icon name="snowflake" size={19} />
                      </span>
                      <h3 className="cust-choice-title">{unit.nickname}</h3>
                      <p className="cust-choice-desc">
                        {unit.brand} {unit.model}
                      </p>
                      <div className="cust-choice-foot">
                        <span className="cust-duration">
                          <Icon name="history" size={12} />
                          Last: {unit.last_service || "—"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 14 }}>
                Unit not listed? You can add it from{" "}
                <button
                  className="dash-btn dash-btn-ghost"
                  style={{ padding: 0 }}
                  onClick={() => navigate("/customer/my-units")}
                >
                  My Aircon Units
                </button>
                .
              </p>
            </section>
          )}

          {/* Step 3 — date and slot (slots are static UI config — no slot table in schema) */}
          {step === 3 && (
            <section className="cust-panel">
              <div className="cust-panel-head">
                <div>
                  <h2>When suits you?</h2>
                  <p>Choose a date, then an available time slot.</p>
                </div>
              </div>

              <div className="dash-form-row" style={{ maxWidth: 260 }}>
                <label className="dash-form-label" htmlFor="booking-date">
                  Preferred date
                </label>
                <input
                  id="booking-date"
                  type="date"
                  className="dash-form-input"
                  min={todayISO()}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>

              {date ? (
                ["Morning", "Afternoon", "Evening"].map((period) => {
                  const periodSlots = TIME_SLOTS.filter((entry) => entry.period === period);
                  if (periodSlots.length === 0) return null;
                  return (
                    <div className="cust-slot-group" key={period}>
                      <p className="cust-slot-period">{period}</p>
                      <div className="cust-slots">
                        {periodSlots.map((entry) => (
                          <button
                            type="button"
                            key={entry.id}
                            disabled={!entry.available}
                            className={`cust-slot${slotId === entry.id ? " is-selected" : ""}`}
                            onClick={() => setSlotId(entry.id)}
                            title={entry.available ? undefined : "Fully booked"}
                          >
                            {entry.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                  Pick a date to see the available time slots.
                </p>
              )}
            </section>
          )}

          {/* Step 4 — address and notes */}
          {step === 4 && (
            <section className="cust-panel">
              <div className="cust-panel-head">
                <div>
                  <h2>Where should we come?</h2>
                  <p>Confirm the address and add anything the technician should know.</p>
                </div>
              </div>

              <div className="cust-choice-grid" style={{ marginBottom: 18 }}>
                {addresses.map((entry) => (
                  <button
                    type="button"
                    key={entry.address_ID}
                    className={`cust-choice${
                      addressId === entry.address_ID ? " is-selected" : ""
                    }`}
                    onClick={() => setAddressId(entry.address_ID)}
                  >
                    {addressId === entry.address_ID && (
                      <span className="cust-choice-tick">
                        <Icon name="check" size={12} strokeWidth={3} />
                      </span>
                    )}
                    <span className="cust-choice-icon">
                      <Icon name="pin" size={19} />
                    </span>
                    <h3 className="cust-choice-title">{entry.label}</h3>
                    <p className="cust-choice-desc">
                      {entry.line}
                      {entry.postal ? (
                        <>
                          <br />
                          Singapore {entry.postal}
                        </>
                      ) : null}
                    </p>
                  </button>
                ))}
              </div>

              <div className="dash-form-row">
                <label className="dash-form-label" htmlFor="booking-notes">
                  Notes for the technician (optional)
                </label>
                <textarea
                  id="booking-notes"
                  className="dash-form-input"
                  rows={4}
                  style={{ resize: "vertical" }}
                  placeholder="e.g. Unit is leaking water, please bring a ladder. Buzz unit 09-45."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </section>
          )}

          {/* Step 5 — review */}
          {step === 5 && (
            <section className="cust-panel">
              <div className="cust-panel-head">
                <div>
                  <h2>Check the details</h2>
                  <p>Everything look right? Confirm to send it through.</p>
                </div>
              </div>

              <div className="cust-summary-row">
                <span className="cust-summary-label">Service</span>
                <span className="cust-summary-value">{service?.service_name}</span>
              </div>
              <div className="cust-summary-row">
                <span className="cust-summary-label">Units</span>
                <span className="cust-summary-value">
                  {selectedUnits.map((unit) => unit.nickname).join(", ") || "—"}
                </span>
              </div>
              <div className="cust-summary-row">
                <span className="cust-summary-label">Date</span>
                <span className="cust-summary-value">{formatLongDate(date)}</span>
              </div>
              <div className="cust-summary-row">
                <span className="cust-summary-label">Time</span>
                <span className="cust-summary-value">{slot?.label}</span>
              </div>
              <div className="cust-summary-row">
                <span className="cust-summary-label">Address</span>
                <span className="cust-summary-value">
                  {address?.line}
                  {address?.postal ? `, Singapore ${address.postal}` : ""}
                </span>
              </div>
              {notes && (
                <div className="cust-summary-row">
                  <span className="cust-summary-label">Notes</span>
                  <span className="cust-summary-value is-muted">{notes}</span>
                </div>
              )}

              {service && (
                <div style={{ marginTop: 20 }}>
                  <p className="cust-meta-label">What's included</p>
                  <ul className="cust-perks" style={{ marginTop: 8 }}>
                    {service.includes.map((line) => (
                      <li className="cust-perk" key={line}>
                        <Icon name="check" size={14} strokeWidth={2.6} />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Wizard controls */}
          <div className="cust-wizard-nav">
            <button
              className="dash-btn dash-btn-outline"
              onClick={step === 1 ? () => navigate("/customer/dashboard") : goBack}
            >
              <Icon name="chevronLeft" size={13} /> {step === 1 ? "Cancel" : "Back"}
            </button>

            {step < STEPS.length ? (
              <button
                className="dash-btn dash-btn-primary"
                disabled={!stepComplete[step]}
                style={!stepComplete[step] ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                onClick={goNext}
              >
                Continue <Icon name="chevronRight" size={13} />
              </button>
            ) : (
              <button
                className="dash-btn dash-btn-primary"
                disabled={submitting}
                onClick={submitBooking}
              >
                {submitting ? "Sending…" : `Confirm booking · ${formatMoney(pricing.total)}`}
              </button>
            )}
          </div>

          {submitError && (
            <p style={{ color: "var(--danger, #c0392b)", fontSize: 13, textAlign: "right", marginTop: 8 }}>
              {submitError}
            </p>
          )}
        </div>

        {/* Live summary */}
        <aside className="cust-summary">
          <div className="cust-summary-head">
            <h3>Booking summary</h3>
          </div>
          <div className="cust-summary-body">
            <div className="cust-summary-row">
              <span className="cust-summary-label">Service</span>
              <span className={`cust-summary-value${service ? "" : " is-muted"}`}>
                {service?.service_name || "Not chosen"}
              </span>
            </div>
            <div className="cust-summary-row">
              <span className="cust-summary-label">Units</span>
              <span className={`cust-summary-value${unitIds.length ? "" : " is-muted"}`}>
                {unitIds.length ? `${unitIds.length} selected` : "None"}
              </span>
            </div>
            <div className="cust-summary-row">
              <span className="cust-summary-label">Date</span>
              <span className={`cust-summary-value${date ? "" : " is-muted"}`}>
                {date ? formatLongDate(date) : "Not chosen"}
              </span>
            </div>
            <div className="cust-summary-row">
              <span className="cust-summary-label">Time</span>
              <span className={`cust-summary-value${slot ? "" : " is-muted"}`}>
                {slot?.label || "Not chosen"}
              </span>
            </div>

            {service && (
              <>
                <div className="cust-summary-row">
                  <span className="cust-summary-label">
                    {formatMoney(service.price)} × {pricing.billableUnits}{" "}
                    {service.unit_label === "per unit" ? "unit(s)" : ""}
                  </span>
                  <span className="cust-summary-value dash-mono">
                    {formatMoney(pricing.subtotal)}
                  </span>
                </div>
                {appliedPromo && (
                  <div className="cust-summary-row">
                    <span className="cust-summary-label">
                      Promo {appliedPromo.code}
                    </span>
                    <span className="cust-summary-value dash-mono cust-summary-discount">
                      −{formatMoney(pricing.discount)}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="cust-promo-entry">
              <input
                type="text"
                placeholder="Promo code"
                value={promoInput}
                onChange={(event) => setPromoInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && applyPromo()}
                aria-label="Promo code"
              />
              <button className="dash-btn dash-btn-outline" onClick={applyPromo}>
                Apply
              </button>
            </div>
            {appliedPromo && (
              <p className="cust-promo-msg is-ok">
                {appliedPromo.title} applied.
              </p>
            )}
            {promoError && <p className="cust-promo-msg is-bad">{promoError}</p>}
          </div>

          <div className="cust-summary-total">
            <span className="cust-summary-total-label">Estimated total</span>
            <span className="cust-summary-total-value">{formatMoney(pricing.total)}</span>
          </div>
        </aside>
      </div>
    </>
  );
};

export default CustomerBookService;