import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "../../styles/Home.css"; // Local style import

const trustStats = [
  { value: "500+", label: "Happy Customers" },
  { value: "24", label: "Certified Technicians" },
  { value: "10+", label: "Years of Service" },
  { value: "4.8★", label: "Average Rating" },
];

const services = [
  { icon: "🧊", name: "Aircon Servicing", desc: "Routine servicing to keep your unit running efficiently year-round." },
  { icon: "🧼", name: "Chemical Cleaning", desc: "Deep cleaning to remove mould, dust, and bacteria buildup." },
  { icon: "🔧", name: "Aircon Repair", desc: "Fast, reliable repairs for leaks, noise, and cooling issues." },
  { icon: "🏗", name: "Installation", desc: "Professional installation for new and replacement units." },
];

const promotions = [
  { code: "COOL10", title: "10% Off Servicing", desc: "Get 10% off any standard aircon servicing booking.", validity: "Valid until 30 Sep 2026" },
  { code: "NEWCUST20", title: "$20 Off First Booking", desc: "New customers get $20 off their very first service.", validity: "Valid until 31 Dec 2026" },
  { code: "DEEPCLEAN15", title: "15% Off Deep Cleaning", desc: "Save on our thorough chemical cleaning package.", validity: "Starts 10 Sep 2026" },
];

const Home = () => {
  const navigate = useNavigate(); // Initialize hook inside component

  return (
    <div>
      <nav className="site-nav">
        <div className="site-nav-brand">
          <span>❄</span>
          <span>Aircon Care</span>
        </div>
        <div className="site-nav-links">
          <a href="#services">Services</a>
          <a href="#promotions">Promotions</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
        <div className="site-nav-actions">
          {/* Working routing to /login */}
          <button 
            className="dash-btn dash-btn-outline" 
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button 
            className="dash-btn dash-btn-primary" 
            onClick={() => navigate("/login")}
          >
            Book a Service
          </button>
        </div>
      </nav>

      <section className="site-hero">
        <p className="site-hero-eyebrow">TRUSTED AIRCON SPECIALISTS</p>
        <h1>Cool Comfort, Every Season.</h1>
        <p>
          From routine servicing to emergency repairs, our certified technicians
          keep your home and business running cool, clean, and efficient.
        </p>
        <div className="site-hero-actions">
          <button 
            className="dash-btn dash-btn-primary" 
            onClick={() => navigate("/login")}
          >
            Book a Service
          </button>
          <a href="#services">
            <button className="dash-btn dash-btn-outline">View Services</button>
          </a>
        </div>
      </section>

      <section className="site-trust">
        {trustStats.map((stat) => (
          <div className="site-trust-item" key={stat.label}>
            <p className="site-trust-value">{stat.value}</p>
            <p className="site-trust-label">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="site-section" id="about">
        <div className="site-about">
          <div>
            <h2>Keeping Your Space Cool for Over 10 Years</h2>
            <p>
              Aircon Care started with a simple goal: make quality aircon service
              accessible and hassle-free. Today, our team of certified technicians
              serves hundreds of homes and businesses with servicing, repairs,
              cleaning, and installations.
            </p>
            <p>
              Every job is backed by transparent pricing, real-time booking
              tracking, and a satisfaction guarantee — no surprises, just cool air.
            </p>
            <button className="dash-btn dash-btn-primary">Learn More About Us</button>
          </div>
          <div className="site-about-visual">🧊</div>
        </div>
      </section>

      <section className="site-section" id="services">
        <div className="site-section-head">
          <p className="site-eyebrow">What We Offer</p>
          <h2>Our Services</h2>
          <p>Comprehensive aircon care, from first install to ongoing maintenance.</p>
        </div>
        <div className="site-services">
          {services.map((service) => (
            <div className="site-service-card" key={service.name}>
              <div className="site-service-icon">{service.icon}</div>
              <h3>{service.name}</h3>
              <p>{service.desc}</p>
              <a href="#">Learn More →</a>
            </div>
          ))}
        </div>
      </section>

      <section className="site-section site-promos" id="promotions">
        <div className="site-section-head">
          <p className="site-eyebrow">Limited Time</p>
          <h2>Ongoing Promotions</h2>
          <p>Save on your next booking with one of our current offers.</p>
        </div>
        <div className="site-promo-grid">
          {promotions.map((promo) => (
            <div className="site-promo-card" key={promo.code}>
              <span className="site-promo-code">{promo.code}</span>
              <h3>{promo.title}</h3>
              <p>{promo.desc}</p>
              <p className="site-promo-validity">{promo.validity}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="site-cta">
        <h2>Ready to book your next service?</h2>
        <p>Get a certified technician at your door as soon as tomorrow.</p>
        <button 
          className="dash-btn dash-btn-primary" 
          onClick={() => navigate("/login")}
        >
          Book a Service Now
        </button>
      </div>

      <footer className="site-footer" id="contact">
        <div className="site-footer-grid">
          <div>
            <div className="site-footer-brand">
              <span>❄</span>
              <span>Aircon Care</span>
            </div>
            <p>Reliable aircon servicing, repairs, and installation you can trust.</p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#services" style={{ color: "inherit", textDecoration: "none" }}>Services</a></li>
              <li><a href="#promotions" style={{ color: "inherit", textDecoration: "none" }}>Promotions</a></li>
              <li><a href="#about" style={{ color: "inherit", textDecoration: "none" }}>About Us</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li>hello@aircon-care.com</li>
              <li>+65 6123 4567</li>
              <li>Mon–Sat, 9am–6pm</li>
            </ul>
          </div>
        </div>
        <div className="site-footer-bottom">© 2026 Aircon Care. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default Home;