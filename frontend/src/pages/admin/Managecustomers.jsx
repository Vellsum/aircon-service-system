import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import RecordModal from "../components/RecordModal";
import "../styles/shared.css";

const statusTone = {
  Active: "success",
  Inactive: "warning",
};

const initialCustomers = [
  { id: "#CU001", name: "John Tan", phone: "+65 8123 4567", email: "john.tan@email.com", bookings: 6, spent: "$780", status: "Active", joined: "12 Jan 2025" },
  { id: "#CU002", name: "Sarah Lim", phone: "+65 8234 5678", email: "sarah.lim@email.com", bookings: 3, spent: "$420", status: "Active", joined: "03 Mar 2025" },
  { id: "#CU003", name: "James Lee", phone: "+65 8345 6789", email: "james.lee@email.com", bookings: 1, spent: "$150", status: "Active", joined: "22 Jun 2025" },
  { id: "#CU004", name: "Priya Nair", phone: "+65 8456 7890", email: "priya.nair@email.com", bookings: 9, spent: "$1,240", status: "Active", joined: "08 Aug 2025" },
  { id: "#CU005", name: "Wei Ling Chan", phone: "+65 8567 8901", email: "weiling.chan@email.com", bookings: 2, spent: "$260", status: "Inactive", joined: "17 Sep 2025" },
  { id: "#CU006", name: "Ahmad Faiz", phone: "+65 8678 9012", email: "ahmad.faiz@email.com", bookings: 4, spent: "$540", status: "Inactive", joined: "30 Nov 2025" },
  { id: "#CU007", name: "Rachel Ong", phone: "+65 8789 0123", email: "rachel.ong@email.com", bookings: 7, spent: "$910", status: "Active", joined: "14 Feb 2026" },
];

const statusFilters = ["All", "Active", "Inactive"];

const customerFields = [
  { key: "name", label: "Name", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
];

const customerViewFields = [
  { key: "id", label: "Customer ID" },
  ...customerFields,
  { key: "bookings", label: "Bookings" },
  { key: "spent", label: "Total Spent" },
  { key: "joined", label: "Joined" },
];

const ManageCustomers = () => {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null);

  const filtered = customers.filter((customer) => {
    const matchesStatus = activeStatus === "All" || customer.status === activeStatus;
    const matchesSearch =
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.id.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSave = (formData) => {
    if (modal.mode === "create") {
      const newId = `#CU${String(customers.length + 1).padStart(3, "0")}`;
      setCustomers([{ ...formData, id: newId, bookings: 0, spent: "$0", joined: "Today" }, ...customers]);
    } else {
      setCustomers(customers.map((c) => (c.id === modal.record.id ? { ...c, ...formData } : c)));
    }
    setModal(null);
  };

  const handleDeactivate = (customer) => {
    setCustomers(customers.map((c) => (c.id === customer.id ? { ...c, status: "Inactive" } : c)));
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Customers" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Customers</h1>
            <p>View and manage registered customers</p>
          </div>
          <button className="dash-btn dash-btn-primary" onClick={() => setModal({ mode: "create", record: {} })}>
            + Add Customer
          </button>
        </header>

        <section className="dash-stats">
          <div className="dash-stat dash-stat-accent">
            <p className="dash-stat-label">Total Customers</p>
            <p className="dash-stat-value">{customers.length}</p>
            <p className="dash-stat-delta">Registered total</p>
          </div>
          <div className="dash-stat dash-stat-success">
            <p className="dash-stat-label">Active Customers</p>
            <p className="dash-stat-value">{customers.filter((c) => c.status === "Active").length}</p>
            <p className="dash-stat-delta">Booked in the last 90 days</p>
          </div>
          <div className="dash-stat dash-stat-cyan">
            <p className="dash-stat-label">Avg. Bookings</p>
            <p className="dash-stat-value">
              {(customers.reduce((sum, c) => sum + c.bookings, 0) / customers.length).toFixed(1)}
            </p>
            <p className="dash-stat-delta">Per customer</p>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by name, ID, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="dash-chips">
              {statusFilters.map((status) => (
                <button
                  key={status}
                  className={`dash-chip${status === activeStatus ? " is-active" : ""}`}
                  onClick={() => setActiveStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Bookings</th>
                  <th>Total Spent</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id}>
                    <td className="dash-mono">{customer.id}</td>
                    <td>{customer.name}</td>
                    <td className="dash-mono">{customer.phone}</td>
                    <td>{customer.email}</td>
                    <td className="dash-mono">{customer.bookings}</td>
                    <td className="dash-mono">{customer.spent}</td>
                    <td className="dash-mono">{customer.joined}</td>
                    <td>
                      <span className={`dash-status dash-status-${statusTone[customer.status]}`}>
                        <i />
                        {customer.status}
                      </span>
                    </td>
                    <td>
                      <div className="dash-row-actions">
                        <button className="dash-row-btn" onClick={() => setModal({ mode: "view", record: customer })}>View</button>
                        <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: customer })}>Edit</button>
                        <button className="dash-row-btn is-danger" onClick={() => handleDeactivate(customer)}>Deactivate</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      No customers match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dash-pagination">
            <span>Showing {filtered.length} of {customers.length} customers</span>
            <div className="dash-pagination-controls">
              <button className="dash-row-btn">Prev</button>
              <button className="dash-row-btn">Next</button>
            </div>
          </div>
        </section>
      </main>

      {modal && (
        <RecordModal
          mode={modal.mode}
          title={modal.mode === "create" ? "Add Customer" : modal.mode === "edit" ? "Edit Customer" : "Customer Details"}
          fields={modal.mode === "view" ? customerViewFields : customerFields}
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default ManageCustomers;
