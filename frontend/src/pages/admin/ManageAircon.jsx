import React, { useState } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const statusTone = {
  Installed: "success",
  "Not Installed": "warning",
};

const initialAircons = [
  { id: "#AC001", itemId: "#ITM045", model: "FTKM50VVM9", make: "Daikin", type: "Split Unit", description: "Wall-mounted split unit, 2.5HP", serialNumber: "SN2026AC001", warrantyNumber: "WR-2026-8841", isInstalled: "Installed" },
  { id: "#AC002", itemId: "#ITM046", model: "CS-PU18VKH", make: "Panasonic", type: "Split Unit", description: "Wall-mounted split unit, 2.0HP", serialNumber: "SN2026AC002", warrantyNumber: "WR-2026-8842", isInstalled: "Installed" },
  { id: "#AC003", itemId: "#ITM047", model: "AWF09D", make: "Mitsubishi", type: "Window Unit", description: "Compact window unit, 1.0HP", serialNumber: "SN2026AC003", warrantyNumber: "WR-2026-8843", isInstalled: "Not Installed" },
  { id: "#AC004", itemId: "#ITM048", model: "4-Way Cassette 5HP", make: "Daikin", type: "Cassette Unit", description: "Ceiling cassette, commercial grade", serialNumber: "SN2026AC004", warrantyNumber: "WR-2026-8844", isInstalled: "Installed" },
  { id: "#AC005", itemId: "#ITM049", model: "Multi-Split 3-Zone", make: "LG", type: "Multi-Split", description: "3-zone system, condo installation", serialNumber: "SN2026AC005", warrantyNumber: "WR-2026-8845", isInstalled: "Not Installed" },
];

const typeFilters = ["All", "Split Unit", "Window Unit", "Cassette Unit", "Multi-Split"];

const airconFields = [
  { key: "itemId", label: "Item ID", type: "text" },
  { key: "model", label: "Model", type: "text" },
  { key: "make", label: "Make", type: "text" },
  { key: "type", label: "Type", type: "select", options: ["Split Unit", "Window Unit", "Cassette Unit", "Portable Unit", "Multi-Split"] },
  { key: "description", label: "Description", type: "text" },
  { key: "serialNumber", label: "Serial Number", type: "text" },
  { key: "warrantyNumber", label: "Warranty Number", type: "text" },
  { key: "isInstalled", label: "Installation Status", type: "select", options: ["Installed", "Not Installed"] },
];

const airconViewFields = [{ key: "id", label: "Aircon ID" }, ...airconFields];

const ManageAircon = () => {
  const [aircons, setAircons] = useState(initialAircons);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("All");
  const [modal, setModal] = useState(null);

  const filtered = aircons.filter((unit) => {
    const matchesType = activeType === "All" || unit.type === activeType;
    const matchesSearch =
      unit.model.toLowerCase().includes(search.toLowerCase()) ||
      unit.make.toLowerCase().includes(search.toLowerCase()) ||
      unit.id.toLowerCase().includes(search.toLowerCase()) ||
      unit.serialNumber.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleSave = (formData) => {
    if (modal.mode === "create") {
      const newId = `#AC${String(aircons.length + 1).padStart(3, "0")}`;
      setAircons([{ ...formData, id: newId }, ...aircons]);
    } else {
      setAircons(aircons.map((a) => (a.id === modal.record.id ? { ...a, ...formData } : a)));
    }
    setModal(null);
  };

  const handleRemove = (unit) => {
    setAircons(aircons.filter((a) => a.id !== unit.id));
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Aircon" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Aircon Units</h1>
            <p>Track registered aircon units, models, and installation status</p>
          </div>
          <button className="dash-btn dash-btn-primary" onClick={() => setModal({ mode: "create", record: {} })}>
            + Add Aircon Unit
          </button>
        </header>

        <section className="dash-stats">
          <div className="dash-stat dash-stat-accent">
            <p className="dash-stat-label">Total Units</p>
            <p className="dash-stat-value">{aircons.length}</p>
            <p className="dash-stat-delta">Registered aircon units</p>
          </div>
          <div className="dash-stat dash-stat-success">
            <p className="dash-stat-label">Installed</p>
            <p className="dash-stat-value">{aircons.filter((a) => a.isInstalled === "Installed").length}</p>
            <p className="dash-stat-delta">Currently installed</p>
          </div>
          <div className="dash-stat dash-stat-cyan">
            <p className="dash-stat-label">Pending Install</p>
            <p className="dash-stat-value">{aircons.filter((a) => a.isInstalled === "Not Installed").length}</p>
            <p className="dash-stat-delta">Awaiting installation</p>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by model, make, ID, or serial number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="dash-chips">
              {typeFilters.map((type) => (
                <button
                  key={type}
                  className={`dash-chip${type === activeType ? " is-active" : ""}`}
                  onClick={() => setActiveType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Aircon ID</th>
                  <th>Item ID</th>
                  <th>Model</th>
                  <th>Make</th>
                  <th>Type</th>
                  <th>Serial Number</th>
                  <th>Warranty Number</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((unit) => (
                  <tr key={unit.id}>
                    <td className="dash-mono">{unit.id}</td>
                    <td className="dash-mono">{unit.itemId}</td>
                    <td>{unit.model}</td>
                    <td>{unit.make}</td>
                    <td>{unit.type}</td>
                    <td className="dash-mono">{unit.serialNumber}</td>
                    <td className="dash-mono">{unit.warrantyNumber}</td>
                    <td>
                      <span className={`dash-status dash-status-${statusTone[unit.isInstalled]}`}>
                        <i />
                        {unit.isInstalled}
                      </span>
                    </td>
                    <td>
                      <div className="dash-row-actions">
                        <button className="dash-row-btn" onClick={() => setModal({ mode: "view", record: unit })}>View</button>
                        <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: unit })}>Edit</button>
                        <button className="dash-row-btn is-danger" onClick={() => handleRemove(unit)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      No aircon units match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dash-pagination">
            <span>Showing {filtered.length} of {aircons.length} units</span>
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
          title={modal.mode === "create" ? "Add Aircon Unit" : modal.mode === "edit" ? "Edit Aircon Unit" : "Aircon Unit Details"}
          fields={modal.mode === "view" ? airconViewFields : airconFields}
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default ManageAircon;
