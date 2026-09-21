import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/admin/Sidebar";
import RecordModal from "../../components/admin/RecordModal";
import "../../styles/shared.css";

const statusTone = {
  "In Stock": "success",
  "Low Stock": "warning",
  "Out of Stock": "danger",
};

const statusFilters = ["All", "In Stock", "Low Stock", "Out of Stock"];

const inventoryFields = [
  { key: "item", label: "Item Name", type: "text", required: true },
  { key: "category", label: "Category", type: "select", options: ["Refrigerant", "Spare Parts", "Installation", "Tool", "Other"] },
  { key: "sku", label: "SKU", type: "text" },
  { key: "stock", label: "Stock", type: "number", required: true },
  { key: "reorderAt", label: "Reorder At", type: "number" },
  { key: "price", label: "Unit Price ($)", type: "text" },
  { key: "description", label: "Description", type: "text" },
];

const inventoryViewFields = [{ key: "id", label: "Item ID" }, ...inventoryFields];

const ManageInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 1. HTTP GET: Fetch inventory records from Azure SQL database
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("http://localhost:5000/api/admin/inventory", { headers });
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.items)) {
        // Map database record properties to frontend display fields
        const formatted = data.items.map((item) => {
          const rawId = item.itemID || 0;
          const currentStock = parseInt(item.stock, 10) || 0;
          const minReorder = parseInt(item.reorderAmount, 10) || 5;

          // Determine status label dynamically
          let itemStatus = item.stockStatus || "In Stock";
          if (currentStock === 0) itemStatus = "Out of Stock";
          else if (currentStock <= minReorder) itemStatus = "Low Stock";

          return {
            itemID: rawId,
            id: item.SKU ? item.SKU : `#IN${String(rawId).padStart(3, "0")}`,
            item: item.itemName || "Unnamed Item",
            category: item.itemType || "Spare Parts",
            sku: item.SKU || `SKU-${rawId}`,
            stock: currentStock,
            reorderAt: minReorder,
            price: `$${parseFloat(item.price || 0).toFixed(2)}`,
            rawPrice: item.price || 0,
            status: itemStatus,
            description: item.description || "",
          };
        });
        setInventory(formatted);
      }
    } catch (err) {
      console.error("Error fetching inventory data:", err);
      showToast("Failed to load inventory from database.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Run fetch on mount
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // 2. Filter & Search Logic
  const filtered = inventory.filter((item) => {
    const matchesStatus = activeStatus === "All" || item.status === activeStatus;
    const matchesSearch =
      (item.item && item.item.toLowerCase().includes(search.toLowerCase())) ||
      (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // 3. HTTP POST / PUT: Save new item or update existing item in database
  const handleSave = async (formData) => {
    const token = localStorage.getItem("token") || "";

    // Parse monetary string
    const cleanPrice = typeof formData.price === "string" 
      ? parseFloat(formData.price.replace(/[^0-9.]/g, "")) || 0
      : formData.price || 0;

    const payload = {
      itemName: formData.item || "New Spare Part",
      itemType: formData.category || "Spare Parts",
      SKU: formData.sku || `SKU-${Date.now()}`,
      stock: parseInt(formData.stock, 10) || 0,
      reorderAmount: parseInt(formData.reorderAt, 10) || 5,
      price: cleanPrice,
      description: formData.description || "Aircon spare part",
    };

    if (modal.mode === "create") {
      try {
        const res = await fetch("http://localhost:5000/api/admin/inventory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to add inventory item");

        showToast("Inventory item added successfully!");
        setModal(null);
        fetchInventory(); // Refresh table from DB
      } catch (err) {
        showToast(`Error: ${err.message}`);
      }
    } else if (modal.mode === "edit") {
      try {
        const targetId = formData.itemID || (modal.record && modal.record.itemID);

        const res = await fetch(`http://localhost:5000/api/admin/inventory/${targetId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update item");

        showToast("Inventory item updated successfully!");
        setModal(null);
        fetchInventory(); // Refresh table from DB
      } catch (err) {
        showToast(`Error: ${err.message}`);
      }
    }
  };

  // 4. HTTP PUT: Reorder stock action (increases stock in DB by reorderAt + 20)
  const handleReorder = async (item) => {
    try {
      const token = localStorage.getItem("token") || "";
      const targetId = item.itemID;
      const newStock = item.stock + item.reorderAt + 20;

      const res = await fetch(`http://localhost:5000/api/admin/inventory/${targetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemName: item.item,
          itemType: item.category,
          SKU: item.sku,
          stock: newStock,
          reorderAmount: item.reorderAt,
          price: item.rawPrice,
          description: item.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to restock item");

      showToast(`Restocked ${item.item} (+${item.reorderAt + 20} units)`);
      fetchInventory(); // Refresh table from DB
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="dash">
      <Sidebar active="Manage Inventory" />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Manage Inventory</h1>
            <p>Track spare parts and material stock levels</p>
          </div>
          <button className="dash-btn dash-btn-primary" onClick={() => setModal({ mode: "create", record: {} })}>
            + Add Item
          </button>
        </header>

        {/* Live Stat Cards */}
        <section className="dash-stats">
          <div className="dash-stat dash-stat-accent">
            <p className="dash-stat-label">Total Items</p>
            <p className="dash-stat-value">{inventory.length}</p>
            <p className="dash-stat-delta">Tracked SKUs</p>
          </div>
          <div className="dash-stat dash-stat-cyan">
            <p className="dash-stat-label">Low Stock</p>
            <p className="dash-stat-value">{inventory.filter((i) => i.status === "Low Stock").length}</p>
            <p className="dash-stat-delta">Below reorder level</p>
          </div>
          <div className="dash-stat dash-stat-success">
            <p className="dash-stat-label">Out of Stock</p>
            <p className="dash-stat-value">{inventory.filter((i) => i.status === "Out of Stock").length}</p>
            <p className="dash-stat-delta">Needs immediate reorder</p>
          </div>
        </section>

        <section className="dash-panel">
          <div className="dash-filterbar">
            <input
              className="dash-search"
              type="text"
              placeholder="Search by item name or SKU..."
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
                  <th>Item ID</th>
                  <th>Item</th>
                  <th>Category</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th>Reorder At</th>
                  <th>Unit Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "24px" }}>
                      Loading inventory stock from database...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((item) => (
                    <tr key={item.itemID || item.id}>
                      <td className="dash-mono">{item.id}</td>
                      <td><strong>{item.item}</strong></td>
                      <td>{item.category}</td>
                      <td className="dash-mono">{item.sku}</td>
                      <td className="dash-mono">{item.stock}</td>
                      <td className="dash-mono">{item.reorderAt}</td>
                      <td className="dash-mono">{item.price}</td>
                      <td>
                        <span className={`dash-status dash-status-${statusTone[item.status] || "accent"}`}>
                          <i />
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div className="dash-row-actions">
                          <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: item })}>
                            Edit
                          </button>
                          <button className="dash-row-btn" onClick={() => handleReorder(item)}>
                            Reorder
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                      No items match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="dash-pagination">
            <span>Showing {filtered.length} of {inventory.length} items</span>
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
          title={modal.mode === "create" ? "Add Item" : "Edit Item"}
          fields={inventoryFields}
          data={modal.record}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  );
};

export default ManageInventory;