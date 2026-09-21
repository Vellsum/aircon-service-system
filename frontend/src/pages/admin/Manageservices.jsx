import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const serviceFields = [
  { key: "service_name", label: "Service Name", type: "text", required: true },
  { key: "category", label: "Category", type: "select", options: ["General", "Cleaning", "Repair", "Installation"] },
  { key: "price", label: "Price ($)", type: "number", required: true },
  { key: "duration_minutes", label: "Duration (Mins)", type: "number" },
  { key: "description", label: "Description", type: "text" },
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

  // HTTP GET: Fetch services catalog from Azure SQL
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
      showToast("Failed to load services from database.");
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
      (s.category && s.category.toLowerCase().includes(search.toLowerCase()))
  );

  // HTTP POST: Create new service entry
  const handleSave = async (formData) => {
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch("http://localhost:5000/api/admin/payables/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create service");

      showToast("Aircon service added successfully!");
      setModal(null);
      fetchServices(); // Refresh table from DB
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
            <p>Configure aircon service catalog, pricing, and duration</p>
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
              placeholder="Search services by name or category..."
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
                  <th>Category</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
                      Loading services from database...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((s) => (
                    <tr key={s.service_ID}>
                      <td className="dash-mono">#{s.service_ID}</td>
                      <td><strong>{s.service_name}</strong></td>
                      <td>{s.category || "General"}</td>
                      <td className="dash-mono">{s.duration_minutes || 60} mins</td>
                      <td className="dash-mono">${parseFloat(s.price || 0).toFixed(2)}</td>
                      <td>{s.description || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>
                      No services found in database catalog.
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
          title="New Aircon Service"
          fields={serviceFields}
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