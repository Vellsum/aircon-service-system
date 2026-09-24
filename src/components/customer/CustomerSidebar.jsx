import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { CoolAirLogo, Icon } from "./CustomerIcons";
import { CURRENT_CUSTOMER } from "../../data/customer/customerMockData";
import { getUpcomingBookings } from "../../data/customer/customerSelectors";

// Highlighting is handled by NavLink from the current URL, the same way the
// admin sidebar does it.
const navGroups = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", path: "/customer/dashboard", icon: "home" }],
  },
  {
    label: "Services",
    items: [
      { label: "Book a Service", path: "/customer/book", icon: "plus" },
      { label: "Service Catalogue", path: "/customer/services", icon: "grid" },
    ],
  },
  {
    label: "My Account",
    items: [
      { label: "My Bookings", path: "/customer/bookings", icon: "calendar", badgeKey: "upcoming" },
      { label: "My Aircon Units", path: "/customer/units", icon: "snowflake" },
      { label: "Profile & Settings", path: "/customer/profile", icon: "user" },
    ],
  },
];

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const CustomerSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user?.customer_name || user?.username || CURRENT_CUSTOMER.customer_name;
  const displayEmail = user?.email || CURRENT_CUSTOMER.email;
  const badges = { upcoming: getUpcomingBookings().length };

  const handleLogout = () => {
    // AuthContext owns aircon_user / aircon_token; the two older keys are
    // cleared as well so a session started before AuthContext existed
    // does not survive a logout.
    if (logout) logout();
    localStorage.removeItem("aircon_role");
    localStorage.removeItem("aircon_email");
    navigate("/login");
  };

  return (
    <aside className={`cust-sidebar${isOpen ? " is-open" : ""}`}>
      <div className="cust-brand">
        <CoolAirLogo />
        <span className="cust-brand-name">
          Aircon Care
          <span className="cust-brand-sub">Customer Portal</span>
        </span>
      </div>

      <nav className="cust-nav">
        {navGroups.map((group) => (
          <React.Fragment key={group.label}>
            <p className="cust-nav-label">{group.label}</p>
            {group.items.map((item) => {
              const badge = item.badgeKey ? badges[item.badgeKey] : 0;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `cust-nav-item${isActive ? " is-active" : ""}`
                  }
                >
                  <Icon name={item.icon} size={17} />
                  <span>{item.label}</span>
                  {badge > 0 && <span className="cust-nav-badge">{badge}</span>}
                </NavLink>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      <div className="cust-sidebar-foot">
        <div className="cust-sidebar-user">
          <span className="cust-avatar cust-avatar-sm cust-avatar-cyan">
            {getInitials(displayName)}
          </span>
          <div style={{ minWidth: 0 }}>
            <p className="cust-sidebar-user-name">{displayName}</p>
            <p className="cust-sidebar-user-meta">{displayEmail}</p>
          </div>
        </div>
        <button className="cust-logout" onClick={handleLogout}>
          <Icon name="logout" size={15} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default CustomerSidebar;
