import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/shared.css";
import "./Login.css";

const roles = [
  { key: "customer", label: "Customer", icon: "👤" },
  { key: "technician", label: "Technician", icon: "🛠" },
  { key: "admin", label: "Admin", icon: "🛡" },
];

// Where each role lands after logging in.
const roleDestinations = {
  customer: "/customer",
  technician: "/technician-portal",
  admin: "/",
};

const Login = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    // No real backend yet — this just simulates a login by storing
    // the chosen role locally. Swap this block out once your friend's
    // backend auth endpoint is ready.
    localStorage.setItem("aircon_role", selectedRole);
    localStorage.setItem("aircon_email", email);
    navigate(roleDestinations[selectedRole]);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-brand">
            <span>❄</span>
            <span>Aircon Care</span>
          </div>
          <p>Log in to continue</p>
        </div>

        <div className="login-body">
          <form onSubmit={handleSubmit}>
            <p className="login-role-label">I am logging in as:</p>
            <div className="login-roles">
              {roles.map((role) => (
                <div
                  key={role.key}
                  className={`login-role-card${selectedRole === role.key ? " is-selected" : ""}`}
                  onClick={() => setSelectedRole(role.key)}
                >
                  <div className="login-role-icon">{role.icon}</div>
                  <div className="login-role-name">{role.label}</div>
                </div>
              ))}
            </div>

            {error && <div className="login-error">{error}</div>}

            <div className="dash-form-row">
              <label className="dash-form-label">Email</label>
              <input
                className="dash-form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="dash-form-row">
              <label className="dash-form-label">Password</label>
              <input
                className="dash-form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="dash-btn dash-btn-primary login-submit">
              Log In as {roles.find((r) => r.key === selectedRole).label}
            </button>
          </form>

          <p className="login-footer-note">
            <a href="/home">← Back to homepage</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
