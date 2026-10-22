import React, { useEffect, useState } from "react";
import { Icon } from "../../components/customer/CustomerIcons";
import { formatDate } from "../../data/customer/customerSelectors";
import { useAuth } from "../../context/AuthContext";
import { getAddresses, getDashboard, updateProfile } from "../../api/customerApi";

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
    customer_name: user?.customer_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: "",
  });
  const [account, setAccount] = useState({ customer_ID: null, username: null, joined: null, loyalty_points: 0 });
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getDashboard(), getAddresses()])
      .then(([dashRes, addrRes]) => {
        if (!alive) return;
        const p = dashRes?.profile || {};
        setForm({
          customer_name: p.customer_name || user?.customer_name || "",
          email: p.email || user?.email || "",
          phone: p.phone || "",
          address: p.address || "",
        });
        setAccount({
          customer_ID: p.customer_ID || null,
          username: p.username || user?.username || null,
          joined: p.joined || null,
          loyalty_points: Number(p.loyalty_points || 0),
        });
        const list = addrRes?.addresses || [];
        setAddresses(list);
      })
      .catch((err) => alive && setToast(err.message || "Could not load profile"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const [prefs, setPrefs] = useState({
    emailReminders: true,
    smsReminders: true,
    promoOffers: false,
  });
  const togglePref = (key) =>
    setPrefs((current) => ({ ...current, [key]: !current[key] }));

  // Real save — PUT /api/customer/profile updates user3.newCustomer + user3.topUser
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        customer_name: form.customer_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
      });
      setToast("Profile updated.");
    } catch (err) {
      setToast(err.message || "Could not save changes.");
    } finally {
      setSaving(false);
      window.setTimeout(() => setToast(null), 3000);
    }
  };

  if (loading) {
    return (
      <section className="cust-panel" style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading your profile…</p>
      </section>
    );
  }

  return (
    <>
      <div className="cust-page-head">
        <div>
          <h1>Profile & settings</h1>
          <p>Your contact details, saved address and reminder preferences.</p>
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
                <label className="dash-form-label" htmlFor="profile-name">Full name</label>
                <input
                  id="profile-name"
                  className="dash-form-input"
                  value={form.customer_name}
                  onChange={updateField("customer_name")}
                  required
                />
              </div>
              <div className="dash-form-row">
                <label className="dash-form-label" htmlFor="profile-email">Email address</label>
                <input
                  id="profile-email"
                  type="email"
                  className="dash-form-input"
                  value={form.email}
                  onChange={updateField("email")}
                />
              </div>
              <div className="dash-form-row">
                <label className="dash-form-label" htmlFor="profile-phone">Mobile number</label>
                <input
                  id="profile-phone"
                  className="dash-form-input"
                  value={form.phone}
                  onChange={updateField("phone")}
                />
              </div>
              <div className="dash-form-row">
                <label className="dash-form-label" htmlFor="profile-address">Service address</label>
                <textarea
                  id="profile-address"
                  className="dash-form-input"
                  rows={2}
                  style={{ resize: "vertical" }}
                  value={form.address}
                  onChange={updateField("address")}
                />
              </div>

              <button className="dash-btn dash-btn-primary" type="submit" disabled={saving} style={{ marginTop: 6 }}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </section>

          <section className="cust-panel">
            <div className="cust-panel-head">
              <div>
                <h2>Saved address</h2>
                <p>Where we send technicians.</p>
              </div>
            </div>

            {addresses.length > 0 ? (
              addresses.map((address) => (
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
                      {address.line}
                      {address.postal ? `, Singapore ${address.postal}` : ""}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                No address on file yet — add one above and press Save changes.
              </p>
            )}
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
                {form.customer_name || "Customer"}
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)" }}>
                Customer since {formatDate(account.joined)}
              </p>
              <span className="cust-badge tone-success" style={{ marginTop: 12 }}>
                <Icon name="star" size={12} />
                {account.loyalty_points} loyalty points
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
              <span className="cust-summary-value dash-mono">{account.username || "—"}</span>
            </div>
            <div className="cust-summary-row">
              <span className="cust-summary-label">Customer ID</span>
              <span className="cust-summary-value dash-mono">{account.customer_ID || "—"}</span>
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