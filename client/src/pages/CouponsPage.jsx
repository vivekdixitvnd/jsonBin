import { useEffect, useState } from "react";
import EntityTable from "../components/EntityTable.jsx";

const API_BASE = import.meta.env.VITE_API_URL;

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [mode, setMode] = useState("create");
  const [currentId, setCurrentId] = useState(null);
  const [formValues, setFormValues] = useState({
    code: "",
    discount: "",
    isActive: true,
    validTill: ""
  });

  async function loadCoupons() {
    try {
      setStatus("Loading coupons...");
      const res = await fetch(`${API_BASE}/coupons`);
      const data = await res.json();
      setCoupons(data);
      setStatus("Coupons loaded");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load coupons");
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  function handleChange(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setFormValues({
      code: "",
      discount: "",
      isActive: true,
      validTill: ""
    });
    setMode("create");
    setCurrentId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        code: formValues.code,
        discount: Number(formValues.discount || 0),
        isActive: Boolean(formValues.isActive),
        validTill: formValues.validTill || null
      };

      if (!payload.code) {
        throw new Error("code is required");
      }

      if (mode === "create") {
        setStatus("Creating coupon...");
        const res = await fetch(`${API_BASE}/coupons`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.message || "Failed to create");
        setCoupons((prev) => [...prev, created]);
        setStatus(`Coupon ${created.id} created`);
        resetForm();
      } else if (mode === "edit" && currentId != null) {
        setStatus("Updating coupon...");
        const res = await fetch(`${API_BASE}/coupons/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.message || "Failed to update");
        setCoupons((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        setStatus(`Coupon ${updated.id} updated`);
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setStatus(err.message);
    }
  }

  function handleEditClick(coupon) {
    setMode("edit");
    setCurrentId(coupon.id);
    setFormValues({
      code: coupon.code,
      discount: coupon.discount,
      isActive: coupon.isActive,
      validTill: coupon.validTill || ""
    });
    setStatus(`Editing coupon ${coupon.id}`);
  }

  async function handleDelete(coupon) {
    if (!window.confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) {
      return;
    }
    try {
      setStatus("Deleting coupon...");
      const res = await fetch(`${API_BASE}/coupons/${coupon.id}`, {
        method: "DELETE"
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete coupon");
      await loadCoupons(); // Reload coupons after deletion
      setStatus(`Coupon "${coupon.code}" deleted successfully`);
    } catch (err) {
      console.error(err);
      setStatus(`Failed to delete coupon: ${err.message}`);
    }
  }

  const columns = [
    { header: "ID", accessor: "id" },
    { header: "Code", accessor: "code" },
    { header: "Discount", accessor: "discount" },
    { header: "Active", accessor: "isActive" },
    { header: "Valid Till", accessor: "validTill" }
  ];

  const dataForTable = coupons.map((c) => ({
    ...c,
    isActive: c.isActive ? "Yes" : "No"
  }));

  return (
    <div>
      <h2>Coupons</h2>
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
          <label>Code</label>
          <input
            value={formValues.code}
            onChange={(e) => handleChange("code", e.target.value)}
            required
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>Discount</label>
          <input
            type="number"
            value={formValues.discount}
            onChange={(e) => handleChange("discount", e.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>Active</label>
          <select
            value={formValues.isActive ? "true" : "false"}
            onChange={(e) =>
              handleChange("isActive", e.target.value === "true")
            }
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>Valid Till</label>
          <input
            type="date"
            value={formValues.validTill || ""}
            onChange={(e) => handleChange("validTill", e.target.value)}
          />
        </div>

        <div>
          <button type="submit" style={{ marginTop: 20, padding: "6px 12px" }}>
            {mode === "create" ? "Create Coupon" : "Update Coupon"}
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
