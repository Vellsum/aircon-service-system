import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../styles/shared.css";
import "../../styles/Login.css";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    customer_name: "",
    customer_address: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.username || !formData.password || !formData.customer_name) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      navigate("/login");
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
            <span>Cool Fix</span>
          </div>
          <p>Create a Customer Account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-body">
          {error && <div className="login-error">{error}</div>}

          <div className="dash-form-row">
            <label className="dash-form-label">Full Name *</label>
            <input
              className="dash-form-input"
              type="text"
              name="customer_name"
              value={formData.customer_name}
              onChange={handleChange}
              placeholder="John Doe"
            />
          </div>

          <div className="dash-form-row">
            <label className="dash-form-label">Username *</label>
            <input
              className="dash-form-input"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
            />
          </div>

          <div className="dash-form-row">
            <label className="dash-form-label">Address</label>
            <input
              className="dash-form-input"
              type="text"
              name="customer_address"
              value={formData.customer_address}
              onChange={handleChange}
              placeholder="123 Main Street"
            />
          </div>

          <div className="dash-form-row">
            <label className="dash-form-label">Password *</label>
            <input
              className="dash-form-input"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="dash-btn dash-btn-primary login-submit" disabled={loading}>
            {loading ? "Creating Account..." : "Register as Customer"}
          </button>

          <p className="login-footer-note" style={{ marginTop: "1rem" }}>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;