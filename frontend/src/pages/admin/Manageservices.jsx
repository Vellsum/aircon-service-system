import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import RecordModal from "../components/RecordModal";
import "../styles/shared.css";

const statusTone = {
  Active: "success",
  Inactive: "warning",
};

const initialServices = [
  { id: "#SV001", name: "Aircon Servicing", category: "Servicing", price: "$60", duration: "45 mins", status: "Active" },
  { id: "#SV002", name: "Chemical Cleaning", category: "Cleaning", price: "$120", duration: "90 mins", status: "Active" },
  { id: "#SV003", name: "Chemical Overhaul", category: "Cleaning", price: "$180", duration: "120 mins", status: "Active" },
  { id: "#SV004", name: "Aircon Repair", category: "Repair", price: "$80", duration: "60 mins", status: "Active" },
  { id: "#SV005", name: "Gas Top-up", category: "Repair", price: "$100", duration: "45 mins", status: "Active" },
  { id: "#SV006", name: "New Unit Installation", category: "Installation", price: "$350", duration: "180 mins", status: "Inactive" },
  { id: "#SV007", name: "Duct Cleaning", category: "Cleaning", price: "$150", duration: "90 mins", status: "Inactive" },
];

const categoryFilters = ["All", "Servicing", "Cleaning", "Repair", "Installation"];

const serviceFields = [
  { key: "name", label: "Service Name", type: "text" },
  { key: "category", label: "Category", type: "select", options: ["Servicing", "Cleaning", "Repair", "Installation"] },
  { key: "price", label: "Price", type: "text" },
  { key: "duration", label: "Duration", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
];

const serviceViewFields = [{ key: "id", label: "Service ID" }, ...serviceFields];

const ManageServices = () => {
  const [services, setServices] = useState(initialServices);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [modal, setModal] = useState(null);

  const filtered = services.filter((service) => {
    const matchesCategory = activeCategory === "All" || service.category === activeCategory;
    const matchesSearch =
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.id.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSave = (formData) => {
    if (modal.mode === "create") {
      const newId = `#SV${String(services.length + 1).padStart(3, "0")}`;
      setServices([{ ...formData, id: newId }, ...services]);
    } else {
      setServices(services.map((s) => (s.id === modal.record.id ? { ...s, ...formData } : s)));
    }
    setModal(null);
  };

  const handleDeactivate = (service) => {
    setServices(services.map((s) => (s.id === service.id ? { ...s, status: "Inactive" } : s)));
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Services" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Services</h1>
            <p>View and manage the services you offer</p>
          </div>
          <button className="dash-btn dash-btn-primary" onClick={() => setModal({ mode: "create", record: {} })}>
            + Add Service
          </button>
        </header>

        <section className="dash-stats">
          <div className="dash-stat dash-stat-accent">
            <p className="dash-stat-label">Total Services</p>
            <p className="dash-stat-value">{services.length}</p>
            <p className="dash-stat-delta">Across all categories</p>
          </div>
          <div className="dash-stat dash-stat-success">
            <p className="dash-stat-label">Active Services</p>
            <p className="dash-stat-value">{services.filter((s) => s.status === "Active").length}</p>
            <p className="dash-stat-delta">Currently bookable</p>
          </div>
          <div className="dash-stat dash-stat-cyan">
            <p className="dash-stat-label">Categories</p>
            <p className="dash-stat-value">{categoryFilters.length - 1}</p>
            <p className="dash-stat-delta">Service types offered</p>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by service name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="dash-chips">
              {categoryFilters.map((category) => (
                <button
                  key={category}
                  className={`dash-chip${category === activeCategory ? " is-active" : ""}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Service ID</th>
                  <th>Service Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((service) => (
                  <tr key={service.id}>
                    <td className="dash-mono">{service.id}</td>
                    <td>{service.name}</td>
                    <td>{service.category}</td>
                    <td className="dash-mono">{service.price}</td>
                    <td className="dash-mono">{service.duration}</td>
                    <td>
                      <span className={`dash-status dash-status-${statusTone[service.status]}`}>
                        <i />
                        {service.status}
                      </span>
                    </td>
                    <td>
                      <div className="dash-row-actions">
                        <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: service })}>Edit</button>
                        <button className="dash-row-btn is-danger" onClick={() => handleDeactivate(service)}>Deactivate</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      No services match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dash-pagination">
            <span>Showing {filtered.length} of {services.length} services</span>
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
          title={modal.mode === "create" ? "Add Service" : "Edit Service"}
          fields={serviceFields}
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default ManageServices;
