import React, { useCallback, useEffect, useState } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

// ⚠️ Keep this IDENTICAL to the base URL used in src/api/customerApi.js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const statusTone = {
  Active: "success",
  Inactive: "warning",
};

const statusFilters = ["All", "Active", "Inactive"];

// "10 - General Servicing (1 Unit)" -> 10
const parseServiceOption = (value) => {
  const m = String(value || "").match(/^(\d+)/);
  return m ? Number(m[1]) : null;
};

const ManagePackages = () => {
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null);

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [pkgRes, svcRes] = await Promise.all([
        fetch(`${API_BASE}/packages`),
        fetch(`${API_BASE}/packages/services`),
      ]);
      const pkgJson = await pkgRes.json().catch(() => ({}));
      const svcJson = await svcRes.json().catch(() => ({}));
      if (!pkgRes.ok || !pkgJson.success) throw new Error(pkgJson.message || `Request failed (${pkgRes.status})`);
      setPackages(pkgJson.data || []);
      if (svcRes.ok && svcJson.success) setServices(svcJson.data || []);
    } catch (err) {
      setError(err.message || "Failed to load packages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  // Dropdown options need the loaded services, so build the field list at render time
  const packageFields = [
    { key: "name", label: "Package Name", type: "text" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "recurringServiceID",
      label: "Recurring Service",
      type: "select",
      options: services.map((s) => `${s.service_id} - ${s.service_name}`),
    },
    { key: "timeTillNextService", label: "Days Between Services", type: "text" },
    { key: "numberOfBookings", label: "Number of Bookings", type: "text" },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
  ];

  // Turn the numeric recurringServiceID into the matching "id - name" option string
  const toFormRecord = (pkg) => ({
    ...pkg,
    recurringServiceID:
      pkg.recurringServiceID != null ? `${pkg.recurringServiceID} - ${pkg.serviceName || ""}` : "",
  });

  const handleSave = async (formData) => {
    const isCreate = modal.mode === "create";
    const url = isCreate ? `${API_BASE}/packages` : `${API_BASE}/packages/${modal.record.id}`;
    const payload = {
      name: formData.name,
      description: formData.description,
      recurringServiceID: parseServiceOption(formData.recurringServiceID),
      timeTillNextService: formData.timeTillNextService,
      numberOfBookings: formData.numberOfBookings,
      status: formData.status,
    };
    try {
      const res = await fetch(url, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || `Request failed (${res.status})`);
      setModal(null);
      await loadPackages();
    } catch (err) {
      alert(err.message || "Failed to save package");
    }
  };

  const handleStatus = async (pkg, status) => {
    try {
      const res = await fetch(`${API_BASE}/packages/${pkg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || `Request failed (${res.status})`);
      await loadPackages();
    } catch (err) {
      alert(err.message || "Failed to update package");
    }
  };

  const filtered = packages.filter((pkg) => {
    const matchesStatus = activeStatus === "All" || pkg.status === activeStatus;
    const haystack = `${pkg.name} ${pkg.packageId} ${pkg.description}`.toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const topSeller = packages.reduce(
    (best, p) => (!best || p.subscribers > best.subscribers ? p : best),
    null
  );

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
            <p className="dash-stat-value" style={{ fontSize: "18px" }}>
              {topSeller && topSeller.subscribers > 0 ? topSeller.name : "—"}
            </p>
            <p className="dash-stat-delta">Most active subscribers</p>
          </div>
        </section>

        <section className="dash-panel">
          {error && (
            <div
              style={{
                background: "#fdecea",
                border: "1px solid #f5c6c2",
                color: "#b3261e",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{error}</span>
              <button type="button" className="dash-row-btn" onClick={loadPackages}>
                Retry
              </button>
            </div>
          )}

          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by name, ID or description..."
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
                  <th>Subscribers</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      Loading packages...
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((pkg) => (
                    <tr key={pkg.id}>
                      <td className="dash-mono">{pkg.packageId}</td>
                      <td>{pkg.name}</td>
                      <td>
                        {pkg.serviceName
                          ? `${pkg.serviceName} × ${pkg.numberOfBookings}`
                          : "—"}
                      </td>
                      <td className="dash-mono">{pkg.price}</td>
                      <td className="dash-mono">{pkg.validity}</td>
                      <td className="dash-mono">{pkg.subscribers}</td>
                      <td>
                        <span className={`dash-status dash-status-${statusTone[pkg.status]}`}>
                          <i />
                          {pkg.status}
                        </span>
                      </td>
                      <td>
                        <div className="dash-row-actions">
                          <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: toFormRecord(pkg) })}>
                            Edit
                          </button>
                          {pkg.status === "Active" ? (
                            <button className="dash-row-btn is-danger" onClick={() => handleStatus(pkg, "Inactive")}>
                              Deactivate
                            </button>
                          ) : (
                            <button className="dash-row-btn" onClick={() => handleStatus(pkg, "Active")}>
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      {packages.length === 0
                        ? 'No packages yet. Click "+ Add Package" to create the first one.'
                        : "No packages match your search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dash-pagination">
            <span>
              Showing {filtered.length} of {packages.length} packages
            </span>
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