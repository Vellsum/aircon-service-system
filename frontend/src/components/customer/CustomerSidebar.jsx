import React, { useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import CoolFixLogo from "../common/CoolFixLogo";
import { Icon } from "./CustomerIcons";

// Highlighting is handled by NavLink from the current URL, the same way the
// admin sidebar does it.
const navGroups = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", path: "/customer/dashboard", icon: "grid" }],
  },
  {
    label: "Services",
    items: [
      { label: "Book a Service", path: "/customer/book-service", icon: "calendarPlus" },
      { label: "Purchase Subscription", path: "/customer/service-catalog", icon: "wrench" },
    ],
  },
  {
    label: "My Account",
    items: [
      { label: "My Bookings", path: "/customer/bookings", icon: "calendar" },
      { label: "My Subscriptions", path: "/customer/subscriptions", icon: "calendar" },
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
  const sidebarRef = useRef(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      sidebarRef.current?.querySelector(".cust-nav-item")?.focus();
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      document.querySelector(".cust-burger")?.focus();
    }
  }, [isOpen]);

  const displayName = user?.customer_name || user?.username || "Customer";
  const displayEmail = user?.email || "—";

  const handleLogout = () => {
    if (logout) logout();
    localStorage.removeItem("aircon_role");
    localStorage.removeItem("aircon_email");
    navigate("/login");
  };

  return (
    <aside ref={sidebarRef} className={`cust-sidebar${isOpen ? " is-open" : ""}`}>
      <div className="cust-brand">
        <div className="cust-brand-lockup">
          <CoolFixLogo />
          <span className="cust-brand-sub">Customer Portal</span>
        </div>
      </div>

      <nav className="cust-nav">
        {navGroups.map((group) => (
          <React.Fragment key={group.label}>
            <p className="cust-nav-label">{group.label}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => `cust-nav-item${isActive ? " is-active" : ""}`}
              >
                <span className="cust-nav-icon" aria-hidden="true">
                  <Icon name={item.icon} size={18} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
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