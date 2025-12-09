import { useEffect, useState } from "react";
import EntityTable from "../components/EntityTable.jsx";
import EntityForm from "../components/EntityForm.jsx";
import {loadEntityConfig} from "./config.js";

const API_BASE = import.meta.env.VITE_API_URL;

export default function ProductsPage() {
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
          "products",
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
      setStatus("Loading products...");
      const endpoint = `${API_BASE}${config.apiPath || "/products"}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load products");
      setItems(data);
      setStatus("Products loaded");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load products: " + err.message);
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
    const endpoint = `${API_BASE}${config.apiPath || "/products"}`;

    try {
      if (mode === "create") {
        setStatus("Creating product...");
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues)
        });
        const created = await res.json();
        if (!res.ok)
          throw new Error(created.message || "Failed to create product");
        setItems((prev) => [...prev, created]);
        setStatus("Product created");
        resetForm();
      } else if (mode === "edit" && currentId) {
        setStatus("Updating product...");
        const res = await fetch(`${endpoint}/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues)
        });
        const updated = await res.json();
        if (!res.ok)
          throw new Error(updated.message || "Failed to update product");
        setItems((prev) =>
          prev.map((it) => (it._id === updated._id ? updated : it))
        );
        setStatus("Product updated");
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
      vals[f.name] = item[f.name] ?? "";
    });
    setFormValues(vals);
    setStatus("Editing product");
  }

  async function handleDelete(item) {
    if (!config) return;
    const id = item._id;
    if (!window.confirm("Delete this product?")) return;

    try {
      setStatus("Deleting product...");
      const endpoint = `${API_BASE}${config.apiPath || "/products"}`;
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.message || "Failed to delete product");
      await loadItems();
      setStatus("Product deleted");
    } catch (err) {
      console.error(err);
      setStatus("Failed to delete: " + err.message);
    }
  }

  if (!config) {
    return (
      <div>
        <h2>Products</h2>
        <p style={{ fontSize: "14px", color: "#555" }}>{status}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Products</h2>
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
