import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AirconUnitArt, Icon, SnowfieldBackdrop } from "../../components/customer/CustomerIcons";
import { formatMoney } from "../../data/customer/customerSelectors";
import { getPlans, getPromotions, getServices } from "../../api/customerApi";

const PROMO_TONES = ["accent", "success", "warning"];

/* Perks built from REAL plan fields (visits, interval, covered service) */
const planPerks = (plan) => {
  const perks = [];
  if (plan.visits_included > 0)
    perks.push(`Covers ${plan.visits_included} servicing visit${plan.visits_included > 1 ? "s" : ""}`);
  if (plan.interval_days) perks.push(`Scheduled every ${plan.interval_days} days`);
  if (plan.service_name) perks.push(`Includes ${plan.service_name}`);
  perks.push("Priority scheduling for subscribers");
  return perks;
};

const CustomerServiceCatalog = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState("All");
  const [services, setServices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Real data — services, plans and promotions all from the database */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [svcRes, planRes, promoRes] = await Promise.all([
          getServices(),
          getPlans(),
          getPromotions(),
        ]);
        if (!alive) return;
        setServices(svcRes?.services || []);
        setPlans(planRes?.plans || []);
        setPromotions(promoRes?.promotions || []);
      } catch (err) {
        if (alive) setError(err.message || "Server error");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(services.map((s) => s.category || "Maintenance"))],
    [services]
  );
  const visible = useMemo(
    () =>
      category === "All"
        ? services
        : services.filter((s) => (s.category || "Maintenance") === category),
    [services, category]
  );

  const discountLabel = (promo) =>
    promo.discount_type === "percent"
      ? `${promo.discount_value}% off`
      : `${formatMoney(promo.discount_value)} off`;

  if (loading) {
    return (
      <section className="cust-panel" style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading our services…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="cust-panel" style={{ padding: 48, textAlign: "center" }}>
        <h2>Couldn't load the catalog</h2>
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
          <p className="cust-banner-eyebrow">Services &amp; packages</p>
          <h1>Everything we can do for your aircon.</h1>
          <p>
            Transparent pricing, certified technicians and a 30-day workmanship guarantee on every
            job. No hidden call-out fees.
          </p>
        </div>
        <div className="cust-banner-art d-none d-md-block">
          <AirconUnitArt width={210} />
        </div>
      </section>

      {/* Individual services — real data from payables.service 
      <section className="cust-panel">
        <div className="cust-panel-head">
          <div>
            <h2>Individual services</h2>
            <p>Book a one-off visit — pay only for what you need.</p>
          </div>
          <div className="dash-chips">
            {categories.map((entry) => (
              <button
                key={entry}
                className={`dash-chip${category === entry ? " is-active" : ""}`}
                onClick={() => setCategory(entry)}
              >
                {entry}
              </button>
            ))}
          </div>
        </div>
      
     <div className="cust-choice-grid">
          {visible.map((service) => (
            <article className="cust-choice" key={service.service_id} style={{ cursor: "default" }}>
              <span className="cust-choice-icon">
                <Icon name={service.icon || "snowflake"} size={19} />
              </span>
              <h3 className="cust-choice-title">{service.service_name}</h3>
              <p className="cust-choice-desc">{service.description}</p>

              <ul className="cust-perks" style={{ margin: "4px 0 8px" }}>
                {(service.includes || []).slice(0, 3).map((line) => (
                  <li className="cust-perk" key={line}>
                    <Icon name="check" size={13} strokeWidth={2.6} />
                    {line}
                  </li>
                ))}
              </ul>

              <div className="cust-choice-foot">
                <span className="cust-price">
                  {formatMoney(service.price)}
                  <span className="cust-price-unit">{service.unit_label}</span>
                </span>
                <span className="cust-duration">
                  <Icon name="clock" size={12} />
                  {service.duration_mins} min
                </span>
              </div>

              <button
                className="dash-btn dash-btn-primary"
                style={{ width: "100%", marginTop: 4 }}
                onClick={() => navigate(`/customer/book?service=${service.service_id}`)}
              >
                Book this service
              </button>
            </article>
          ))}
        </div>
      
      </section>*/}
      
            {/* Maintenance plans — real data from payables.subscription */}
      <section className="cust-panel">
        <div className="cust-panel-head">
          <div>
            <h2>Maintenance plans</h2>
            <p>Prepay for a full servicing cycle — one simple price for every visit.</p>
          </div>
        </div>

        <div className="cust-plan-grid">
          {plans.map((plan) => (
            <article className="cust-plan" key={plan.plan_id}>
              <div>
                <h3 className="cust-plan-name">{plan.plan_name}</h3>
                <p className="cust-plan-desc">{plan.description}</p>
              </div>

              <div>
                <div className="cust-plan-price">
                  <span className="cust-plan-amount">{formatMoney(plan.price)}</span>
                </div>
                <p className="cust-plan-save">
                  {formatMoney(plan.price_per_visit)} per visit · {plan.visits_included} visits
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  fontSize: 11.5,
                  color: "var(--text-secondary)",
                }}
              >
                <span className="cust-badge tone-muted">
                  <Icon name="calendar" size={12} />
                  {plan.interval_label}
                </span>
                <span className="cust-badge tone-muted">
                  <Icon name="home" size={12} />
                  {plan.service_name}
                </span>
              </div>

              <ul className="cust-perks">
                {planPerks(plan).map((perk) => (
                  <li className="cust-perk" key={perk}>
                    <Icon name="check" size={14} strokeWidth={2.6} />
                    {perk}
                  </li>
                ))}
              </ul>

              <button
                className="dash-btn dash-btn-primary"
                style={{ width: "100%", marginTop: "auto" }}
                onClick={() => navigate("/customer/book")}
              >
                Choose {plan.plan_name}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Promotions — real data from payables.promotions */}
      <section className="cust-panel">
        <div className="cust-panel-head">
          <div>
            <h2>Current promotions</h2>
            <p>Apply any of these codes at the last step of booking.</p>
          </div>
        </div>

        <div className="cust-choice-grid">
          {promotions.map((promo, idx) => (
            <div
              className={`cust-promo-card tone-${PROMO_TONES[idx % PROMO_TONES.length]}`}
              key={promo.promo_id}
            >
              <span className="cust-promo-code">{promo.code}</span>
              <h3>{promo.title}</h3>
              <p>{promo.description}</p>
              <span className="cust-promo-valid">
                <Icon name="tag" size={12} />
                {discountLabel(promo)}
                {promo.valid_until ? ` · Valid until ${promo.valid_until}` : ""}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default CustomerServiceCatalog;