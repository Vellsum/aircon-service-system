import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import RecordModal from "../components/RecordModal";
import "../styles/shared.css";

const statusTone = {
  Available: "success",
  "On Job": "accent",
  "Off Duty": "warning",
};

const initialTechnicians = [
  { id: "#TC001", name: "Michael Chua", phone: "+65 9123 4567", specialty: "Aircon Servicing", status: "Available", jobsDone: 142, rating: "4.9" },
  { id: "#TC002", name: "David Krishnan", phone: "+65 9234 5678", specialty: "Chemical Cleaning", status: "On Job", jobsDone: 98, rating: "4.7" },
  { id: "#TC003", name: "Alex Foo", phone: "+65 9345 6789", specialty: "Aircon Repair", status: "Available", jobsDone: 176, rating: "4.8" },
  { id: "#TC004", name: "Farid Rahman", phone: "+65 9456 7890", specialty: "Gas Top-up", status: "Off Duty", jobsDone: 64, rating: "4.6" },
  { id: "#TC005", name: "Wei Jian Tan", phone: "+65 9567 8901", specialty: "Chemical Overhaul", status: "On Job", jobsDone: 110, rating: "4.9" },
  { id: "#TC006", name: "Ravi Shankar", phone: "+65 9678 9012", specialty: "Aircon Servicing", status: "Available", jobsDone: 87, rating: "4.5" },
];

const statusFilters = ["All", "Available", "On Job", "Off Duty"];

const techFields = [
  { key: "name", label: "Name", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "specialty", label: "Specialty", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["Available", "On Job", "Off Duty"] },
];

const techViewFields = [
  { key: "id", label: "Technician ID" },
  ...techFields,
  { key: "jobsDone", label: "Jobs Done" },
  { key: "rating", label: "Rating" },
];

const ManageTechnicians = () => {
  const [technicians, setTechnicians] = useState(initialTechnicians);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null);

  const filtered = technicians.filter((tech) => {
    const matchesStatus = activeStatus === "All" || tech.status === activeStatus;
    const matchesSearch =
      tech.name.toLowerCase().includes(search.toLowerCase()) ||
      tech.id.toLowerCase().includes(search.toLowerCase()) ||
      tech.specialty.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSave = (formData) => {
    if (modal.mode === "create") {
      const newId = `#TC${String(technicians.length + 1).padStart(3, "0")}`;
      setTechnicians([{ ...formData, id: newId, jobsDone: 0, rating: "-" }, ...technicians]);
    } else {
      setTechnicians(technicians.map((t) => (t.id === modal.record.id ? { ...t, ...formData } : t)));
    }
    setModal(null);
  };

  const handleRemove = (tech) => {
    setTechnicians(technicians.filter((t) => t.id !== tech.id));
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Technicians" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Technicians</h1>
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
              placeholder="Search by name, ID, or specialty..."
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
                  <th>Jobs Done</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tech) => (
                  <tr key={tech.id}>
                    <td className="dash-mono">{tech.id}</td>
                    <td>{tech.name}</td>
                    <td className="dash-mono">{tech.phone}</td>
                    <td>{tech.specialty}</td>
                    <td className="dash-mono">{tech.jobsDone}</td>
                    <td className="dash-mono">{tech.rating}</td>
                    <td>
                      <span className={`dash-status dash-status-${statusTone[tech.status]}`}>
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
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      No technicians match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dash-pagination">
            <span>Showing {filtered.length} of {technicians.length} technicians</span>
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
          title={modal.mode === "create" ? "Add Technician" : modal.mode === "edit" ? "Edit Technician" : "Technician Details"}
          fields={modal.mode === "view" ? techViewFields : techFields}
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default ManageTechnicians;
