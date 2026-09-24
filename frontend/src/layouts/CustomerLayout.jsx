import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import CustomerSidebar from "../components/customer/CustomerSidebar";
import { Icon } from "../components/customer/CustomerIcons";
import "../styles/shared.css";
import "../styles/customer.css";

/**
 * CustomerLayout
 * Sidebar + topbar shell that hosts every customer page through <Outlet />.
 * Mirrors TechnicianLayout so the two portals feel like one product.
 */
const CustomerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="cust-shell">
      <CustomerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Click-away layer for the mobile drawer */}
      <div
        className={`cust-drawer-backdrop${sidebarOpen ? " is-open" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="cust-main">
        <header className="cust-topbar">
          <div className="cust-topbar-left">
            <button
              type="button"
              className="cust-burger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Icon name="menu" size={20} />
            </button>
            <span className="cust-topbar-tag">
              <span className="cust-live-dot" />
              Customer Portal
            </span>
          </div>

          <div className="cust-topbar-right">
            <span className="cust-topbar-tag d-none d-md-inline-flex">
              <Icon name="calendar" size={14} />
              {today}
            </span>
            <button type="button" className="cust-icon-btn" title="Notifications">
              <Icon name="bell" size={15} />
              <span className="d-none d-sm-inline">Alerts</span>
              <span className="cust-icon-btn-dot" />
            </button>
          </div>
        </header>

        <main className="cust-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;
