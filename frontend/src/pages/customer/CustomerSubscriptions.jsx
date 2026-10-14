import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AirconUnitArt,
  EmptyStateArt,
  Icon,
  SnowfieldBackdrop,
} from "../../components/customer/CustomerIcons";
import { formatDate, formatLongDate, formatMoney } from "../../data/customer/customerSelectors";
import { useAuth } from "../../context/AuthContext";

//this page was made by giving the dashboard script to geimini and asking it to recreate for subscriptions, im surprised it works so well

// Dummy Subscription Data, scrapping this
const DUMMY_SUBSCRIPTIONS = [
  {
    subscription_id: "SUB-1001",
    plan_name: "Quarterly Aircon Care Plan",
    status: "Active", // Active, Paused, Cancelled, Expired
    billing_cycle: "Quarterly",
    price: 120.0,
    start_date: "2025-01-15",
    next_billing_date: "2026-04-15",
    next_service_date: "2026-04-20",
    coverage_units: 3,
    included_services: [
      "Filter cleaning & chemical flush",
      "Free priority booking slot",
      "15% off spare part replacements",
      "30-day workmanship guarantee",
    ],
    auto_renew: true,
  },
  {
    subscription_id: "SUB-1002",
    plan_name: "Bi-Annual Maintenance Shield",
    status: "Paused",
    billing_cycle: "Half-Yearly",
    price: 85.0,
    start_date: "2024-06-01",
    next_billing_date: "2026-06-01",
    next_service_date: "2026-06-10",
    coverage_units: 1,
    included_services: [
      "Basic aircon routine servicing",
      "Gas top-up discount",
      "Standard response time",
    ],
    auto_renew: false,
  },
];

