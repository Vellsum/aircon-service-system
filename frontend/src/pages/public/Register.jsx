
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
    block_number: "",
    street_name: "",
    building_name: "",
    unit_number: "",
    postal_code: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !formData.username ||
      !formData.password ||
      !formData.customer_name ||
      !formData.block_number ||
      !formData.street_name ||
      !formData.postal_code
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    // Combine address components into one string
    const customer_address = [
      formData.block_number,
      formData.street_name,
      formData.building_name,
      formData.unit_number,
      formData.postal_code,
    ]
      .filter((part) => part.trim() !== "")
      .join(", ");

    // Keep the original backend property
    const registrationData = {
      username: formData.username,
      password: formData.password,
      customer_name: formData.customer_name,
      customer_address,
    };

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
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
            <label className="dash-form-label">Block / House Number *</label>
            <input
              className="dash-form-input"
              type="text"
              name="block_number"
              value={formData.block_number}
              onChange={handleChange}
              placeholder="123"
            />
          </div>

          <div className="dash-form-row">
            <label className="dash-form-label">Street Name *</label>
            <input
              className="dash-form-input"
              type="text"
              name="street_name"
              value={formData.street_name}
              onChange={handleChange}
              placeholder="Orchard Road"
            />
          </div>

          <div className="dash-form-row">
            <label className="dash-form-label">Building Name</label>
            <input
              className="dash-form-input"
              type="text"
              name="building_name"
              value={formData.building_name}
              onChange={handleChange}
              placeholder="Example: Orchard Residences"
            />
          </div>

          <div className="dash-form-row">
            <label className="dash-form-label">Unit Number</label>
            <input
              className="dash-form-input"
              type="text"
              name="unit_number"
              value={formData.unit_number}
              onChange={handleChange}
              placeholder="#12-34"
            />
          </div>

          <div className="dash-form-row">
            <label className="dash-form-label">Postal Code *</label>
            <input
              className="dash-form-input"
              type="text"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              placeholder="238858"
              maxLength={6}
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

          <button
            type="submit"
            className="dash-btn dash-btn-primary login-submit"
            disabled={loading}
          >
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
