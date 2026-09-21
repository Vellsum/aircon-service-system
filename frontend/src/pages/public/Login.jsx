import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/shared.css";
import "../../styles/Login.css";

const roles = [
  { key: "customer", label: "Customer", icon: "👤" },
  { key: "technician", label: "Technician", icon: "🛠" },
  { key: "admin", label: "Admin", icon: "🛡" },
];

const roleDestinations = {
  customer: "/customer/portal",
  technician: "/technician/dashboard",
  admin: "/admin/dashboard",
};

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  if (!email || !password) {
    setError("Please enter both username/email and password.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: email,
        password: password,
        role: selectedRole,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed.");
    }

    // 1. Force normalized lowercase role ('Technician' -> 'technician')
    const userRole = (data.user.role || data.user.accountType || selectedRole).toLowerCase();

    const authenticatedUser = {
      ...data.user,
      role: userRole,
    };

    // 2. Persist to AuthContext
    login(authenticatedUser, data.token);

    // 3. Navigate explicitly to the technician portal
    const targetDestination = roleDestinations[userRole] || "/technician/dashboard";
    navigate(targetDestination, { replace: true });

  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
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
              <label className="dash-form-label">Username / Email</label>
              <input
                className="dash-form-input"
                type="text" //change from ëmail to text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your username"
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

            <button
              type="submit"
              className="dash-btn dash-btn-primary login-submit"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : `Log In as ${roles.find((r) => r.key === selectedRole).label}`}
            </button>
          </form>

          {/* Registration Prompt for Customers */}
          <p className="login-footer-note" style={{ marginTop: "1rem" }}>
            Don't have an account? <Link to="/register">Register here</Link>
          </p>

          <p className="login-footer-note">
            <Link to="/">← Back to homepage</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;