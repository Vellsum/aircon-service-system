import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BookingDetailsModal from "../../components/customer/BookingDetailsModal";
import BookingStatusBadge from "../../components/customer/BookingStatusBadge";
import {
  AirconUnitArt,
  EmptyStateArt,
  Icon,
  SnowfieldBackdrop,
} from "../../components/customer/CustomerIcons";
import { getDashboard, getMySubscriptions, getIncomingBookings,helpMyID
  ,updateIncomingBookingStatus,chooseRROption, pickRR1,pickRR2, pickRR3
 } from "../../api/customerApi";  //NOTE GET METHODS FROM CUSTOMER API
import {
  describeBookingUnits,
  describeCountdown,
  formatDate,
  formatLongDate,
  formatMoney,
  statusTone,
} from "../../data/customer/customerSelectors";
import { useAuth } from "../../context/AuthContext";     //various watever imports ===============================================================================
//import { chooseRROption } from "../../../../backend/src/controllers/customerController";

const getInitials = (name = "") =>
  name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const DAY_MS = 24 * 60 * 60 * 1000;
const isUnitOverdue = (unit) => unit.next_due && new Date(unit.next_due) < new Date();
const isUnitDueSoon = (unit) =>
  unit.next_due && new Date(unit.next_due) - new Date() <= 14 * DAY_MS;


//the available options in the small quick actions button, just navigator ========================================================
const quickActions = [
  { label: "Book a service", icon: "plus", path: "/customer/book-service" },
  { label: "View my bookings", icon: "calendar", path: "/customer/bookings" },
  { label: "Browse subscriptions", icon: "grid", path: "/customer/service-catalog" },

]; 

