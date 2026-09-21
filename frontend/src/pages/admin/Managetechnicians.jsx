import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const statusTone = {
  Available: "success",
  "On Job": "accent",
  "Off Duty": "warning",
};

const statusFilters = ["All", "Available", "On Job", "Off Duty"];

// Modal Field Schemas
const addTechFields = [
  { key: "username", label: "Username / Name", type: "text" },
  { key: "password", label: "Default Password", type: "password" },
  { key: "phoneNumber", label: "Phone Number", type: "text" },
];

const techFields = [
  { key: "name", label: "Name", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
];

const techViewFields = [
  { key: "id", label: "Technician ID" },
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "jobsDone", label: "Jobs Assigned" },
];

export default function ManageTechnicians() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Fetch Technicians from API
  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("http://localhost:5000/api/admin/users/technicians", { headers });
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.technicians)) {
        const formatted = data.technicians.map((t) => {
          const rawId = t.user_ID || t.id || 0;
          return {
            user_ID: rawId,
            id: `#TC${String(rawId).padStart(3, "0")}`,
            name: t.username || t.name || "Technician",
            phone: t.phoneNumber || t.phone || "N/A",
            specialty: "Aircon Servicing",
            status: "Available",
            jobsDone: t.totalJobs ?? t.jobsDone ?? 0,
          };
        });
        setTechnicians(formatted);
      } else {
        setTechnicians([]);
      }
    } catch (err) {
      console.error("Error fetching technicians:", err);
      setTechnicians([]);
    } finally {
      // ALWAYS turns off the loading state
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  // 2. Filter Logic
  const filtered = technicians.filter((tech) => {
    const matchesStatus = activeStatus === "All" || tech.status === activeStatus;
    const matchesSearch =
      tech.name.toLowerCase().includes(search.toLowerCase()) ||
      tech.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // 3. Save / Update Handler
  const handleSave = async (formData) => {
    const token = localStorage.getItem("token") || "";
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    if (modal.mode === "create") {
      try {
        const res = await fetch("http://localhost:5000/api/admin/users/technicians", {
          method: "POST",
          headers,
          body: JSON.stringify({
            username: formData.username || formData.name,
            password: formData.password || "default123",
            phoneNumber: formData.phoneNumber || formData.phone || "",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create technician");

        showToast("Technician created successfully!");
        setModal(null);
        fetchTechnicians();
      } catch (err) {
        showToast(`Error: ${err.message}`);
      }
    } else if (modal.mode === "edit") {
      try {
        const targetId = modal.record.user_ID;
        const res = await fetch(`http://localhost:5000/api/admin/users/technicians/${targetId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            username: formData.name || formData.username,
            phoneNumber: formData.phone || formData.phoneNumber,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update technician");

        showToast("Technician updated successfully!");
        setModal(null);
        fetchTechnicians();
      } catch (err) {
        showToast(`Error: ${err.message}`);
      }
    } else {
      setModal(null);
    }
  };

  // 4. Soft Delete Handler
  const handleRemove = async (tech) => {
    const targetId = tech.user_ID || tech.id.replace("#TC", "").replace(/^0+/, "");
    if (!window.confirm(`Are you sure you want to deactivate ${tech.name}?`)) return;

    try {
      const token = localStorage.getItem("token") || "";
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:5000/api/admin/users/technicians/${targetId}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove technician");

      showToast(`Deactivated ${tech.name}`);
      fetchTechnicians();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Technicians" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Technicians 🛠</h1>
            <p>View and manage your service technicians</p>
          </div>
          <button className="dash-btn dash-btn-primary" onClick={() => setModal({ mode: "create", record: {} })}>
            + Add Technician
          </button>
        </header>

        <section className="dash-stats">
          <div className="dash-stat dash-stat-accent">
            <p className="dash-stat-label">Total Technicians</p>
            <p className="dash-stat-value">{technicians.length}</p>
            <p className="dash-stat-delta">Registered on the platform</p>
          </div>
          <div className="dash-stat dash-stat-cyan">
            <p className="dash-stat-label">Available Now</p>
            <p className="dash-stat-value">{technicians.filter((t) => t.status === "Available").length}</p>
            <p className="dash-stat-delta">Ready for new jobs</p>
          </div>
          <div className="dash-stat dash-stat-success">
            <p className="dash-stat-label">On Job</p>
            <p className="dash-stat-value">{technicians.filter((t) => t.status === "On Job").length}</p>
            <p className="dash-stat-delta">Currently servicing</p>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by name or ID..."
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
                  <th>Technician ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Specialty</th>
                  <th>Jobs Assigned</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "24px" }}>
                      Loading technicians from database...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((tech) => (
                    <tr key={tech.id}>
                      <td className="dash-mono">{tech.id}</td>
                      <td><strong>{tech.name}</strong></td>
                      <td className="dash-mono">{tech.phone}</td>
                      <td>{tech.specialty}</td>
                      <td className="dash-mono">{tech.jobsDone}</td>
                      <td>
                        <span className={`dash-status dash-status-${statusTone[tech.status] || "success"}`}>
                          <i />
                          {tech.status}
                        </span>
                      </td>
                      <td>
                        <div className="dash-row-actions">
                          <button className="dash-row-btn" onClick={() => setModal({ mode: "view", record: tech })}>View</button>
                          <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: tech })}>Edit</button>
                          <button className="dash-row-btn is-danger" onClick={() => handleRemove(tech)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      No technicians match your search.
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
          title={modal.mode === "create" ? "Add New Technician" : modal.mode === "edit" ? "Edit Technician" : "Technician Details"}
          fields={modal.mode === "create" ? addTechFields : modal.mode === "view" ? techViewFields : techFields}
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  );
}