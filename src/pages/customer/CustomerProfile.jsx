import React, { useState } from "react";
import { Icon } from "../../components/customer/CustomerIcons";
import { CURRENT_CUSTOMER, SAVED_ADDRESSES } from "../../data/customer/customerMockData";
import { formatDate } from "../../data/customer/customerSelectors";
import { useAuth } from "../../context/AuthContext";

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const CustomerProfile = () => {
  const { user } = useAuth();

  const [form, setForm] = useState({
    customer_name: user?.customer_name || CURRENT_CUSTOMER.customer_name,
    email: user?.email || CURRENT_CUSTOMER.email,
    phone: CURRENT_CUSTOMER.phone,
  });
  const [prefs, setPrefs] = useState({
    emailReminders: true,
    smsReminders: true,
    promoOffers: false,
  });
  const [toast, setToast] = useState(null);

  const updateField = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const togglePref = (key) =>
    setPrefs((current) => ({ ...current, [key]: !current[key] }));

  const save = (event) => {
    event.preventDefault();
    // Demo save. The real call is a PUT against the customer record in
    // user3.newCustomer / user3.topUser.
    setToast("Profile updated.");
    window.setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <div className="cust-page-head">
        <div>
          <h1>Profile & settings</h1>
          <p>Your contact details, saved addresses and reminder preferences.</p>
        </div>
      </div>

      <div className="cust-grid-2">
        <div>
          <section className="cust-panel">
            <div className="cust-panel-head">
              <div>
                <h2>Personal details</h2>
                <p>Used to contact you about bookings.</p>
              </div>
            </div>

            <form onSubmit={save}>
              <div className="dash-form-row">
                <label className="dash-form-label" htmlFor="profile-name">
                  Full name
                </label>
                <input
                  id="profile-name"
                  className="dash-form-input"
                  value={form.customer_name}
                  onChange={updateField("customer_name")}
                />
              </div>
              <div className="dash-form-row">
                <label className="dash-form-label" htmlFor="profile-email">
                  Email address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  className="dash-form-input"
                  value={form.email}
                  onChange={updateField("email")}
                />
              </div>
              <div className="dash-form-row">
                <label className="dash-form-label" htmlFor="profile-phone">
                  Mobile number
                </label>
                <input
                  id="profile-phone"
                  className="dash-form-input"
                  value={form.phone}
                  onChange={updateField("phone")}
                />
              </div>

              <button className="dash-btn dash-btn-primary" type="submit" style={{ marginTop: 6 }}>
                Save changes
              </button>
            </form>
          </section>

          <section className="cust-panel">
            <div className="cust-panel-head">
              <div>
                <h2>Saved addresses</h2>
                <p>Where we send technicians.</p>
              </div>
              <button className="dash-btn dash-btn-outline">
                <Icon name="plus" size={13} /> Add address
              </button>
            </div>

            {SAVED_ADDRESSES.map((address) => (
              <div
                key={address.address_ID}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <Icon name="pin" size={17} style={{ color: "var(--text-secondary)", marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 3px", fontSize: 13.5, fontWeight: 500 }}>
                    {address.label}
                    {address.isDefault && (
                      <span className="cust-badge tone-accent" style={{ marginLeft: 8 }}>
                        Default
                      </span>
                    )}
                  </p>
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)" }}>
                    {address.line}, Singapore {address.postal}
                  </p>
                </div>
                <div className="dash-row-actions">
                  <button className="dash-row-btn">Edit</button>
                  <button className="dash-row-btn is-danger">Remove</button>
                </div>
              </div>
            ))}
          </section>
        </div>

        <div>
          <section className="cust-panel">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "10px 0 6px",
              }}
            >
              <span className="cust-avatar" style={{ width: 64, height: 64, fontSize: 21 }}>
                {getInitials(form.customer_name)}
              </span>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: "14px 0 4px" }}>
                {form.customer_name}
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)" }}>
                Customer since {formatDate(CURRENT_CUSTOMER.joined)}
              </p>
              <span className="cust-badge tone-success" style={{ marginTop: 12 }}>
                <Icon name="star" size={12} />
                {CURRENT_CUSTOMER.loyalty_points} loyalty points
              </span>
            </div>
          </section>

          <section className="cust-panel">
            <div className="cust-panel-head">
              <div>
                <h2>Reminders</h2>
                <p>How we let you know about visits.</p>
              </div>
            </div>

            {[
              { key: "emailReminders", label: "Email reminders", note: "48 hours before a visit" },
              { key: "smsReminders", label: "SMS reminders", note: "On the morning of the visit" },
              { key: "promoOffers", label: "Promotions & offers", note: "Occasional discounts" },
            ].map((pref) => (
              <label
                key={pref.key}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 11,
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={prefs[pref.key]}
                  onChange={() => togglePref(pref.key)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 500 }}>
                    {pref.label}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{pref.note}</span>
                </span>
              </label>
            ))}
          </section>

          <section className="cust-panel">
            <div className="cust-panel-head">
              <h2>Account</h2>
            </div>
            <div className="cust-summary-row">
              <span className="cust-summary-label">Username</span>
              <span className="cust-summary-value dash-mono">{CURRENT_CUSTOMER.username}</span>
            </div>
            <div className="cust-summary-row">
              <span className="cust-summary-label">Customer ID</span>
              <span className="cust-summary-value dash-mono">
                {CURRENT_CUSTOMER.customer_ID}
              </span>
            </div>
            <button className="dash-btn dash-btn-outline" style={{ width: "100%", marginTop: 14 }}>
              Change password
            </button>
          </section>
        </div>
      </div>

      {toast && (
        <div className="cust-toast">
          <Icon name="checkCircle" size={16} />
          {toast}
        </div>
      )}
    </>
  );
};

export default CustomerProfile;
