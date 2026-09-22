import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const addServiceFields = [
  { key: "service_name", label: "Service Name", type: "text", required: true },
  { key: "price", label: "Price ($)", type: "number", required: true },
  { key: "description", label: "Description", type: "text" },
];

const editServiceFields = [
  { key: "service_name", label: "Service Name", type: "text", required: true },
  { key: "price", label: "Price ($)", type: "number", required: true },
  { key: "description", label: "Description", type: "text" },
];

const viewServiceFields = [
  { key: "service_ID", label: "Service ID" },
  { key: "service_name", label: "Service Name" },
  { key: "price", label: "Price" },
  { key: "description", label: "Description" },
];

const Manageservices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("http://localhost:5000/api/admin/payables/services", { headers });
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.services)) {
        setServices(data.services);
      }
    } catch (err) {
      console.error("Error fetching services:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filtered = services.filter(
    (s) =>
      (s.service_name && s.service_name.toLowerCase().includes(search.toLowerCase())) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = async (formData) => {
    const token = localStorage.getItem("token") || "";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    if (modal.mode === "create") {
      try {
        const res = await fetch("http://localhost:5000/api/admin/payables/services", {
          method: "POST",
          headers,
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create service");

        showToast("Service added successfully!");
        setModal(null);
        fetchServices();
      } catch (err) {
        showToast(`Error: ${err.message}`);
      }
    } else if (modal.mode === "edit") {
      try {
        const targetId = modal.record.service_ID;
        const res = await fetch(`http://localhost:5000/api/admin/payables/services/${targetId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update service");

        showToast("Service updated successfully!");
        setModal(null);
        fetchServices();
      } catch (err) {
        showToast(`Error: ${err.message}`);
      }
    }
  };

  const handleRemove = async (service) => {
    if (!window.confirm(`Are you sure you want to remove "${service.service_name}"?`)) return;

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`http://localhost:5000/api/admin/payables/services/${service.service_ID}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove service");

      showToast(`Removed ${service.service_name}`);
      fetchServices();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Services" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Services</h1>
            <p>Configure aircon service catalog and pricing</p>
          </div>
          <button className="dash-btn dash-btn-primary" onClick={() => setModal({ mode: "create", record: {} })}>
            + Add Service
          </button>
        </header>

        <section className="dash-panel">
          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Service Name</th>
                  <th>Price</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                      Loading services from database...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((s) => (
                    <tr key={s.service_ID}>
                      <td className="dash-mono">#{s.service_ID}</td>
                      <td><strong>{s.service_name}</strong></td>
                      <td className="dash-mono">${parseFloat(s.price || 0).toFixed(2)}</td>
                      <td>{s.description || "—"}</td>
                      <td>
                        <div className="dash-row-actions">
                          <button className="dash-row-btn" onClick={() => setModal({ mode: "view", record: s })}>View</button>
                          <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: s })}>Edit</button>
                          <button className="dash-row-btn is-danger" onClick={() => handleRemove(s)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>
                      No services found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {modal && (
        <RecordModal
          mode={modal.mode}
          title={modal.mode === "create" ? "New Service" : modal.mode === "edit" ? "Edit Service" : "Service Details"}
          fields={modal.mode === "create" ? addServiceFields : modal.mode === "view" ? viewServiceFields : editServiceFields}
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  );
};

export default Manageservices;