import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../Sidebar.css";

const navItems = [
  { label: "Dashboard", path: "/customer/dashboard" },
  { label: "My Bookings", path: "/customer/bookings" },
  { label: "Book a Service", path: "/customer/book" },
  { label: "My Packages", path: "/customer/packages" },
  { label: "Promotions", path: "/customer/promotions" },
  { label: "Profile", path: "/customer/profile" },
];

const CustomerSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("aircon_role");
    localStorage.removeItem("aircon_email");
    navigate("/login");
  };

  return (
    <aside className="dash-sidebar">
      <div className="dash-brand">
        <span className="dash-brand-mark">❄</span>
        <span className="dash-brand-name">Aircon Care</span>
      </div>

      <nav className="dash-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `dash-nav-item${isActive ? " is-active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button className="dash-logout" onClick={handleLogout}>
        Logout
      </button>
    </aside>
  );
};

export default CustomerSidebar;
