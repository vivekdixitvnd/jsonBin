import { useEffect, useState } from "react";
import EntityTable from "../components/EntityTable.jsx";
import EntityForm from "../components/EntityForm.jsx";

const API_BASE = import.meta.env.VITE_API_URL;

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [mode, setMode] = useState("create");
  const [currentId, setCurrentId] = useState(null);
  const [formValues, setFormValues] = useState({
    name: "",
    categoryId: "",
    price: "",
    stock: ""
  });

  async function loadCategories() {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }

  async function loadProducts() {
    try {
      setStatus("Loading products...");
      const res = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      setProducts(data);
      setStatus("Products loaded");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load products");
    }
  }

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  function handleChange(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setFormValues({
      name: "",
      categoryId: "",
      price: "",
      stock: ""
    });
    setMode("create");
    setCurrentId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        name: formValues.name,
        categoryId: formValues.categoryId ? Number(formValues.categoryId) : null,
        price: Number(formValues.price || 0),
        stock: Number(formValues.stock || 0)
      };

      if (mode === "create") {
        setStatus("Creating product...");
        const res = await fetch(`${API_BASE}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.message || "Failed to create");
        await loadProducts(); // Reload products to get updated data
        setStatus(`Product #${created.id} created`);
        resetForm();
      } else if (mode === "edit" && currentId != null) {
        setStatus("Updating product...");
        const res = await fetch(`${API_BASE}/products/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.message || "Failed to update");
        await loadProducts(); // Reload products to get updated data
        setStatus(`Product #${updated.id} updated`);
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setStatus(err.message);
    }
  }

  function handleEditClick(product) {
    setMode("edit");
    setCurrentId(product.id);
    setFormValues({
      name: product.name,
      categoryId: product.categoryId ?? "",
      price: product.price,
      stock: product.stock
    });
    setStatus(`Editing product #${product.id}`);
  }

  async function handleDelete(product) {
    if (!window.confirm(`Are you sure you want to delete product "${product.name}"?`)) {
      return;
    }
    try {
      setStatus("Deleting product...");
      const res = await fetch(`${API_BASE}/products/${product.id}`, {
        method: "DELETE"
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete product");
      await loadProducts(); // Reload products after deletion
      setStatus(`Product "${product.name}" deleted successfully`);
    } catch (err) {
      console.error(err);
      setStatus(`Failed to delete product: ${err.message}`);
    }
  }

  // Create a map of categoryId to category name
  const categoryMap = {};
  categories.forEach((cat) => {
    categoryMap[cat.id] = cat.name;
  });

  const fields = [
    { name: "name", label: "Name", required: true },
    { name: "categoryId", label: "Category", type: "select", required: false, options: categories },
    { name: "price", label: "Price", type: "number", required: false },
    { name: "stock", label: "Stock", type: "number", required: false }
  ];

  // Transform products data to include category name
  const dataForTable = products.map((product) => ({
    ...product,
    categoryName: product.categoryId ? categoryMap[product.categoryId] || `ID: ${product.categoryId}` : "No Category"
  }));

  const columns = [
    { header: "ID", accessor: "id" },
    { header: "Name", accessor: "name" },
    { header: "Category", accessor: "categoryName" },
    { header: "Price", accessor: "price" },
    { header: "Stock", accessor: "stock" }
  ];

  return (
    <div>
      <h2>Products</h2>
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
        data={dataForTable}
        onEdit={handleEditClick}
        onDelete={handleDelete}
      />
    </div>
  );
}
