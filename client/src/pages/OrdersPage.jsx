import { useEffect, useState } from "react";
import EntityTable from "../components/EntityTable.jsx";

const API_BASE = import.meta.env.VITE_API_URL;

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [mode, setMode] = useState("create");
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [formValues, setFormValues] = useState({
    userId: "",
    productIds: "",
    orderDate: "",
    status: "pending"
  });

  async function loadOrders() {
    try {
      setStatus("Loading orders...");
      const res = await fetch(`${API_BASE}/orders`);
      const data = await res.json();
      setOrders(data);
      setStatus("Orders loaded");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load orders");
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function handleChange(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setFormValues({
      userId: "",
      productIds: "",
      orderDate: "",
      status: "pending"
    });
    setMode("create");
    setCurrentOrderId(null);
  }

  function parseProductIds(str) {
    return str
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((n) => Number(n));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        userId: Number(formValues.userId),
        productIds: parseProductIds(formValues.productIds),
        orderDate: formValues.orderDate || undefined,
        status: formValues.status
      };

      if (!payload.userId) {
        throw new Error("userId is required");
      }

      if (mode === "create") {
        setStatus("Creating order...");
        const res = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.message || "Failed to create");
        setOrders((prev) => [...prev, created]);
        setStatus(`Order ${created.orderId} created`);
        resetForm();
      } else if (mode === "edit" && currentOrderId != null) {
        setStatus("Updating order...");
        const res = await fetch(
          `${API_BASE}/orders/${encodeURIComponent(currentOrderId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }
        );
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.message || "Failed to update");
        setOrders((prev) =>
          prev.map((o) =>
            o.orderId === updated.orderId ? updated : o
          )
        );
        setStatus(`Order ${updated.orderId} updated`);
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setStatus(err.message);
    }
  }

  function handleEditClick(order) {
    setMode("edit");
    setCurrentOrderId(order.orderId);
    setFormValues({
      userId: order.userId,
      productIds: (order.productIds || []).join(", "),
      orderDate: order.orderDate || "",
      status: order.status || "pending"
    });
    setStatus(`Editing order ${order.orderId}`);
  }

  async function handleDelete(order) {
    if (!window.confirm(`Are you sure you want to delete order ${order.orderId}?`)) {
      return;
    }
    try {
      setStatus("Deleting order...");
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(order.orderId)}`, {
        method: "DELETE"
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete order");
      await loadOrders(); // Reload orders after deletion
      setStatus(`Order ${order.orderId} deleted successfully`);
    } catch (err) {
      console.error(err);
      setStatus(`Failed to delete order: ${err.message}`);
    }
  }

  const columns = [
    { header: "Order ID", accessor: "orderId" },
    { header: "User ID", accessor: "userId" },
    {
      header: "Product IDs",
      accessor: "productIds"
    },
    { header: "Order Date", accessor: "orderDate" },
    { header: "Status", accessor: "status" }
  ];

  const dataForTable = orders.map((o) => ({
    ...o,
    productIds: (o.productIds || []).join(", ")
  }));

  return (
    <div>
      <h2>Orders</h2>
      <p style={{ fontSize: 14, color: "#555" }}>{status}</p>

      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          maxWidth: 700
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>User ID</label>
          <input
            type="number"
            value={formValues.userId}
            onChange={(e) => handleChange("userId", e.target.value)}
            required
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>Product IDs (comma separated)</label>
          <input
            value={formValues.productIds}
            onChange={(e) => handleChange("productIds", e.target.value)}
            placeholder="101, 102, 103"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>Order Date</label>
          <input
            type="date"
            value={formValues.orderDate}
            onChange={(e) => handleChange("orderDate", e.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>Status</label>
          <select
            value={formValues.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <option value="pending">pending</option>
            <option value="shipped">shipped</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>

        <div>
          <button type="submit" style={{ marginTop: 20, padding: "6px 12px" }}>
            {mode === "create" ? "Create Order" : "Update Order"}
          </button>
          {mode === "edit" && (
            <button
              type="button"
              onClick={resetForm}
              style={{ marginLeft: 8, marginTop: 20 }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <EntityTable
        columns={columns}
        data={dataForTable}
        onEdit={handleEditClick}
        onDelete={handleDelete}
      />
    </div>
  );
}
