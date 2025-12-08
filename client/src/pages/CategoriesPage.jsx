import { useEffect, useState } from "react";
import EntityTable from "../components/EntityTable.jsx";
import EntityForm from "../components/EntityForm.jsx";

const API_BASE = import.meta.env.VITE_API_URL;

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [mode, setMode] = useState("create");
  const [currentId, setCurrentId] = useState(null);
  const [formValues, setFormValues] = useState({
    name: "",
    description: ""
  });

  async function loadCategories() {
    try {
      setStatus("Loading categories...");
      const res = await fetch(`${API_BASE}/categories`);
      const data = await res.json();
      setCategories(data);
      setStatus("Categories loaded");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load categories");
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function handleChange(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setFormValues({ name: "", description: "" });
    setMode("create");
    setCurrentId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (mode === "create") {
        setStatus("Creating category...");
        const res = await fetch(`${API_BASE}/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues)
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.message || "Failed to create");
        setCategories((prev) => [...prev, created]);
        setStatus(`Category #${created.id} created`);
        resetForm();
      } else if (mode === "edit" && currentId != null) {
        setStatus("Updating category...");
        const res = await fetch(`${API_BASE}/categories/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues)
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.message || "Failed to update");
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        setStatus(`Category #${updated.id} updated`);
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setStatus(err.message);
    }
  }

  function handleEditClick(category) {
    setMode("edit");
    setCurrentId(category.id);
    setFormValues({
      name: category.name,
      description: category.description || ""
    });
    setStatus(`Editing category #${category.id}`);
  }

  async function handleDelete(category) {
    if (!window.confirm(`Are you sure you want to delete category "${category.name}"?`)) {
      return;
    }
    try {
      setStatus("Deleting category...");
      const res = await fetch(`${API_BASE}/categories/${category.id}`, {
        method: "DELETE"
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete category");
      await loadCategories(); // Reload categories after deletion
      setStatus(`Category "${category.name}" deleted successfully`);
    } catch (err) {
      console.error(err);
      setStatus(`Failed to delete category: ${err.message}`);
    }
  }

  const fields = [
    { name: "name", label: "Name", required: true },
    { name: "description", label: "Description", required: false }
  ];

  const columns = [
    { header: "ID", accessor: "id" },
    { header: "Name", accessor: "name" },
    { header: "Description", accessor: "description" }
  ];

  return (
    <div>
      <h2>Categories</h2>
      <p style={{ fontSize: 14, color: "#555" }}>{status}</p>

      <EntityForm
        fields={fields}
        values={formValues}
        onChange={handleChange}
        onSubmit={handleSubmit}
        mode={mode}
      />

      <EntityTable
        columns={columns}
        data={categories}
        onEdit={handleEditClick}
        onDelete={handleDelete}
      />
    </div>
  );
}
