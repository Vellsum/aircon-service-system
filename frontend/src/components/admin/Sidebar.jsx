import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../../styles/Sidebar.css";

const navItems = [
  { label: "Dashboard", path: "/admin/dashboard" },
  { label: "Manage Bookings", path: "/admin/bookings" },
  { label: "Manage Technicians", path: "/admin/technicians" },
  { label: "Manage Customers", path: "/admin/customers" },
  { label: "Manage Aircon", path: "/admin/aircon" },
  { label: "Manage Services", path: "/admin/services" },
  { label: "Manage Packages", path: "/admin/packages" },
  { label: "Manage Promotions", path: "/admin/promotions" },
  { label: "Manage Inventory", path: "/admin/inventory" },
  { label: "View Reports", path: "/admin/reports" },
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
