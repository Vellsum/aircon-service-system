import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import RecordModal from "../components/RecordModal";
import "../styles/shared.css";

const statusTone = {
  Active: "success",
  Scheduled: "accent",
  Expired: "warning",
};

const initialPromotions = [
  { id: "#PR001", code: "COOL10", description: "10% off any servicing", discount: "10%", validFrom: "01 Aug 2026", validTo: "30 Sep 2026", used: 84, status: "Active" },
  { id: "#PR002", code: "NEWCUST20", description: "$20 off first booking", discount: "$20", validFrom: "01 Jul 2026", validTo: "31 Dec 2026", used: 152, status: "Active" },
  { id: "#PR003", code: "DEEPCLEAN15", description: "15% off chemical cleaning", discount: "15%", validFrom: "10 Sep 2026", validTo: "10 Oct 2026", used: 0, status: "Scheduled" },
  { id: "#PR004", code: "RAYA2026", description: "Festive season bundle discount", discount: "$30", validFrom: "01 Mar 2026", validTo: "15 Apr 2026", used: 210, status: "Expired" },
  { id: "#PR005", code: "REFER5", description: "$5 off for referrals", discount: "$5", validFrom: "01 Jan 2026", validTo: "31 Dec 2026", used: 61, status: "Active" },
];

const statusFilters = ["All", "Active", "Scheduled", "Expired"];

const promoFields = [
  { key: "code", label: "Promo Code", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "discount", label: "Discount", type: "text" },
  { key: "validFrom", label: "Valid From", type: "text" },
  { key: "validTo", label: "Valid To", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["Active", "Scheduled", "Expired"] },
];

const promoViewFields = [{ key: "id", label: "Promo ID" }, ...promoFields, { key: "used", label: "Times Used" }];

const ManagePromotions = () => {
  const [promotions, setPromotions] = useState(initialPromotions);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null);

  const filtered = promotions.filter((promo) => {
    const matchesStatus = activeStatus === "All" || promo.status === activeStatus;
    const matchesSearch =
      promo.code.toLowerCase().includes(search.toLowerCase()) ||
      promo.description.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSave = (formData) => {
    if (modal.mode === "create") {
      const newId = `#PR${String(promotions.length + 1).padStart(3, "0")}`;
      setPromotions([{ ...formData, id: newId, used: 0 }, ...promotions]);
    } else {
      setPromotions(promotions.map((p) => (p.id === modal.record.id ? { ...p, ...formData } : p)));
    }
    setModal(null);
  };

  const handleEnd = (promo) => {
    setPromotions(promotions.map((p) => (p.id === promo.id ? { ...p, status: "Expired" } : p)));
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
                {filtered.map((promo) => (
                  <tr key={promo.id}>
                    <td className="dash-mono">{promo.id}</td>
                    <td className="dash-mono">{promo.code}</td>
                    <td>{promo.description}</td>
                    <td className="dash-mono">{promo.discount}</td>
                    <td className="dash-mono">{promo.validFrom}</td>
                    <td className="dash-mono">{promo.validTo}</td>
                    <td className="dash-mono">{promo.used}</td>
                    <td>
                      <span className={`dash-status dash-status-${statusTone[promo.status]}`}>
                        <i />
                        {promo.status}
                      </span>
                    </td>
                    <td>
                      <div className="dash-row-actions">
                        <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: promo })}>Edit</button>
                        <button className="dash-row-btn is-danger" onClick={() => handleEnd(promo)}>End</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      No promotions match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dash-pagination">
            <span>Showing {filtered.length} of {promotions.length} promotions</span>
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
