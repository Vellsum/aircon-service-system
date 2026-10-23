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
  getServices,helpMyID,
} from "../../api/customerApi"; // WE CALL CUSTOMER API EXPORTED METHODS

const STEPS = [ //steps to do here
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

//the component itself =====================================================================================
const CustomerBookService = () => {
  const navigate = useNavigate();
  const [numberOfUnits, setNumOfUnits]=useState(); //change unit selection to just how many, number of units from 1-3
  const [searchParams] = useSearchParams();

  // Deep links from the catalogue and unit cards preselect the draft,
  // e.g. /customer/book-service?service=2&unit=9003
  const presetServiceId = Number(searchParams.get("service")) || null;
  const presetUnitId = Number(searchParams.get("unit")) || null;

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(presetServiceId);
  const [serviceIds, setServiceIds] = useState([]);   //this is to hold multiple services in a single booking
  const [unitIds, setUnitIds] = useState(presetUnitId ? [presetUnitId] : []);
  const [date, setDate] = useState("");
  const [slotId, setSlotId] = useState(null); //morning or afternoon

  //estimated total time n cost
  const [estimatedtotaltime, setestimatedtotatltime]=useState("");
    const [estimatedtotalcost, setestimatedtotatlcost]=useState("");

    //customer id
    const [customerid,setcustomerid]=useState(""); //where dafuq do i find the customer id??

  const [addressId, setAddressId] = useState(null);
  const [notes, setNotes] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");   //which fucking var is the data?
  const [confirmed, setConfirmed] = useState(null);

  // Live data
  const [services, setServices] = useState([]);
  const [units, setUnits] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  //when component mounts...
  useEffect(() => {
    //get my customer id
      let my_id;
        my_id=helpMyID();
        console.log(my_id);
      //watever the fuck logic here


      setcustomerid(my_id);
      
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
  //const slot = TIME_SLOTS.find((entry) => entry.id === slotId) || null;
  const slot = slotId || null;
  const address = addresses.find((entry) => entry.address_ID === addressId) || null;
  const selectedUnits = units.filter((unit) => unitIds.includes(unit.installed_ID));
  
  //we have this pricing method?
const pricing = useMemo(() => {
    const unitCount = Number(numberOfUnits) || 0;
    const selectedServices = services.filter((s) => serviceIds.includes(s.service_id));
    const subtotal = selectedServices.reduce((acc, svc) => acc + (svc.price * unitCount), 0);
    
    // Calculate discount based on your appliedPromo logic
    let discount = 0;
    if (appliedPromo) {
      if (appliedPromo.type === "percentage") {
        discount = subtotal * (appliedPromo.value / 100);
      } else {
        discount = appliedPromo.value || 0;
      }
    }
    
    const total = Math.max(0, subtotal - discount);
    return { subtotal, discount, total };
  }, [serviceIds, services, numberOfUnits, appliedPromo]);

      //method for total estimated time, var kept
      const totalEstimatedTime = useMemo(() => {
      const unitCount = Number(numberOfUnits) || 0;
      const selectedServices = services.filter((s) => serviceIds.includes(s.service_id));
      const baseMinutes = selectedServices.reduce((acc, svc) => acc + (svc.duration_mins || 0), 0);
      return baseMinutes * unitCount;
    }, [serviceIds, services, numberOfUnits]);

  // Each step gates the "Continue" button until it has what it needs. this part decides if user input is enough to go to the next step
  const stepComplete = {
    1:serviceIds.length > 0,
    2: numberOfUnits > 0,
    3: Boolean(date) && Boolean(slot),
    4: Boolean(address),
    5: true,
  };

  //method to link set amount to database or something, replaces below method
const setNumberUnits= (amount)=>{
//wtf??? did that pussy scott wrote this shit?
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

  //methods for the step
  const goNext = () => setStep((current) => Math.min(current + 1, STEPS.length));
  const goBack = () => setStep((current) => Math.max(current - 1, 1));

  {/** this is the method to take all the data in this frontend to  backend */}

  //limpeh needs to change this to give newer data but backend also need to touch
const submitBooking = async () => {    
    if (serviceIds.length === 0 || !date || !slot || !address) return;
    setSubmitting(true);
    setSubmitError("");
    try {

          // Save the final calculated values
  //  setEstimatedTotalTime(totalEstimatedTime);
    //setEstimatedTotalCost(pricing.total); 


      const res = await createBooking({
        customer_ID: helpMyID(),//it should be customer id, not service id
       // serviceIds: serviceIds,     
        numberOfUnits: numberOfUnits,  //number of units to update in controller
        date,
        time: slot,  //morning or afternooon thats going into timing column
        location: `${address.line}${address.postal ? `, Singapore ${address.postal}` : ""}`,
        comments: notes || null,
        promoCode: appliedPromo?.code || null,
        estimatedtotalcost: pricing.total,    //the new data of estimated total time n cost
        estimatedtotaltime: totalEstimatedTime
      });
      setConfirmed({ reference: res.reference, total: pricing.total });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err.message || "Could not create the booking. Please try again.");
    } finally {
      setSubmitting(false);
      console.log(totalEstimatedTime  + ' min'); //so i can get the var directly from below
      console.log(pricing.total+ ' $');
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

  //this method is to show number of aircons, uses usestate var from above
const handleChange = (e) => {
    setNumOfUnits(e.target.value);
  };
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
          
        {/* Step 1 — services */}
          {step === 1 && (
            <section className="cust-panel">
              <div className="cust-panel-head">
                <div>
                  <h2>What do you need done?</h2>
                  <p>Pick one or more services that match your needs.</p>
                </div>
              </div>
              {services.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  No services are available right now. Please check back later.
                </p>
              ) : (
                <div className="cust-choice-grid">
                  {services.map((entry) => {
                    const isSelected = Array.isArray(serviceIds) 
                      ? serviceIds.includes(entry.service_id) 
                      : serviceId === entry.service_id;

                    const handleServiceToggle = () => {
                      if (Array.isArray(serviceIds)) {
                        if (isSelected) {
                          setServiceIds(serviceIds.filter((id) => id !== entry.service_id));
                        } else {
                          setServiceIds([...serviceIds, entry.service_id]);
                        }
                      } else {
                        // Fallback if transitioning from a single serviceId state
                        setServiceId(entry.service_id);
                      }
                    };

                    return (
                      <button
                        type="button"
                        key={entry.service_id}
                        className={`cust-choice${isSelected ? " is-selected" : ""}`}
                        onClick={handleServiceToggle}
                      >
                        {isSelected && (
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
                    );
                  })}
                </div>
              )}
            </section>
          )}


          {/* Step 2 —  number units */}
          {step === 2 && (
            <section className="cust-panel">
              <div className="cust-panel-head">
              <div>
  <h2>How many units need attention?</h2>
  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
    {[1, 2, 3].map((num) => {
      const isSelected = Number(numberOfUnits) === num;
      return (
        <button
          type="button"
          key={num}
          className={`dash-btn ${isSelected ? "dash-btn-primary" : "dash-btn-outline"}`}
          style={{ flex: 1, padding: "12px 0" }}
          onClick={() => setNumOfUnits(num)}
        >
          {num} unit{num !== 1 ? "s" : ""}
        </button>
      );
    })}
  </div>
  
  <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)" }}>
    You selected: {numberOfUnits || "None"}
  </p>
</div>
              </div>
             
             
            </section>
          )} {/**end of step 2, select number of units   */}



{/* Step 3 — date and time of day */}
          {step === 3 && (
            <section className="cust-panel">
              <div className="cust-panel-head">
                <div>
                  <h2>When suits you?</h2>
                  <p>Choose a date, then select morning or afternoon.</p>
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
                <div className="cust-slot-group">
                  <p className="cust-slot-period">Time</p>
                  <div className="cust-slots">
                    {["Morning", "Afternoon"].map((period) => {
                      const isAfternoonDisabled = period === "Afternoon" && Number(numberOfUnits) === 3;
                      return (
                        <button
                          type="button"
                          key={period}
                          disabled={isAfternoonDisabled}
                          className={`cust-slot${slotId === period ? " is-selected" : ""}`}
                          onClick={() => setSlotId(period)}
                          title={isAfternoonDisabled ? "Afternoon unavailable for 3 units" : undefined}
                        >
                          {period}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                  Pick a date to see available options.
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
                <span className="cust-summary-label">Services</span>
                <span className="cust-summary-value">
                  {services
                    .filter((s) => serviceIds.includes(s.service_id))
                    .map((s) => s.service_name)
                    .join(", ") || "None"}
                </span>
              </div>
              <div className="cust-summary-row">
                <span className="cust-summary-label">Number of Units</span>
                <span className="cust-summary-value">{numberOfUnits || "—"}</span>
              </div>
              <div className="cust-summary-row">
                <span className="cust-summary-label">Date</span>
                <span className="cust-summary-value">{date ? formatLongDate(date) : "—"}</span>
              </div>
              <div className="cust-summary-row">
                <span className="cust-summary-label">Time</span>
                <span className="cust-summary-value">{slot || "—"}</span>
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

        
            
          
              {/**
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
              )} */}
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
              <span className="cust-summary-label">Services</span>
              <span className={`cust-summary-value${serviceIds.length ? "" : " is-muted"}`}>
                {serviceIds.length > 0 
                  ? services.filter(s => serviceIds.includes(s.service_id)).map(s => s.service_name).join(", ") 
                  : "Not chosen"}
              </span>
            </div>
            <div className="cust-summary-row">
              <span className="cust-summary-label">Number of Units</span>
              <span>{numberOfUnits || 0}</span>
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
                {slot || "Not chosen"}
              </span>
            </div>

                      
            {serviceIds.length > 0 && numberOfUnits && (
              <>                      {/** estimated total cost -------------------- */}

                                    {/**how about we send estimate total time n cost on the final confirm booking button */}
               {services
    .filter((s) => serviceIds.includes(s.service_id))
    .map((svc) => {
      const unitCount = Number(numberOfUnits) || 0;
      const itemTotal = svc.price * unitCount;
      return (
        <div key={svc.service_id} className="cust-summary-row">
          <span className="cust-summary-label">
            {svc.service_name} ({formatMoney(svc.price)} × {unitCount})
          </span>
          <span className="cust-summary-value dash-mono">
            {formatMoney(itemTotal)}
          </span>
        </div>
      );
    })}
                {/**  {services
                  .filter((s) => serviceIds.includes(s.service_id))
                  .map((svc) => {
                    const unitCount = Number(numberOfUnits) || 0;
                    const itemTotal = svc.price * unitCount;
                   // setestimatedtotatlcost(svc.price * unitCount);
                    return (
                      <div key={svc.service_id} className="cust-summary-row">
                        <span className="cust-summary-label">
                          {svc.service_name} ({formatMoney(svc.price)} × {unitCount})
                        </span>
                        <span className="cust-summary-value dash-mono">
                          {formatMoney(itemTotal)} 
                        </span>
                      </div>
                    );
                  })} */}
              

                      {/** estimated total time -------------------- */}
                        {/* estimated total time , ai code*/}
                        <div className="cust-summary-row">
                          <span className="cust-summary-label">Total Estimated Time</span>
                          <span className="cust-summary-value">
                            {totalEstimatedTime} mins
                          </span>
                        </div>
                        {/** the estimated total is not a var number here */}
                      {/**      <div className="cust-summary-row">
                  <span className="cust-summary-label">Total Estimated Time</span>
                  <span className="cust-summary-value">
                    
                
                    {services
                      .filter((s) => serviceIds.includes(s.service_id))
                      .reduce((acc, svc) => acc + (svc.duration_mins || 0), 0) * (Number(numberOfUnits) || 0)}
                    {estimatedtotalcost} mins
                  </span>
                </div> ***/}
          

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