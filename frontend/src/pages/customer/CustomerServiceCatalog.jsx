import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AirconUnitArt, Icon, SnowfieldBackdrop } from "../../components/customer/CustomerIcons";
import { PACKAGES, PROMOTIONS, SERVICES } from "../../data/customer/customerMockData";
import { formatMoney, getServiceCategories } from "../../data/customer/customerSelectors";

const CustomerServiceCatalog = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => getServiceCategories(), []);
  const visible = useMemo(
    () =>
      category === "All"
        ? SERVICES
        : SERVICES.filter((service) => service.category === category),
    [category]
  );

  const bookService = (serviceId) => navigate(`/customer/book?service=${serviceId}`);

  return (
    <>
      <section className="cust-banner">
        <SnowfieldBackdrop />
        <div className="cust-banner-text">
          <p className="cust-banner-eyebrow">Service catalogue</p>
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

      {/* Individual services */}
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
              {service.popular && (
                <span
                  className="cust-badge tone-accent"
                  style={{ position: "absolute", top: 12, right: 12 }}
                >
                  Popular
                </span>
              )}
              <span className="cust-choice-icon">
                <Icon name={service.icon} size={19} />
              </span>
              <h3 className="cust-choice-title">{service.service_name}</h3>
              <p className="cust-choice-desc">{service.description}</p>

              <ul className="cust-perks" style={{ margin: "4px 0 8px" }}>
                {service.includes.slice(0, 3).map((line) => (
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
                onClick={() => bookService(service.service_id)}
              >
                Book this service
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Maintenance plans */}
      <section className="cust-panel">
        <div className="cust-panel-head">
          <div>
            <h2>Maintenance plans</h2>
            <p>Prepay for a year of servicing and save up to 23%.</p>
          </div>
        </div>

        <div className="cust-plan-grid">
          {PACKAGES.map((plan) => {
            const saving = plan.original_price - plan.price;
            const savingPct = Math.round((saving / plan.original_price) * 100);

            return (
              <article
                className={`cust-plan${plan.featured ? " is-featured" : ""}`}
                key={plan.package_ID}
              >
                {plan.featured && <span className="cust-plan-flag">Most popular</span>}

                <div>
                  <h3 className="cust-plan-name">{plan.package_name}</h3>
                  <p className="cust-plan-desc">{plan.description}</p>
                </div>

                <div>
                  <div className="cust-plan-price">
                    <span className="cust-plan-amount">{formatMoney(plan.price)}</span>
                    <span className="cust-plan-was">{formatMoney(plan.original_price)}</span>
                  </div>
                  <p className="cust-plan-save">
                    Save {formatMoney(saving)} ({savingPct}%) · per year
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
                    {plan.best_for}
                  </span>
                </div>

                <ul className="cust-perks">
                  {plan.perks.map((perk) => (
                    <li className="cust-perk" key={perk}>
                      <Icon name="check" size={14} strokeWidth={2.6} />
                      {perk}
                    </li>
                  ))}
                </ul>

                <button
                  className={`dash-btn ${plan.featured ? "dash-btn-primary" : "dash-btn-outline"}`}
                  style={{ width: "100%", marginTop: "auto" }}
                  onClick={() => navigate("/customer/book")}
                >
                  Choose {plan.package_name}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* Promotions */}
      <section className="cust-panel">
        <div className="cust-panel-head">
          <div>
            <h2>Current promotions</h2>
            <p>Apply any of these codes at the last step of booking.</p>
          </div>
        </div>

        <div className="cust-choice-grid">
          {PROMOTIONS.map((promo) => (
            <div className={`cust-promo-card tone-${promo.tone}`} key={promo.promo_ID}>
              <span className="cust-promo-code">{promo.code}</span>
              <h3>{promo.title}</h3>
              <p>{promo.description}</p>
              <span className="cust-promo-valid">
                <Icon name="tag" size={12} />
                Valid until {promo.valid_to}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default CustomerServiceCatalog;
