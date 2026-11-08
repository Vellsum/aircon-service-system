
import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";
const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api`;
// Subscription fields based on payables.subscription
const subscriptionFields = [
  {
    key: "name",
    label: "Subscription Name",
    type: "text",
    required: true,
  },
  {
    key: "description",
    label: "Description",
    type: "textarea",
    required: true,
  },
  {
    key: "recurringServiceID",
    label: "Recurring Service",
    type: "select",
    options: [], // API NEEDED: Retrieve existing services
    required: true,
  },
  {
    key: "timeTillNextService",
    label: "Interval (Days)",
    type: "number",
    required: true,
  },
  {
    key: "numberOfBookings",
    label: "Number of Bookings",
    type: "number",
    required: true,
  },
];

const subscriptionViewFields = [
  { key: "subscriptionID", label: "Subscription ID" },
  ...subscriptionFields,
];

const ManageSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // GET: Load subscriptions
  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token") || "";

      const res = await fetch(
      `${API_BASE}/admin/bookings/subscriptions`,  /// <---  THIS GET ALL FROM TABLE
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load subscriptions");
      }

      if (data.success && Array.isArray(data.subscriptions)) {
        setSubscriptions(data.subscriptions);
      } else {
        setSubscriptions([]);
      }
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      showToast(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // GET: Load existing services for dropdown
  const fetchServices = useCallback(async () => {
    try {
      const token = localStorage.getItem("token") || "";

      const res = await fetch(
        `${API_BASE}/admin/bookings/subscriptions/services`,/// <---  THIS GET ALL services FROM TABLE
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load services");
      }

      if (data.success && Array.isArray(data.services)) {
        setServices(data.services);
      }
    } catch (err) {
      console.error("Error fetching services:", err);
      showToast(`Error loading services: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    fetchServices();
  }, [fetchSubscriptions, fetchServices]);

  // Prepare service dropdown options
  const serviceOptions = services.map((service) => ({
    value: service.service_id,
    label: service.service_name,
  }));

  const fieldsWithServices = subscriptionFields.map((field) =>
    field.key === "recurringServiceID"
      ? { ...field, options: serviceOptions }
      : field
  );

  const viewFieldsWithServices = [
    { key: "subscriptionID", label: "Subscription ID" },
    ...fieldsWithServices,
  ];

  // Search subscriptions
  const filtered = subscriptions.filter((sub) =>
    (sub.name || "").toLowerCase().includes(search.toLowerCase()) ||
    String(sub.subscriptionID || "").includes(search)
  );

  // POST: Create subscription
  const handleAdd = async (formData) => {
    if (modal?.mode !== "create") return;

    try {
      const token = localStorage.getItem("token") || "";

      const res = await fetch(
       `${API_BASE}/admin/bookings/subscriptions`,  /// <---  make new subscription
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            recurringServiceID: formData.recurringServiceID,
            timeTillNextService: formData.timeTillNextService,
            numberOfBookings: formData.numberOfBookings,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create subscription");
      }

      showToast("Subscription created successfully!");
      setModal(null);
      fetchSubscriptions();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // PUT: Edit subscription
  const handleSave = async (formData) => {
    if (modal?.mode !== "edit") return;

    try {
      const token = localStorage.getItem("token") || "";
      const subscriptionID = modal.record.subscriptionID;

      const res = await fetch(
      `${API_BASE}/admin/bookings/subscriptions/${subscriptionID}`,  // <-- edit subscription
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subscriptionID,
            name: formData.name,
            description: formData.description,
            recurringServiceID: formData.recurringServiceID,
            timeTillNextService: formData.timeTillNextService,
            numberOfBookings: formData.numberOfBookings,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update subscription");
      }

      showToast("Subscription updated successfully!");
      setModal(null);
      fetchSubscriptions();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Subscriptions" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Subscriptions</h1>
            <p>Manage recurring service packages and booking cycles</p>
          </div>

          <button
            className="dash-btn dash-btn-primary"
            onClick={() => setModal({ mode: "create", record: {} })}
          >
            + Add Subscription
          </button>
        </header>

        <section className="dash-stats">
          <div className="dash-stat dash-stat-accent">
            <p className="dash-stat-label">Total Subscriptions</p>
            <p className="dash-stat-value">{subscriptions.length}</p>
            <p className="dash-stat-delta">Available subscription plans</p>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by subscription name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Subscription ID</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Recurring Service ID</th>
                  <th>Interval (Days)</th>
                  <th>Number of Bookings</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "20px" }}>
                      Loading subscriptions from database...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((sub) => (
                    <tr key={sub.subscriptionID}>
                      <td className="dash-mono">{sub.subscriptionID}</td>
                      <td>{sub.name}</td>
                      <td>{sub.description}</td>
                      <td className="dash-mono">{sub.recurringServiceID}</td>
                      <td className="dash-mono">{sub.timeTillNextService}</td>
                      <td className="dash-mono">{sub.numberOfBookings}</td>
                      <td>
                        <div className="dash-row-actions">
                          <button
                            className="dash-row-btn"
                            onClick={() =>
                              setModal({ mode: "edit", record: sub })
                            }
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: "24px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      No subscriptions found.
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
          title={
            modal.mode === "create"
              ? "Add Subscription"
              : modal.mode === "view"
              ? "Subscription Details"
              : "Edit Subscription"
          }
          fields={
            modal.mode === "view"
              ? viewFieldsWithServices
              : fieldsWithServices
          }
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={modal.mode === "create" ? handleAdd : handleSave}
        />
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  );
};

export default ManageSubscriptions;
