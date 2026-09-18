import React from "react";
import Sidebar from "../components/Sidebar";
import "../styles/shared.css";

// Temporary page for any sidebar link that doesn't have a real page built yet.
// Once you build the real page (e.g. ManageTechnicians.jsx), swap it in for
// this in App.jsx and delete the route pointing here for that page.
const Placeholder = ({ title, active }) => {
  return (
    <div className="dash">
      <Sidebar active={active || title} />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>{title}</h1>
            <p>This page hasn't been built yet</p>
          </div>
        </header>

        <section className="dash-panel">
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            {title} is coming soon.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Placeholder;
