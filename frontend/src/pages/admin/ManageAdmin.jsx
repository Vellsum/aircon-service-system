
import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";
const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api`;

// Fields for creating a new admin
const addAdminFields = [
  { key: "admin_name", label: "Admin Name", type: "text", required: true },
  { key: "password", label: "Password *", type: "password", required: true },
];

// Fields for editing an existing admin
const editAdminFields = [
  { key: "admin_name", label: "Admin Name", type: "text", required: true },
];

// Fields for viewing admin details
const viewAdminFields = [
  { key: "admin_ID", label: "Admin ID" },
  { key: "admin_name", label: "Admin Name" },
];

const ManageAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // GET: Load admin records
  const fetchAdmins = useCallback(async () => {
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
        `${API_BASE}/admin/users/admins`,
        { headers }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load admins");
      }

      if (data.success && Array.isArray(data.admins)) {
        setAdmins(data.admins);
      } else {
        setAdmins([]);
      }
    } catch (err) {
      console.error("Error fetching admins:", err);
      showToast(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // PUT: Update an existing admin
  const handleSave = async (formData) => {
    if (modal?.mode !== "edit") return;

    try {
      const token = localStorage.getItem("token") || "";

      const res = await fetch(
`${API_BASE}/admin/users/admins/editAdmin`,        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            admin_name: formData.admin_name,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update admin");
      }

      showToast("Admin updated successfully!");
      setModal(null);
      fetchAdmins();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // POST: Create a new admin
  const handleAdd = async (formData) => {
    if (modal?.mode !== "create") return;

    try {
      const token = localStorage.getItem("token") || "";

      const res = await fetch(
`${API_BASE}/admin/users/newAdmin/`,        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            admin_name: formData.admin_name,
            password: formData.password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create admin");
      }

      showToast("Admin created successfully!");
      setModal(null);
      fetchAdmins();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Admins" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Admins</h1>
            <p>View and manage administrator accounts</p>
          </div>

          <button
            className="dash-btn dash-btn-primary"
            onClick={() => setModal({ mode: "create", record: {} })}
          >
            + Add Admin
          </button>
        </header>

        <section className="dash-panel">
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Admin Name</th>
                  {/**<th>Actions</th> */}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{ textAlign: "center", padding: "20px" }}
                    >
                      Loading admins from database...
                    </td>
                  </tr>
                ) : admins.length > 0 ? (
                  admins.map((admin) => (
                    <tr key={admin.admin_ID}>
                      <td className="dash-mono">
                        #{admin.admin_id}
                      </td>

                      <td>
                        <strong>{admin.admin_name}</strong>
                      </td>

{/** <td>
                        <div className="dash-row-actions">
                          <button
                            className="dash-row-btn"
                            onClick={() =>
                              setModal({ mode: "edit", record: admin })
                            }
                          >
                            Edit
                          </button>
                        </div>
                      </td>*/}
                      
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        textAlign: "center",
                        padding: "20px",
                      }}
                    >
                      No admins found.
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
              ? "New Admin"
              : modal.mode === "view"
              ? "Admin Details"
              : "Edit Admin"
          }
          fields={
            modal.mode === "create"
              ? addAdminFields
              : modal.mode === "view"
              ? viewAdminFields
              : editAdminFields
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

export default ManageAdmins;
