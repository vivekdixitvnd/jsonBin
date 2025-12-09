import { useEffect, useState } from "react";
import EntityTable from "../components/EntityTable.jsx";
import EntityForm from "../components/EntityForm.jsx";
import {loadEntityConfig} from "./config.js";

const API_BASE = import.meta.env.VITE_API_URL;

export default function OrdersPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [mode, setMode] = useState("create");
  const [currentId, setCurrentId] = useState(null);

  const [config, setConfig] = useState(null);
  const [formValues, setFormValues] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { config: cfg, initialForm } = await loadEntityConfig(
          "orders",
          setStatus
        );
        setConfig(cfg);
        setFormValues(initialForm);
      } catch {}
    })();
  }, []);

  async function loadItems() {
    if (!config) return;
    try {
      setStatus("Loading orders...");
      const endpoint = `${API_BASE}${config.apiPath || "/orders"}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load orders");
      setItems(data);
      setStatus("Orders loaded");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load orders: " + err.message);
    }
  }

  useEffect(() => {
    if (config) loadItems();
  }, [config]);

  function handleChange(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    if (!config) return;
    const reset = {};
    (config.fields || []).forEach((f) => (reset[f.name] = ""));
    setFormValues(reset);
    setMode("create");
    setCurrentId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!config) return;
    const endpoint = `${API_BASE}${config.apiPath || "/orders"}`;

    try {
      if (mode === "create") {
        setStatus("Creating order...");
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues)
        });
        const created = await res.json();
        if (!res.ok)
          throw new Error(created.message || "Failed to create order");
        setItems((prev) => [...prev, created]);
        setStatus("Order created");
        resetForm();
      } else if (mode === "edit" && currentId) {
        setStatus("Updating order...");
        const res = await fetch(`${endpoint}/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues)
        });
        const updated = await res.json();
        if (!res.ok)
          throw new Error(updated.message || "Failed to update order");
        setItems((prev) =>
          prev.map((it) => (it._id === updated._id ? updated : it))
        );
        setStatus("Order updated");
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setStatus(err.message);
    }
  }

  function handleEditClick(item) {
    if (!config) return;
    setMode("edit");
    setCurrentId(item._id);

    const vals = {};
    (config.fields || []).forEach((f) => {
      if (f.name === "productIds" && Array.isArray(item.productIds)) {
        vals[f.name] = item.productIds.join(", ");
      } else if (f.name === "orderDate" && item.orderDate) {
        vals[f.name] = item.orderDate.slice(0, 10);
      } else {
        vals[f.name] = item[f.name] ?? "";
      }
    });
    setFormValues(vals);
    setStatus("Editing order");
  }

  async function handleDelete(item) {
    if (!config) return;
    const id = item._id;
    if (!window.confirm("Delete this order?")) return;

    try {
      setStatus("Deleting order...");
      const endpoint = `${API_BASE}${config.apiPath || "/orders"}`;
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.message || "Failed to delete order");
      await loadItems();
      setStatus("Order deleted");
    } catch (err) {
      console.error(err);
      setStatus("Failed to delete: " + err.message);
    }
  }

  if (!config) {
    return (
      <div>
        <h2>Orders</h2>
        <p style={{ fontSize: "14px", color: "#555" }}>{status}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Orders</h2>
      <p style={{ fontSize: "14px", color: "#555" }}>{status}</p>

      <EntityForm
        fields={config.fields || []}
        values={formValues}
        onChange={handleChange}
        onSubmit={handleSubmit}
        mode={mode}
      />

      <EntityTable
        columns={config.columns || []}
        data={items}
        onEdit={handleEditClick}
        onDelete={handleDelete}
      />
    </div>
  );
}
