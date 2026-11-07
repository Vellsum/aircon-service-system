import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "../../styles/Home.css"; // Local style import

//the dummy datas all here currently====================================================================

const services = [
  { icon: "🧊", name: "Aircon Servicing", desc: "Routine servicing to keep your unit running efficiently year-round." },
  { icon: "🧼", name: "Chemical Cleaning", desc: "Deep cleaning to remove mould, dust, and bacteria buildup." },
  { icon: "🔧", name: "Aircon Repair", desc: "Fast, reliable repairs for leaks, noise, and cooling issues." },
  { icon: "🏗", name: "Installation", desc: "Professional installation for new and replacement units." },
];

const steps = [
  { icon: "📋", name: "1. Book Online", desc: "Choose your service, date and time slot in under 2 minutes." },
  { icon: "👷", name: "2. Get Matched", desc: "A certified technician is assigned — track your job status in real time." },
  { icon: "🧰", name: "3. We Fix It", desc: "Your unit is serviced, cleaned or repaired right at your doorstep." },
  { icon: "❄", name: "4. Stay Cool", desc: "Pay securely and receive your service report. Comfort restored." },
];

const testimonials = [
  { name: "Sarah T.", role: "Homeowner, Tampines", quote: "Booked at night, technician arrived the next morning. My aircon is ice cold again — super smooth process." },
  { name: "Marcus L.", role: "Cafe Owner", quote: "They service all 6 units in my shop quarterly. Zero breakdowns since we switched to Cool Fix." },
  { name: "Priya K.", role: "Condo Resident", quote: "Transparent pricing, no upselling, and the chemical cleaning made a huge difference. Highly recommended." },
];

// Ready for later — uncomment the promotions section below when your promo data is final
const promotions = [
  { code: "COOL10", title: "10% Off Servicing", desc: "Get 10% off any standard aircon servicing booking.", validity: "Valid until 30 Sep 2026" },
  { code: "NEWCUST20", title: "$20 Off First Booking", desc: "New customers get $20 off their very first service.", validity: "Valid until 31 Dec 2026" },
  { code: "DEEPCLEAN15", title: "15% Off Deep Cleaning", desc: "Save on our thorough chemical cleaning package.", validity: "Starts 10 Sep 2026" },
];

const Home = () => {
  const navigate = useNavigate();

  // Browser tab title — a homepage must-have
  useEffect(() => {
    document.title = "Cool Fix | Aircon Servicing & Repair Singapore";
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div>
      <nav className="site-nav">
        <div className="site-nav-brand">
          <span>❄</span>
          <span>Cool Fix</span>
        </div>
        <div className="site-nav-links">
          <a href="#services">Services</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
        <div className="site-nav-actions">
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
        <p className="site-hero-eyebrow">TRUSTED AIRCON SPECIALISTS IN SINGAPORE</p>
        <h1>Cool Comfort, Fixed Right.</h1>
        <p>
          From routine servicing to emergency repairs, Cool Fix's certified
          technicians keep your home and business running cool, clean, and efficient.
        </p>
        <div className="site-hero-actions">
          <button
            className="dash-btn dash-btn-primary"
            onClick={() => navigate("/login")}
          >
            Book a Service
          </button>
          <button
            className="dash-btn dash-btn-outline"
            onClick={() => scrollTo("services")}
          >
            View Services
          </button>
        </div>
      </section>
    
      <section className="site-section" id="about">
        <div className="site-about">
          <div>
            <h2>Keeping Your Space Cool for Over 10 Years</h2>
            <p>
              Cool Fix started with a simple goal: make quality aircon service
              accessible and hassle-free. Today, our team of certified technicians
              serves hundreds of homes and businesses with servicing, repairs,
              cleaning, and installations.
            </p>
            <p>
              Every job is backed by transparent pricing, real-time booking
              tracking, and a satisfaction guarantee — no surprises, just cool air.
            </p>
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
            </div>
          ))}
        </div>
      </section>

      {/* How It Works — tells first-time visitors exactly what to expect */}
      <section className="site-section" id="how-it-works">
        <div className="site-section-head">
          <p className="site-eyebrow">Simple & Fast</p>
          <h2>How It Works</h2>
          <p>From booking to cool air in four easy steps.</p>
        </div>
        <div className="site-services">
          {steps.map((step) => (
            <div className="site-service-card" key={step.name}>
              <div className="site-service-icon">{step.icon}</div>
              <h3>{step.name}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials — social proof builds trust before users sign up */}
      <section className="site-section" id="testimonials">
        <div className="site-section-head">
          <p className="site-eyebrow">Why Customers Choose Us</p>
          <h2>What Our Customers Say</h2>
          <p>Real feedback from homes and businesses we keep cool.</p>
        </div>
        <div className="site-services">
          {testimonials.map((t) => (
            <div className="site-service-card" key={t.name}>
              <div className="site-service-icon">⭐⭐⭐⭐⭐</div>
              <p style={{ fontStyle: "italic" }}>"{t.quote}"</p>
              <h3 style={{ fontSize: "1rem" }}>
                {t.name} <span style={{ fontWeight: 400, opacity: 0.7 }}>— {t.role}</span>
              </h3>
            </div>
          ))}
        </div>
      </section>

      {/*** Promotions — uncomment when your promo data is final
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
      </section> */}

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
              <span>Cool Fix</span>
            </div>
            <p>Reliable aircon servicing, repairs, and installation you can trust.</p>
          </div>

          <div>
            <h4>Contact</h4>
            <ul>
              <li>hello@coolfix.com.sg</li>
              <li>+65 8686 2311</li>
              <li>Mon–Sat, 9am–6pm</li>
            </ul>
          </div>
        </div>
        <div className="site-footer-bottom">© 2026 Cool Fix. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default Home;