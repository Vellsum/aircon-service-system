import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";

// Placeholder until your friend's real Customer page is merged in.
// Swap the contents of this file for their component, keep the route
// in App.jsx pointing at /customer.
const CustomerPortal = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("aircon_role");
    localStorage.removeItem("aircon_email");
    navigate("/login");
  };

  return (
    <div className="dash-main" style={{ maxWidth: 700, margin: "60px auto" }}>
      <div className="dash-panel">
        <h2>Customer Portal</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          You're logged in as a customer ({localStorage.getItem("aircon_email")}).
          Your friend's real Customer page will replace this once it's merged in.
        </p>
        <button className="dash-btn dash-btn-outline" onClick={handleLogout} style={{ marginTop: 16 }}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default CustomerPortal;
