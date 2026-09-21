import React, { useState } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const statusTone = {
  Active: "success",
  Inactive: "warning",
};

const initialPackages = [
  { id: "#PK001", name: "Basic Care", services: "Aircon Servicing x1", price: "$55", validity: "1 month", status: "Active" },
  { id: "#PK002", name: "Seasonal Saver", services: "Aircon Servicing x3", price: "$150", validity: "6 months", status: "Active" },
  { id: "#PK003", name: "Deep Clean Bundle", services: "Chemical Cleaning + Servicing", price: "$165", validity: "3 months", status: "Active" },
  { id: "#PK004", name: "Annual Plan", services: "Aircon Servicing x4 + Gas Top-up", price: "$420", validity: "12 months", status: "Active" },
  { id: "#PK005", name: "Repair & Maintain", services: "Aircon Repair + Servicing x2", price: "$230", validity: "6 months", status: "Inactive" },
  { id: "#PK006", name: "New Home Starter", services: "Installation + Servicing x1", price: "$380", validity: "3 months", status: "Inactive" },
];

const statusFilters = ["All", "Active", "Inactive"];

const packageFields = [
  { key: "name", label: "Package Name", type: "text" },
  { key: "services", label: "Included Services", type: "text" },
  { key: "price", label: "Price", type: "text" },
  { key: "validity", label: "Validity", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
];

const packageViewFields = [{ key: "id", label: "Package ID" }, ...packageFields];

const ManagePackages = () => {
  const [packages, setPackages] = useState(initialPackages);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null);

  const filtered = packages.filter((pkg) => {
    const matchesStatus = activeStatus === "All" || pkg.status === activeStatus;
    const matchesSearch =
      pkg.name.toLowerCase().includes(search.toLowerCase()) ||
      pkg.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSave = (formData) => {
    if (modal.mode === "create") {
      const newId = `#PK${String(packages.length + 1).padStart(3, "0")}`;
      setPackages([{ ...formData, id: newId }, ...packages]);
    } else {
      setPackages(packages.map((p) => (p.id === modal.record.id ? { ...p, ...formData } : p)));
    }
    setModal(null);
  };

  const handleDeactivate = (pkg) => {
    setPackages(packages.map((p) => (p.id === pkg.id ? { ...p, status: "Inactive" } : p)));
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Packages" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Packages</h1>
            <p>View and manage bundled service packages</p>
          </div>
          <button className="dash-btn dash-btn-primary" onClick={() => setModal({ mode: "create", record: {} })}>
            + Add Package
          </button>
        </header>

        <section className="dash-stats">
          <div className="dash-stat dash-stat-accent">
            <p className="dash-stat-label">Total Packages</p>
            <p className="dash-stat-value">{packages.length}</p>
            <p className="dash-stat-delta">Available bundles</p>
          </div>
          <div className="dash-stat dash-stat-success">
            <p className="dash-stat-label">Active Packages</p>
            <p className="dash-stat-value">{packages.filter((p) => p.status === "Active").length}</p>
            <p className="dash-stat-delta">Currently purchasable</p>
          </div>
          <div className="dash-stat dash-stat-cyan">
            <p className="dash-stat-label">Top Seller</p>
            <p className="dash-stat-value" style={{ fontSize: "18px" }}>Seasonal Saver</p>
            <p className="dash-stat-delta">Most purchased this month</p>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by package name or ID..."
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
                  <th>Package ID</th>
                  <th>Package Name</th>
                  <th>Included Services</th>
                  <th>Price</th>
                  <th>Validity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pkg) => (
                  <tr key={pkg.id}>
                    <td className="dash-mono">{pkg.id}</td>
                    <td>{pkg.name}</td>
                    <td>{pkg.services}</td>
                    <td className="dash-mono">{pkg.price}</td>
                    <td className="dash-mono">{pkg.validity}</td>
                    <td>
                      <span className={`dash-status dash-status-${statusTone[pkg.status]}`}>
                        <i />
                        {pkg.status}
                      </span>
                    </td>
                    <td>
                      <div className="dash-row-actions">
                        <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: pkg })}>Edit</button>
                        <button className="dash-row-btn is-danger" onClick={() => handleDeactivate(pkg)}>Deactivate</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      No packages match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dash-pagination">
            <span>Showing {filtered.length} of {packages.length} packages</span>
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
          title={modal.mode === "create" ? "Add Package" : "Edit Package"}
          fields={packageFields}
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default ManagePackages;
