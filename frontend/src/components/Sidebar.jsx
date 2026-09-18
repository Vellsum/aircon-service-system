import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Manage Bookings", path: "/bookings" },
  { label: "Manage Technicians", path: "/technicians" },
  { label: "Manage Customers", path: "/customers" },
  { label: "Manage Aircon", path: "/aircons" },
  { label: "Manage Services", path: "/services" },
  { label: "Manage Packages", path: "/packages" },
  { label: "Manage Promotions", path: "/promotions" },
  { label: "Manage Inventory", path: "/inventory" },
  { label: "View Reports", path: "/reports" },
  { label: "Analytics", path: "/analytics" },
];

// Highlighting is handled by NavLink itself based on the current URL.
const Sidebar = () => {
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
        <span className="dash-brand-name">Aircon Admin</span>
      </div>

      <nav className="dash-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
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

export default Sidebar;
