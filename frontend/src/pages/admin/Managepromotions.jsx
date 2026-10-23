import React, { useCallback, useEffect, useState } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

// ⚠️ Keep this IDENTICAL to the base URL used in src/api/customerApi.js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmtDate = (iso) => {
  if (!iso) return "-";
  const [y, m, d] = String(iso).split("-");
  const month = MONTH_NAMES[Number(m) - 1];
  return month ? `${d} ${month} ${y}` : iso;
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const statusTone = {
  Active: "success",
  Scheduled: "accent",
  Expired: "warning",
};

const statusFilters = ["All", "Active", "Scheduled", "Expired"];

// Status is derived by the backend from the dates, so there is no Status field here.
// "End" sets Valid To = today, which makes the backend report it as Expired.
const promoFields = [
  { key: "name", label: "Promo Name", type: "text" },
  { key: "code", label: "Promo Code", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "discount", label: 'Discount (e.g. "15%" or "$10")', type: "text" },
  { key: "validFrom", label: "Valid From (YYYY-MM-DD)", type: "text" },
  { key: "validTo", label: "Valid To (YYYY-MM-DD)", type: "text" },
];

const ManagePromotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null);

  const loadPromotions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/promotions`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || `Request failed (${res.status})`);
      setPromotions(json.data || []);
    } catch (err) {
      setError(err.message || "Failed to load promotions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const handleSave = async (formData) => {
    const isCreate = modal.mode === "create";
    const url = isCreate ? `${API_BASE}/promotions` : `${API_BASE}/promotions/${modal.record.id}`;
    try {
      const res = await fetch(url, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || `Request failed (${res.status})`);
      setModal(null);
      await loadPromotions();
    } catch (err) {
      alert(err.message || "Failed to save promotion");
    }
  };

  const handleEnd = async (promo) => {
    try {
      const res = await fetch(`${API_BASE}/promotions/${promo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validTo: todayISO() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || `Request failed (${res.status})`);
      await loadPromotions();
    } catch (err) {
      alert(err.message || "Failed to end promotion");
    }
  };

  const filtered = promotions.filter((promo) => {
    const matchesStatus = activeStatus === "All" || promo.status === activeStatus;
    const haystack = `${promo.code} ${promo.name} ${promo.description}`.toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="dash">
      <Sidebar active="Manage Promotions" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Promotions</h1>
            <p>Create and manage discount codes and campaigns</p>
          </div>
          <button className="dash-btn dash-btn-primary" onClick={() => setModal({ mode: "create", record: {} })}>
            + Create Promotion
          </button>
        </header>

        <section className="dash-stats">
          <div className="dash-stat dash-stat-accent">
            <p className="dash-stat-label">Total Promotions</p>
            <p className="dash-stat-value">{promotions.length}</p>
            <p className="dash-stat-delta">All-time created</p>
          </div>
          <div className="dash-stat dash-stat-success">
            <p className="dash-stat-label">Active Now</p>
            <p className="dash-stat-value">{promotions.filter((p) => p.status === "Active").length}</p>
            <p className="dash-stat-delta">Live and redeemable</p>
          </div>
          <div className="dash-stat dash-stat-cyan">
            <p className="dash-stat-label">Total Redemptions</p>
            <p className="dash-stat-value">{promotions.reduce((sum, p) => sum + p.used, 0)}</p>
            <p className="dash-stat-delta">Across all codes</p>
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
              <button type="button" className="dash-row-btn" onClick={loadPromotions}>
                Retry
              </button>
            </div>
          )}

          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by name, code or description..."
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
                  <th>Promo ID</th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Discount</th>
                  <th>Valid From</th>
                  <th>Valid To</th>
                  <th>Used</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      Loading promotions...
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((promo) => (
                    <tr key={promo.id}>
                      <td className="dash-mono">{promo.promoId}</td>
                      <td>{promo.name || "-"}</td>
                      <td className="dash-mono">{promo.code}</td>
                      <td>{promo.description || "-"}</td>
                      <td className="dash-mono">{promo.discount}</td>
                      <td className="dash-mono">{fmtDate(promo.validFrom)}</td>
                      <td className="dash-mono">{fmtDate(promo.validTo)}</td>
                      <td className="dash-mono">{promo.used}</td>
                      <td>
                        <span className={`dash-status dash-status-${statusTone[promo.status]}`}>
                          <i />
                          {promo.status}
                        </span>
                      </td>
                      <td>
                        <div className="dash-row-actions">
                          <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: promo })}>
                            Edit
                          </button>
                          {promo.status !== "Expired" && (
                            <button className="dash-row-btn is-danger" onClick={() => handleEnd(promo)}>
                              End
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      {promotions.length === 0
                        ? 'No promotions yet. Click "+ Create Promotion" to add the first one.'
                        : "No promotions match your search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dash-pagination">
            <span>
              Showing {filtered.length} of {promotions.length} promotions
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
          title={modal.mode === "create" ? "Create Promotion" : "Edit Promotion"}
          fields={promoFields}
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default ManagePromotions;