//dashboard component itself ==================================================================================================
const CustomerDashboard = () => {
  //usestate var to hold incoooming booking to approve
const [incomingBookings, setIncomingBookings] = useState([]);
const [incomingLoading, setIncomingLoading] = useState(true);
const [incomingError, setIncomingError] = useState("");const [processingId, setProcessingId] = useState(null);
const [bookingActionError, setBookingActionError] = useState("");

  const navigate = useNavigate();
  const { user } = useAuth();
  const [openBooking, setOpenBooking] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [subscriptions, setSubscriptions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [subsError, setSubsError] = useState("");

// get the proper incomings============================================================================================================

useEffect(() => {
  let alive = true;

  const loadIncomingBookings = async () => {
    try {
      setIncomingLoading(true);
      setIncomingError("");

      // Use the logged-in customer's actual ID.
      const customerId = user?.customer_ID ?? user?.customerId;

      if (!customerId) {
        throw new Error("Customer ID is missing from the logged-in user.");
      }

      const res = await getIncomingBookings(customerId);

      if (!alive) return;

      if (res?.success) {
        setIncomingBookings(res.bookings || []);
      } else {
        setIncomingError(res?.message || "Could not load incoming bookings.");
      }
    } catch (err) {
      if (alive) {
        console.error("Incoming bookings error:", err);
        setIncomingError(
          err.response?.data?.message ||
          err.message ||
          "Unable to load incoming bookings."
        );
      }
    } finally {
      if (alive) setIncomingLoading(false);
    }
  };

  loadIncomingBookings();

  return () => {
    alive = false;
  };
}, [user]);

 


  useEffect(() => {
    let alive = true;
    getDashboard()
      .then((res) => alive && setData(res))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await getMySubscriptions();
        if (!alive) return;
        if (res && res.success) setSubscriptions(res.subscriptions || []);
        else setSubsError((res && res.message) || "Could not load subscriptions");
      } catch (err) {
        if (alive) setSubsError(err.message || "Server error");
      } finally {
        if (alive) setSubsLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  const stats = data?.stats ?? { upcoming: 0, units: 0, completed: 0, totalSpend: 0 };
  const nextBooking = data?.nextBooking ?? null;
  const recent = useMemo(() => (data?.recent ?? []).slice(0, 4), [data]);
  const units = data?.units ?? [];
  const dueSoon = useMemo(() => units.filter(isUnitDueSoon), [units]);
  const loyaltyPoints = data?.profile?.loyalty_points ?? 0;

  const firstName = (user?.customer_name || data?.profile?.customer_name || "there").split(" ")[0];

  //watever loading=====================================================================================================================================
  if (loading) {
    return (
      <section className="cust-panel" style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading your dashboard…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="cust-panel" style={{ padding: 48, textAlign: "center" }}>
        <h2>Couldn't load your dashboard</h2>
        <p style={{ color: "var(--text-secondary)", margin: "8px 0 16px" }}>{error}</p>
        <button className="dash-btn dash-btn-primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </section>
    );
  }



//methods when user choose to reject or approve booking time ==================================
//when either clicked, set the booking status
const rejectTiming = () =>{
  console.log('rejected timing');

  //set booking status to request reschedule



}

const approveTiming = () => {
    console.log('accepted  timing');

//set booking status to confirmed


}

//a method to get incoming booking, filter by assigned status
const getIncoming=()=>{

  console.log('assigned booking came');

}


//all in one, takes the booking id and status n send to api
const handleBookingDecision = async (booking, status) => {
  if (!booking?.booking_ID) {
    setBookingActionError("This booking has no valid booking ID.");
    return;
  }

  console.log(booking); console.log(status);
  try {
    setProcessingId(booking.booking_ID);
    setBookingActionError("");

    await updateIncomingBookingStatus(booking.booking_ID, status); {/** <--- this method to be made in the api */}

    // Remove it from the assigned bookings list after success.
    setIncomingBookings((current) =>
      current.filter(
        (item) => item.booking_ID !== booking.booking_ID
      )
    );
  } catch (err) {
    setBookingActionError(
      err.message || "Could not update this booking."
    );
  } finally {
    setProcessingId(null);
  }
};

//the new methods for the RR -----------------------------------------------------------------------------------
const pick_RR1 = async(booking)=>{
console.log("customer pick rr1 option");
  if (!booking?.booking_ID) {
    setBookingActionError("This booking has no valid booking ID.");
    return;
  }

  console.log(booking); console.log(status);
  try {
    setProcessingId(booking.booking_ID);
    setBookingActionError("");

    await pickRR1(booking.booking_ID, status); {/** <--- this method to be made in the api */}

    // Remove it from the assigned bookings list after success.
    setIncomingBookings((current) =>
      current.filter(
        (item) => item.booking_ID !== booking.booking_ID
      )
    );
  } catch (err) {
    setBookingActionError(
      err.message || "Could not update this alternative booking 1 .booking."
    );
  } finally {
    setProcessingId(null);
  }


}

const pick_RR2 = async(booking)=>{
  console.log("customer pick rr2 option");
  if (!booking?.booking_ID) {
    setBookingActionError("This booking has no valid booking ID.");
    return;
  }

  console.log(booking); console.log(status);
  try {
    setProcessingId(booking.booking_ID);
    setBookingActionError("");

    await pickRR2(booking.booking_ID, status); {/** <--- this method to be made in the api */}

    // Remove it from the assigned bookings list after success.
    setIncomingBookings((current) =>
      current.filter(
        (item) => item.booking_ID !== booking.booking_ID
      )
    );
  } catch (err) {
    setBookingActionError(
      err.message || "Could not update this alternative booking 2 .booking."
    );
  } finally {
    setProcessingId(null);
  }


}

const pick_RR3 = async(booking)=>{
  console.log("customer pick rr3 option");
  if (!booking?.booking_ID) {
    setBookingActionError("This booking has no valid booking ID.");
    return;
  }

  console.log(booking); console.log(status);
  try {
    setProcessingId(booking.booking_ID);
    setBookingActionError("");

    await pickRR3(booking.booking_ID, status); {/** <--- this method to be made in the api */}

    // Remove it from the assigned bookings list after success.
    setIncomingBookings((current) =>
      current.filter(
        (item) => item.booking_ID !== booking.booking_ID
      )
    );
  } catch (err) {
    setBookingActionError(
      err.message || "Could not update this alternative booking 3 .booking."
    );
  } finally {
    setProcessingId(null);
  }




}


//merge into 1 method that take in the diff arguments
const pick_RR=async(booking,option)=>{
    console.log("clicked on merge method");


try {
    setProcessingId(booking.booking_ID);
    setBookingActionError("");

    await chooseRROption(booking.booking_ID, option);//call controller method

   // await fetch(``)
    // Remove it from the assigned bookings list after success.
    setIncomingBookings((current) =>
      current.filter(
        (item) => item.booking_ID !== booking.booking_ID
      )
    );
  } catch (err) {
    setBookingActionError(
      err.message || "Could not book this alternative booking."
    );
  } finally {
    setProcessingId(null);
  }




}

const RR_redo=async (booking,status)=>{
console.log("customer reject all RR options");
// change status back to pending

try {
    setProcessingId(booking.booking_ID);
    setBookingActionError("");

    await updateIncomingBookingStatus(booking.booking_ID, status);

    // Remove it from the assigned bookings list after success.
    setIncomingBookings((current) =>
      current.filter(
        (item) => item.booking_ID !== booking.booking_ID
      )
    );
  } catch (err) {
    setBookingActionError(
      err.message || "Could not update this booking."
    );
  } finally {
    setProcessingId(null);
  }


}


  //return actual html =====================================================================================================================================
  return (
    <>
      {/* Welcome banner =------------------------------------------------------------------------------------------------  =*/}
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
            {/* ✅ FIXED path */}
            <button className="dash-btn dash-btn-primary" onClick={() => navigate("/customer/book-service")}>
              Book a service
            </button>
            <button className="dash-btn cust-btn-ondark" onClick={() => navigate("/customer/bookings")}>
              View my bookings
            </button>
          </div>
        </div>
        <div className="cust-banner-art d-none d-md-block">
          <AirconUnitArt width={230} />
        </div>
      </section>

       {/* RR BOOKINGS 
       now its admin propose slots for bookings ------------------------------------------------------------------------------------------------ */}
<section className="cust-panel" style={{ borderLeft: "4px solid var(--primary, #1b8a5a)" }}>
  <div className="cust-panel-head">
      <div>
        <h2>Slot unavailable for these bookings.</h2>
        <p>Please consider these other slots instead.</p>
      </div>
  </div>


  
<div>

{/** with the api methods, put them all out with a input*/}
  {incomingLoading ? (
    <p>Loading incoming bookings...</p>
  ) : incomingError ? (
    <p style={{ color: "var(--danger, #c0392b)" }}>
      {incomingError}
    </p>
  ) : incomingBookings.length === 0 ? (
    <p>No incoming bookings found.</p>
  ) : (
    incomingBookings.map((booking) => (
      <div
        key={booking.booking_ID}
        style={{
          padding: 16,
          marginBottom: 12,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        <p>
          <strong>Booking #{booking.booking_ID}</strong>
        </p>
        <p>Service: {booking.service_name || "Service booking"}</p>
        <p>Status: {booking.status}</p>
        <p>Date: {booking.date || "Not specified"}</p>
        <p>Timing: {booking.timing}</p>
      {/**<p>Time: {booking.time || "Not specified"}</p> */}  
        <p>Location: {booking.location || "Not specified"}</p>
{/**i dont need to know technicaisn 
        <p>======================</p>
        

        <p>{booking.RR1_date}</p>
        <p>{booking.RR1_time}</p>*/}
        <hr></hr>
        <p><b>Proposed alternatives</b></p>
        <div> <span>Option 1: </span>
        <button 
        className="dash-btn dash-btn-primary"
        onClick={() => pick_RR1(booking)}>
          Date: {booking.RR1_date}, Timing: {booking.RR1_time}</button></div>

  <p> </p>
        <div><span>Option 2: </span>
        <button 
        className="dash-btn dash-btn-primary"
        onClick={() => pick_RR2(booking)}>
          Date: {booking.RR2_date}, Timing: {booking.RR2_time}</button></div>

  <p> </p>

             <div><span>Option 3: </span><button 
        className="dash-btn dash-btn-primary"
        onClick={() => pick_RR3(booking)}>
          Date: {booking.RR3_date}, Timing: {booking.RR3_time}</button></div>



{bookingActionError && processingId === null && (
  <p style={{ color: "var(--danger, #c0392b)" }}>
    {bookingActionError}
  </p>
)}


  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

{/**newer */}
<button
      className="dash-btn dash-btn-ghost"
      style={{ color: "var(--danger, #c0392b)" }}
     
      onClick={() => RR_redo(booking, "Pending")}
    >
      
     Request another date
    </button>


    {/** <button
      className="dash-btn dash-btn-ghost"
      style={{ color: "var(--danger, #c0392b)" }}
      disabled={processingId === booking.booking_ID}
      onClick={() => handleBookingDecision(booking, "request_reschedule")}
    >
      
      {processingId === booking.booking_ID
        ? "Processing..."
        : "Request another date"}
    </button>*/}
    

{/**
 * 
 *   <button
      className="dash-btn dash-btn-primary"
      disabled={processingId === booking.booking_ID}
      onClick={() => handleBookingDecision(booking, "confirmed")}
    >
      {processingId === booking.booking_ID
        ? "Processing..."
        : "Approve timing"}
    </button>
 */}
  
  </div>

</div>


        
    
      
    ))
  )}
</div>


</section>

{/* View current subscriptions ---------------------------------------------------------------------------------------------*/}
<section className="cust-panel">
  <div className="cust-panel-head">
    <div>
      <h2>Your current subscriptions</h2>
      <p>Active maintenance plans and packages</p>
    </div>
  </div>

  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {/* Example Mock Subscription Card - Replace or map with your actual subscription data */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        borderRadius: "var(--radius)",
        background: "var(--bg-app)",
        border: "1px solid var(--border)",
        flexWrap: "wrap",
        gap: 16,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>
            Quarterly Aircon Maintenance Plan (i am mock data)
          </p>
          <span className="cust-badge tone-success" style={{ fontSize: 11, padding: "2px 8px" }}>
            Active (i am mock data)
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
          Covers 3 units · Renews on 12 Dec 2026 (i am mock data)
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          className="dash-btn dash-btn-outline"
          onClick={() => navigate("/customer/service-catalog")}
        >
          Manage plan (i am not done yet)
        </button>
      </div>
    </div>
  </div>
</section>


{/***
 * this is that weird ass-----------------------------------------------------------------
 *   <section className="cust-panel">
        <div className="cust-panel-head">
          <div>
            <h2>Your current subscriptions</h2>
            <p>Active care plans keeping your units on schedule</p>
          </div>
          <button
            className="dash-btn dash-btn-ghost"
            onClick={() => navigate("/customer/subscriptions")}
          >
            Manage →
          </button>
        </div>

        {subsLoading && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Loading your subscriptions…</p>
        )}
        {!subsLoading && subsError && (
          <p style={{ fontSize: 13, color: "var(--danger, #c0392b)" }}>{subsError}</p>
        )}

        {!subsLoading && !subsError && subscriptions.length === 0 && (
          <div className="cust-empty" style={{ padding: "24px 0" }}>
            <h3>No package subscriptions yet</h3>
            <p>Prepay for a servicing cycle and save with every visit.</p>
            <button
              className="dash-btn dash-btn-primary"
              onClick={() => navigate("/customer/service-catalog")}
            >
              Browse care plans
            </button>
          </div>
        )}

        {!subsLoading && !subsError && subscriptions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {subscriptions.map((sub) => (
              <div
                key={sub.package_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  border: "1px solid var(--border-color, #e2e8f0)",
                  borderRadius: 12,
                  padding: "14px 18px",
                  backgroundColor: "var(--bg-surface, #fff)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 14 }}>{sub.package_name}</strong>
                    <span
                      className={`cust-badge tone-${sub.status === "Active" ? "success" : "warning"}`}
                    >
                      <i /> {sub.status}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12.5,
                      color: "var(--text-secondary, #64748b)",
                    }}
                  >
                    {sub.description}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary, #64748b)" }}>
                    Includes: {sub.services_included?.length ? sub.services_included.join(", ") : "—"}
                    {Number(sub.remaining_bookings) > 0 &&
                      ` · ${sub.remaining_bookings} of ${sub.visits_included} visits left`}
                    {sub.next_booking_date && ` · Next visit ${formatDate(sub.next_booking_date)}`}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-main)" }}>
                    {formatMoney(sub.price)}
                  </p>
                  {sub.price_per_visit ? (
                    <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-secondary, #64748b)" }}>
                      {formatMoney(sub.price_per_visit)}/visit
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
 * 
 */}
    

      {/* Service-due nudge  -------------------------------------------------------------------------------------------------------------- */}
      {/**unused codes */}
      {/** */}
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
          {/* ✅ FIXED path */}
          <button className="dash-btn dash-btn-outline" onClick={() => navigate("/customer/book-service")}>
            Book now
          </button>
        </div>
      )}

      {/* Stat row  -------------------------------------------------------------------------------------------------------------- */}
      <section className="cust-stats">
        <article className="cust-stat">
          <div className="cust-stat-icon"><Icon name="calendar" size={17} /></div>
          <p className="cust-stat-label">Upcoming visits</p>
          <p className="cust-stat-value">{stats.upcoming}</p>
          <p className="cust-stat-note">
            {nextBooking ? `Next: ${formatDate(nextBooking.date)}` : "Nothing scheduled"}
          </p>
        </article>

{/**  
 * removed watever this was
 *  <article className="cust-stat cust-stat-cyan">
          <div className="cust-stat-icon"><Icon name="snowflake" size={17} /></div>
          <p className="cust-stat-label">Registered units</p>
          <p className="cust-stat-value">{stats.units}</p>
          <p className="cust-stat-note">
            {dueSoon.length > 0 ? `${dueSoon.length} due soon` : "All up to date"}
          </p>
        </article>*/}
      

        <article className="cust-stat cust-stat-success">
          <div className="cust-stat-icon"><Icon name="checkCircle" size={17} /></div>
          <p className="cust-stat-label">Services completed</p>
          <p className="cust-stat-value">{stats.completed}</p>
          <p className="cust-stat-note">Since you joined</p>
        </article>

        <article className="cust-stat cust-stat-warning">
          <div className="cust-stat-icon"><Icon name="receipt" size={17} /></div>
          <p className="cust-stat-label">Total spend</p>
          <p className="cust-stat-value">{formatMoney(stats.totalSpend)}</p>
          <p className="cust-stat-note">{loyaltyPoints} loyalty points</p>
        </article>
      </section>

      <div className="cust-grid-2">
        {/* Left column --------------------------------------------------------------------------------------------------------------*/}
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
                    {/* ✅ FIXED: pass units so it resolves real units, not mock */}
                    <p className="cust-nextvisit-service">
                      {nextBooking.service_name} · {describeBookingUnits(nextBooking, units)}
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
                      <span className="cust-avatar">{getInitials(nextBooking.technician.name)}</span>
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
                {/* ✅ FIXED path */}
                <button className="dash-btn dash-btn-primary" onClick={() => navigate("/customer/book-service")}>
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
              <button className="dash-btn dash-btn-ghost" onClick={() => navigate("/customer/bookings")}>
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
                    {/* ✅ FIXED: pass units */}
                    <p className="cust-timeline-title">
                      {booking.service_name} · {describeBookingUnits(booking, units)}
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

        {/* Right column, now just the quick actions --------------------------------------------------------------------------------------------------------------*/}
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

{/**    <section className="cust-panel">
            <div className="cust-panel-head">
              <div>
                <h2>My units</h2>
                <p>Servicing status at a glance</p>
              </div>
            </div>

            {units.map((unit) => {
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
              onClick={() => navigate("/customer/my-units")}
            >
              Manage units
            </button>
          </section>*/}
       
{/**   <section className="cust-panel">
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
          </section> */}
       
        </div>
      </div>

      <BookingDetailsModal booking={openBooking} onClose={() => setOpenBooking(null)} />
    </>
  );
};

export default CustomerDashboard;