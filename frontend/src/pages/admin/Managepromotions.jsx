
import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

// Promotion status styling
const statusTone = {
  Active: "success",
  Scheduled: "accent",
  Expired: "warning",
};

const statusFilters = ["All", "Active", "Scheduled", "Expired"];

// Fields for creating and editing promotions
const promoFields = [
  { key: "promo_name", label: "Promotion Name", type: "text", required: true },
  { key: "promoCode", label: "Promo Code", type: "text", required: true },
  { key: "description", label: "Description", type: "text", required: true },
  { key: "discount", label: "Discount", type: "number", required: true },
  { key: "promo_start", label: "Start Date", type: "date", required: true },
  { key: "promo_end", label: "End Date", type: "date", required: true },
 // { key: "serviceList", label: "Service List ID", type: "number" },
 // { key: "packageList", label: "Package List ID", type: "number" },
];

// Fields for viewing promotion details
const promoViewFields = [
  { key: "id", label: "Promo ID" },
  ...promoFields,
  { key: "used", label: "Times Used" },
];

const ManagePromotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // GET: Load promotions
  // TODO: API - Confirm GET endpoint and response property.
  const fetchPromotions = useCallback(async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token") || "";

      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(
        "http://localhost:5000/api/admin/promo",
        { headers }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load promotions");
      }

      if (data.success && Array.isArray(data.promotions)) {
        setPromotions(data.promotions);
      } else {
        setPromotions([]);
      }
    } catch (err) {
      console.error("Error fetching promotions:", err);
      showToast(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  // Search and status filtering
  const filtered = promotions.filter((promo) => {
    const matchesStatus =
      activeStatus === "All" || promo.status === activeStatus;

    const matchesSearch =
      (promo.code || "").toLowerCase().includes(search.toLowerCase()) ||
      (promo.description || "").toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // POST: Create a new promotion
  // TODO: API - Confirm POST endpoint and required request fields.
  const handleAdd = async (formData) => {
    if (modal?.mode !== "create") return;

    try {
      const token = localStorage.getItem("token") || "";

      const res = await fetch(
        "http://localhost:5000/api/admin/promotions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            code: formData.code,
            description: formData.description,
            discount: formData.discount,
            validFrom: formData.validFrom,
            validTo: formData.validTo,
            status: formData.status,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create promotion");
      }

      showToast("Promotion created successfully!");
      setModal(null);
      fetchPromotions();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // PUT: Update an existing promotion
  // TODO: API - Confirm PUT endpoint and promotion ID parameter.
  const handleSave = async (formData) => {
    if (modal?.mode !== "edit") return;

    try {
      const token = localStorage.getItem("token") || "";

      const res = await fetch(
        `http://localhost:5000/api/admin/promotions/${modal.record.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            code: formData.code,
            description: formData.description,
            discount: formData.discount,
            validFrom: formData.validFrom,
            validTo: formData.validTo,
            status: formData.status,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update promotion");
      }

      showToast("Promotion updated successfully!");
      setModal(null);
      fetchPromotions();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // PUT: End a promotion
  // TODO: API - Confirm whether ending a promotion uses PUT or DELETE.
  const handleEnd = async (promo) => {
    if (!window.confirm(`Are you sure you want to end ${promo.code}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token") || "";

      const res = await fetch(
        `http://localhost:5000/api/admin/promotions/${promo.id}/end`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to end promotion");
      }

      showToast("Promotion ended successfully!");
      fetchPromotions();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Promotions" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Promotions</h1>
            <p>Create and manage discount codes and campaigns</p>
          </div>

          <button
            className="dash-btn dash-btn-primary"
            onClick={() => setModal({ mode: "create", record: {} })}
          >
            + Create Promotion
          </button>
        </header>

        {/* Promotion statistics */}
        <section className="dash-stats">
          <div className="dash-stat dash-stat-accent">
            <p className="dash-stat-label">Total Promotions</p>
            <p className="dash-stat-value">{promotions.length}</p>
            <p className="dash-stat-delta">All-time created</p>
          </div>

          <div className="dash-stat dash-stat-success">
            <p className="dash-stat-label">Active Now</p>
            <p className="dash-stat-value">
              {promotions.filter((p) => p.status === "Active").length}
            </p>
            <p className="dash-stat-delta">Live and redeemable</p>
          </div>

          <div className="dash-stat dash-stat-cyan">
            <p className="dash-stat-label">Total Redemptions</p>
            <p className="dash-stat-value">
              {promotions.reduce(
                (sum, p) => sum + (Number(p.used) || 0),
                0
              )}
            </p>
            <p className="dash-stat-delta">Across all codes</p>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by code or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="dash-chips">
              {statusFilters.map((status) => (
                <button
                  key={status}
                  className={`dash-chip${
                    status === activeStatus ? " is-active" : ""
                  }`}
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
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ textAlign: "center", padding: "20px" }}
                    >
                      Loading promotions from database...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((promo) => (
                    <tr key={promo.id}>
                      <td className="dash-mono">{promo.id}</td>
                      <td className="dash-mono">{promo.code}</td>
                      <td>{promo.description}</td>
                      <td className="dash-mono">{promo.discount}</td>
                      <td className="dash-mono">{promo.validFrom}</td>
                      <td className="dash-mono">{promo.validTo}</td>
                      <td className="dash-mono">{promo.used ?? 0}</td>

                      <td>
                        <span
                          className={`dash-status dash-status-${
                            statusTone[promo.status] || "warning"
                          }`}
                        >
                          <i />
                          {promo.status}
                        </span>
                      </td>

                      <td>
                        <div className="dash-row-actions">
                          <button
                            className="dash-row-btn"
                            onClick={() =>
                              setModal({ mode: "view", record: promo })
                            }
                          >
                            View
                          </button>

                          <button
                            className="dash-row-btn"
                            onClick={() =>
                              setModal({ mode: "edit", record: promo })
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="dash-row-btn is-danger"
                            onClick={() => handleEnd(promo)}
                            disabled={promo.status === "Expired"}
                          >
                            End
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        textAlign: "center",
                        padding: "24px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      No promotions found.
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
              <button className="dash-row-btn" disabled>
                Prev
              </button>
              <button className="dash-row-btn" disabled>
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      {modal && (
        <RecordModal
          mode={modal.mode}
          title={
            modal.mode === "create"
              ? "Create Promotion"
              : modal.mode === "view"
              ? "Promotion Details"
              : "Edit Promotion"
          }
          fields={
            modal.mode === "view" ? promoViewFields : promoFields
          }
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={
            modal.mode === "create" ? handleAdd : handleSave
          }
        />
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  );
};

export default ManagePromotions;
