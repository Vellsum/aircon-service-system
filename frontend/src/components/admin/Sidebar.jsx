import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import CoolFixLogo from "../common/CoolFixLogo";
import "../../styles/Sidebar.css";

const navItems = [
  {
    label: "Dashboard", path: "/admin/dashboard",
    section: "Overview",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  },
  {
    label: "Manage Bookings", path: "/admin/bookings",
    section: "Management",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18" />
      </>
    ),
  },
  {
    label: "Manage Technicians", path: "/admin/technicians",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M18 8v6m-3-3h6" />
      </>
    ),
  },
  {
    label: "Manage Customers", path: "/admin/customers",
    icon: (
      <>
        <circle cx="8" cy="8" r="3" />
        <path d="M2 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 4 5" />
      </>
    ),
  },
  {
   
    section: "Service Setup",
    icon: (
      <>
        <rect x="2" y="5" width="20" height="13" rx="2" />
        <path d="M7 10h10M7 14h10M8 21v-1m8 1v-1" />
      </>
    ),
  },
  {
    label: "Manage Services", path: "/admin/services",
    icon: (
      <path d="M21 3a6 6 0 0 1-7.9 7.9l-6.9 6.9a2 2 0 1 1-2.8-2.8l6.9-6.9A6 6 0 0 1 18.2 2L15 5l4 4 2-6Z" />
    ),
  },
  {
    label: "Manage Packages", path: "/admin/packages",
    icon: (
      <path d="m3 7 9-4 9 4-9 4-9-4ZM3 7v10l9 4 9-4V7M12 11v10" />
    ),
  },
  {
    label: "Manage Promotions", path: "/admin/promotions",
    icon: (
      <>
        <path d="M3 12V4h8l10 10-7 7L3 12Z" />
        <circle cx="8" cy="8" r="1" />
      </>
    ),
  },
  {
    label: "Manage Inventory", path: "/admin/inventory",
    section: "Operations",
    icon: (
      <>
        <rect x="3" y="4" width="8" height="8" rx="1" />
        <rect x="13" y="4" width="8" height="8" rx="1" />
        <rect x="8" y="14" width="8" height="8" rx="1" />
      </>
    ),
  },
  {
    label: "View Reports", path: "/admin/reports",
    icon: (
      <path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM14 2v5h4M8 12h8M8 16h8" />
    ),
  },
];

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("aircon_role");
    localStorage.removeItem("aircon_email");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <aside className="dash-sidebar">
      <div className="dash-brand">
        <div className="dash-brand-lockup">
          <CoolFixLogo />
          <span className="dash-brand-sub">Admin Portal</span>
        </div>
      </div>

      <nav className="dash-nav">
        {navItems.map((item) => (
          <React.Fragment key={item.path}>
            {item.section && <span className="dash-nav-section">{item.section}</span>}
            <NavLink
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `dash-nav-item${isActive ? " is-active" : ""}`
              }
            >
              <span className="dash-nav-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  focusable="false"
                >
                  {item.icon}
                </svg>
              </span>
              <span className="dash-nav-label">{item.label}</span>
            </NavLink>
          </React.Fragment>
        ))}
      </nav>

      <button className="dash-logout" onClick={handleLogout}>
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
