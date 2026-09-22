import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const addCustomerFields = [
  { key: "customer_name", label: "Customer Name", type: "text", required: true },
  { key: "customer_address", label: "Address", type: "text" },
  { key: "loyaltyPoints", label: "Loyalty Points", type: "number" },
];

const editCustomerFields = [
  { key: "customer_name", label: "Customer Name", type: "text", required: true },
  { key: "customer_address", label: "Address", type: "text" },
  { key: "loyaltyPoints", label: "Loyalty Points", type: "number" },
];

const viewCustomerFields = [
  { key: "customer_ID", label: "Customer ID" },
  { key: "customer_name", label: "Customer Name" },
  { key: "customer_address", label: "Address" },
  { key: "loyaltyPoints", label: "Loyalty Points" },
];

const Managecustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("http://localhost:5000/api/admin/users/customers", { headers });
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.customers)) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filtered = customers.filter(
    (c) =>
      (c.customer_name && c.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      String(c.customer_ID).includes(search)
  );

  const handleSave = async (formData) => {
    const token = localStorage.getItem("token") || "";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    if (modal.mode === "create") {
      try {
        const res = await fetch("http://localhost:5000/api/admin/users/customers", {
          method: "POST",
          headers,
          body: JSON.stringify({
            customer_name: formData.customer_name,
            customer_address: formData.customer_address || "Singapore",
            loyaltyPoints: parseInt(formData.loyaltyPoints, 10) || 0,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to add customer");

        showToast("Customer created successfully!");
        setModal(null);
        fetchCustomers();
      } catch (err) {
        showToast(`Error: ${err.message}`);
      }
    } else if (modal.mode === "edit") {
      try {
        const targetId = modal.record.customer_ID;
        const res = await fetch(`http://localhost:5000/api/admin/users/customers/${targetId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            customer_name: formData.customer_name,
            customer_address: formData.customer_address,
            loyaltyPoints: parseInt(formData.loyaltyPoints, 10) || 0,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update customer");

        showToast("Customer updated successfully!");
        setModal(null);
        fetchCustomers();
      } catch (err) {
        showToast(`Error: ${err.message}`);
      }
    }
  };

  const handleRemove = async (customer) => {
    if (!window.confirm(`Are you sure you want to remove ${customer.customer_name}?`)) return;

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`http://localhost:5000/api/admin/users/customers/${customer.customer_ID}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove customer");

      showToast(`Removed ${customer.customer_name}`);
      fetchCustomers();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Customers" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Customers</h1>
            <p>View and manage all registered clients</p>
          </div>
          <button className="dash-btn dash-btn-primary" onClick={() => setModal({ mode: "create", record: {} })}>
            + Add Customer
          </button>
        </header>

        <section className="dash-panel">
          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by customer name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer Name</th>
                  <th>Address</th>
                  <th>Loyalty Points</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                      Loading customers from database...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((c) => (
                    <tr key={c.customer_ID}>
                      <td className="dash-mono">#{c.customer_ID}</td>
                      <td><strong>{c.customer_name}</strong></td>
                      <td>{c.customer_address || "Singapore"}</td>
                      <td className="dash-mono">{c.loyaltyPoints || 0} pts</td>
                      <td>
                        <div className="dash-row-actions">
                          <button className="dash-row-btn" onClick={() => setModal({ mode: "view", record: c })}>View</button>
                          <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: c })}>Edit</button>
                          <button className="dash-row-btn is-danger" onClick={() => handleRemove(c)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>
                      No customers found.
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
          title={modal.mode === "create" ? "New Customer" : modal.mode === "edit" ? "Edit Customer" : "Customer Details"}
          fields={modal.mode === "create" ? addCustomerFields : modal.mode === "view" ? viewCustomerFields : editCustomerFields}
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  );
};

export default Managecustomers;