const CustomerSubscriptions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'active' | 'inactive'

  // Simulate API fetch using dummy data
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      if (alive) {
        setSubscriptions(DUMMY_SUBSCRIPTIONS);
        setLoading(false);
      }
    }, 400);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((sub) => sub.status === "Active"),
    [subscriptions]
  );

  const filteredSubscriptions = useMemo(() => {
    if (activeTab === "active") return subscriptions.filter((s) => s.status === "Active");
    if (activeTab === "inactive") return subscriptions.filter((s) => s.status !== "Active");
    return subscriptions;
  }, [subscriptions, activeTab]);

  const firstName = (user?.customer_name || "there").split(" ")[0];

  if (loading) {
    return (
      <section className="cust-panel" style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading your subscriptions…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="cust-panel" style={{ padding: 48, textAlign: "center" }}>
        <h2>Couldn't load subscriptions</h2>
        <p style={{ color: "var(--text-secondary)", margin: "8px 0 16px" }}>{error}</p>
        <button className="dash-btn dash-btn-primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </section>
    );
  }

  return (
    <>
      {/* Banner Section */}
      <section className="cust-banner">
        <SnowfieldBackdrop />
        <div className="cust-banner-text">
          <p className="cust-banner-eyebrow">Service Plans</p>
          <h1>My Subscriptions</h1>
          <p>
            {activeSubscriptions.length > 0
              ? `Hi ${firstName}, you currently have ${activeSubscriptions.length} active subscription plan${
                  activeSubscriptions.length > 1 ? "s" : ""
                } keeping your aircon units running efficiently.`
              : `Hi ${firstName}, you don't have any active subscription plans at the moment.`}
          </p>
          <div className="cust-banner-actions">
            <button
              className="dash-btn dash-btn-primary"
              onClick={() => navigate("/customer/service-catalog")}
            >
              Browse plans
            </button>
            <button
              className="dash-btn cust-btn-ondark"
              onClick={() => navigate("/customer/book-service")}
            >
              Book one-off service
            </button>
          </div>
        </div>
        <div className="cust-banner-art d-none d-md-block">
          <AirconUnitArt width={230} />
        </div>
      </section>

      {/* Overview Stat Cards */}
      <section className="cust-stats">
        <article className="cust-stat cust-stat-success">
          <div className="cust-stat-icon">
            <Icon name="checkCircle" size={17} />
          </div>
          <p className="cust-stat-label">Active plans</p>
          <p className="cust-stat-value">{activeSubscriptions.length}</p>
          <p className="cust-stat-note">Auto-renewing recurring care</p>
        </article>

        <article className="cust-stat">
          <div className="cust-stat-icon">
            <Icon name="calendar" size={17} />
          </div>
          <p className="cust-stat-label">Next servicing date</p>
          <p className="cust-stat-value">
            {activeSubscriptions[0]?.next_service_date
              ? formatDate(activeSubscriptions[0].next_service_date)
              : "N/A"}
          </p>
          <p className="cust-stat-note">
            {activeSubscriptions[0] ? activeSubscriptions[0].plan_name : "No upcoming service"}
          </p>
        </article>

        <article className="cust-stat cust-stat-warning">
          <div className="cust-stat-icon">
            <Icon name="receipt" size={17} />
          </div>
          <p className="cust-stat-label">Next payment</p>
          <p className="cust-stat-value">
            {activeSubscriptions[0]
              ? formatMoney(activeSubscriptions[0].price)
              : formatMoney(0)}
          </p>
          <p className="cust-stat-note">
            {activeSubscriptions[0]?.next_billing_date
              ? `Due ${formatDate(activeSubscriptions[0].next_billing_date)}`
              : "No upcoming billing"}
          </p>
        </article>
      </section>

      {/* Main Content Grid */}
      <div className="cust-grid-2">
        {/* Left Column: Subscriptions List */}
        <div>
          <section className="cust-panel">
            <div className="cust-panel-head" style={{ alignItems: "center" }}>
              <div>
                <h2>Your Plan Details</h2>
                <p>Manage subscription renewal, services, and billing cycle</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className={`dash-btn ${
                    activeTab === "all" ? "dash-btn-primary" : "dash-btn-ghost"
                  }`}
                  style={{ padding: "4px 12px", fontSize: 12 }}
                  onClick={() => setActiveTab("all")}
                >
                  All
                </button>
                <button
                  className={`dash-btn ${
                    activeTab === "active" ? "dash-btn-primary" : "dash-btn-ghost"
                  }`}
                  style={{ padding: "4px 12px", fontSize: 12 }}
                  onClick={() => setActiveTab("active")}
                >
                  Active
                </button>
                <button
                  className={`dash-btn ${
                    activeTab === "inactive" ? "dash-btn-primary" : "dash-btn-ghost"
                  }`}
                  style={{ padding: "4px 12px", fontSize: 12 }}
                  onClick={() => setActiveTab("inactive")}
                >
                  Paused/Ended
                </button>
              </div>
            </div>

            {filteredSubscriptions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 12 }}>
                {filteredSubscriptions.map((sub) => (
                  <div
                    key={sub.subscription_id}
                    style={{
                      border: "1px solid var(--border-color, #e2e8f0)",
                      borderRadius: 12,
                      padding: 20,
                      backgroundColor: "var(--bg-surface, #fff)",
                    }}
                  >
                    {/* Subscription Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <span
                          className={`cust-badge tone-${
                            sub.status === "Active" ? "success" : "warning"
                          }`}
                          style={{ marginBottom: 6, display: "inline-flex" }}
                        >
                          <i /> {sub.status}
                        </span>
                        <h3 style={{ margin: "4px 0 2px", fontSize: 16, fontWeight: 600 }}>
                          {sub.plan_name}
                        </h3>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12.5,
                            color: "var(--text-secondary, #64748b)",
                          }}
                        >
                          Plan ID: {sub.subscription_id} · Covers {sub.coverage_units} Unit(s)
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-main)" }}>
                          {formatMoney(sub.price)}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 11.5,
                            color: "var(--text-secondary, #64748b)",
                          }}
                        >
                          / {sub.billing_cycle.toLowerCase()}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="cust-meta-grid" style={{ margin: "16px 0", gap: 12 }}>
                      <div className="cust-meta">
                        <Icon name="calendar" size={16} />
                        <div>
                          <p className="cust-meta-label">Next Service</p>
                          <p className="cust-meta-value">
                            {sub.next_service_date
                              ? formatLongDate(sub.next_service_date)
                              : "Not scheduled"}
                          </p>
                        </div>
                      </div>
                      <div className="cust-meta">
                        <Icon name="receipt" size={16} />
                        <div>
                          <p className="cust-meta-label">Next Renewal</p>
                          <p className="cust-meta-value">
                            {sub.next_billing_date
                              ? formatDate(sub.next_billing_date)
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Plan Features / Coverage */}
                    <div
                      style={{
                        padding: 12,
                        backgroundColor: "var(--bg-subtle, #f8fafc)",
                        borderRadius: 8,
                        marginBottom: 16,
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 8px",
                          fontSize: 12,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "var(--text-secondary, #64748b)",
                        }}
                      >
                        Plan Coverage Includes
                      </p>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 18,
                          fontSize: 13,
                          color: "var(--text-main)",
                          lineHeight: 1.6,
                        }}
                      >
                        {sub.included_services.map((service, idx) => (
                          <li key={idx}>{service}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid var(--border-color, #f1f5f9)",
                        paddingTop: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary, #64748b)",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Icon name="clock" size={14} />
                        Auto-renew: {sub.auto_renew ? "On" : "Off"}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="dash-btn dash-btn-outline"
                          onClick={() => navigate("/customer/book-service")}
                        >
                          Schedule service
                        </button>
                        <button
                          className="dash-btn dash-btn-ghost"
                          onClick={() => alert(`Manage options for ${sub.subscription_id}`)}
                        >
                          Manage plan
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cust-empty">
                <EmptyStateArt />
                <h3>No subscriptions found</h3>
                <p>You don't have any subscription plans matching this filter.</p>
                <button
                  className="dash-btn dash-btn-primary"
                  onClick={() => navigate("/customer/service-catalog")}
                >
                  Browse care plans
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Support & Information */}
        <div>
          <section className="cust-panel">
            <div className="cust-panel-head">
              <h2>Subscription Benefits</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="cust-meta">
                <Icon name="star" size={18} />
                <div>
                  <p className="cust-meta-label">Priority Scheduling</p>
                  <p className="cust-meta-value" style={{ fontWeight: 400, fontSize: 13 }}>
                    Subscribers skip the wait list and get guaranteed slots during heatwaves.
                  </p>
                </div>
              </div>
              <div className="cust-meta">
                <Icon name="shield" size={18} />
                <div>
                  <p className="cust-meta-label">Extended Workmanship Warranty</p>
                  <p className="cust-meta-value" style={{ fontWeight: 400, fontSize: 13 }}>
                    Enjoy up to 30 days of coverage on every subscription maintenance visit.
                  </p>
                </div>
              </div>
              <div className="cust-meta">
                <Icon name="receipt" size={18} />
                <div>
                  <p className="cust-meta-label">Parts & Repairs Discount</p>
                  <p className="cust-meta-value" style={{ fontWeight: 400, fontSize: 13 }}>
                    Get up to 15% off spare parts, chemical overhauls, and extra aircon units.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="cust-panel">
            <div className="cust-panel-head">
              <h2>Need help with your plan?</h2>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: "0 0 14px",
                lineHeight: 1.6,
              }}
            >
              Have questions about pausing, upgrading, or changing your billing method? Contact our
              support team.
            </p>
            <div className="cust-meta" style={{ marginBottom: 12 }}>
              <Icon name="phone" size={16} />
              <div>
                <p className="cust-meta-label">Support Hotline</p>
                <p className="cust-meta-value">+65 6123 4567</p>
              </div>
            </div>
            <button
              className="dash-btn dash-btn-outline"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => navigate("/customer/service-catalog")}
            >
              Explore all plans
            </button>
          </section>
        </div>
      </div>
    </>
  );
};

export default CustomerSubscriptions;