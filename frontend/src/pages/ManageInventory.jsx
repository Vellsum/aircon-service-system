import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import RecordModal from "../components/RecordModal";
import "../styles/shared.css";

const statusTone = {
  "In Stock": "success",
  "Low Stock": "warning",
  "Out of Stock": "danger",
};

const initialInventory = [
  { id: "#IN001", item: "R32 Refrigerant Gas (kg)", category: "Refrigerant", sku: "REF-R32", stock: 48, reorderAt: 20, price: "$18", status: "In Stock" },
  { id: "#IN002", item: "Compressor Capacitor 35uF", category: "Spare Parts", sku: "CAP-35UF", stock: 12, reorderAt: 15, price: "$9", status: "Low Stock" },
  { id: "#IN003", item: "PVC Drain Pipe (5m)", category: "Installation", sku: "PVC-5M", stock: 30, reorderAt: 10, price: "$6", status: "In Stock" },
  { id: "#IN004", item: "Aircon Filter Mesh (Standard)", category: "Spare Parts", sku: "FLT-STD", stock: 0, reorderAt: 10, price: "$4", status: "Out of Stock" },
  { id: "#IN005", item: "Copper Piping 1/4\" (per m)", category: "Installation", sku: "CU-14", stock: 65, reorderAt: 20, price: "$5", status: "In Stock" },
  { id: "#IN006", item: "PCB Control Board (Universal)", category: "Spare Parts", sku: "PCB-UNI", stock: 6, reorderAt: 8, price: "$45", status: "Low Stock" },
  { id: "#IN007", item: "Insulation Foam Tape", category: "Installation", sku: "FOAM-TP", stock: 22, reorderAt: 10, price: "$3", status: "In Stock" },
];

const statusFilters = ["All", "In Stock", "Low Stock", "Out of Stock"];

const inventoryFields = [
  { key: "item", label: "Item Name", type: "text" },
  { key: "category", label: "Category", type: "select", options: ["Refrigerant", "Spare Parts", "Installation"] },
  { key: "sku", label: "SKU", type: "text" },
  { key: "stock", label: "Stock", type: "number" },
  { key: "reorderAt", label: "Reorder At", type: "number" },
  { key: "price", label: "Unit Price", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["In Stock", "Low Stock", "Out of Stock"] },
];

const inventoryViewFields = [{ key: "id", label: "Item ID" }, ...inventoryFields];

const ManageInventory = () => {
  const [inventory, setInventory] = useState(initialInventory);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [modal, setModal] = useState(null);

  const filtered = inventory.filter((item) => {
    const matchesStatus = activeStatus === "All" || item.status === activeStatus;
    const matchesSearch =
      item.item.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSave = (formData) => {
    if (modal.mode === "create") {
      const newId = `#IN${String(inventory.length + 1).padStart(3, "0")}`;
      setInventory([{ ...formData, id: newId }, ...inventory]);
    } else {
      setInventory(inventory.map((i) => (i.id === modal.record.id ? { ...i, ...formData } : i)));
    }
    setModal(null);
  };

  const handleReorder = (item) => {
    setInventory(inventory.map((i) => (i.id === item.id ? { ...i, status: "In Stock", stock: i.reorderAt + 20 } : i)));
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
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="dash-mono">{item.id}</td>
                    <td>{item.item}</td>
                    <td>{item.category}</td>
                    <td className="dash-mono">{item.sku}</td>
                    <td className="dash-mono">{item.stock}</td>
                    <td className="dash-mono">{item.reorderAt}</td>
                    <td className="dash-mono">{item.price}</td>
                    <td>
                      <span className={`dash-status dash-status-${statusTone[item.status]}`}>
                        <i />
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div className="dash-row-actions">
                        <button className="dash-row-btn" onClick={() => setModal({ mode: "edit", record: item })}>Edit</button>
                        <button className="dash-row-btn" onClick={() => handleReorder(item)}>Reorder</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
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
    </div>
  );
};

export default ManageInventory;
