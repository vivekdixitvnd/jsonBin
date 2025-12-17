import { useEffect, useState } from "react";
import EntityTable from "../components/EntityTable.jsx";
import EntityForm from "../components/EntityForm.jsx";
import { loadEntityConfig } from "./config.js";
import { setByPath } from "../utils/objPath.js";

const API_BASE = (import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4000/api`).replace(/\/$/, "");

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [mode, setMode] = useState("create");
  const [currentId, setCurrentId] = useState(null);

  const [config, setConfig] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [exporting, setExporting] = useState(false);

  // ---- CONFIG LOAD ----
  useEffect(() => {
    (async () => {
      try {
        const { config: cfg, initialForm } = await loadEntityConfig(
          "users",
          setStatus
        );
        setConfig(cfg);
        setFormValues(initialForm);
      } catch (err) {
        // status already set in helper
      }
    })();
  }, []);

  async function loadUsers() {
    if (!config) return;
    try {
      setStatus("Loading users...");
      const endpoint = `${API_BASE}${config.apiPath || "/users"}`;
      console.log("Fetching from:", endpoint);
      
      const res = await fetch(endpoint);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to load users");
      }

      console.log("DEBUG: raw users from API:", data);
      console.log("DEBUG: data type:", typeof data);
      console.log("DEBUG: is array:", Array.isArray(data));
      console.log("DEBUG: columns config:", config.columns);

      // Handle different response formats from backend
      let usersArray = [];
      
      if (Array.isArray(data)) {
        usersArray = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.users)) {
          usersArray = data.users;
        } else if (Array.isArray(data.data)) {
          usersArray = data.data;
        } else if (Array.isArray(data.results)) {
          usersArray = data.results;
        } else {
          console.warn("Data is not an array and not found in common wrapper keys. Using empty array.");
          usersArray = [];
        }
      }
      
      console.log("DEBUG: processed usersArray length:", usersArray.length);
      
      const norm = usersArray.map((u) => {
        const copy = { ...u };
        if (
          (config.columns || []).some((c) => (c.accessor || c.key) === "id") &&
          copy.id == null
        ) {
          if (copy._id) copy.id = copy._id;
        }
        return copy;
      });
      const sorted = [...norm].sort((a, b) => {
        const aId = Number(a.id ?? 0);
        const bId = Number(b.id ?? 0);
        return aId - bId;
      });

      setUsers(sorted);
      setStatus(`Users loaded (${sorted.length} users)`);
    } catch (err) {
      console.error("Error loading users:", err);
      setStatus("Failed to load users: " + err.message);
    }
  }

  useEffect(() => {
    if (config) loadUsers();
  }, [config]);

  function handleChange(field, value) {
    setFormValues((prev) => {
      const copy = JSON.parse(JSON.stringify(prev || {}));
      setByPath(copy, field, value);
      return copy;
    });
  }

  function resetForm() {
    if (!config) return;
    const reset = {};
    (config.fields || []).forEach((f) => {
      reset[f.name] = f.type === "checkbox" ? false : "";
    });
    setFormValues(reset);
    setMode("create");
    setCurrentId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!config) return;

    const endpoint = `${API_BASE}${config.apiPath || "/users"}`;

    const cleanedValues = {};
    Object.keys(formValues).forEach((key) => {
      const val = formValues[key];
      if (Array.isArray(val)) {
        cleanedValues[key] = val;
      } else if (val !== "" && val != null) {
        cleanedValues[key] = val;
      }
    });

    console.log(`🚀 [UsersPage] handleSubmit. Mode: ${mode}, Endpoint: ${endpoint}`);
    console.log(`📦 [UsersPage] cleanedValues to send:`, cleanedValues);

    try {
      if (mode === "create") {
        setStatus("Creating user...");
        console.log(`📤 [UsersPage] POST to ${endpoint}`);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedValues),
        });
        const created = await res.json();
        console.log(`📥 [UsersPage] POST response:`, created);
        if (!res.ok) throw new Error(created.message || "Failed to create");

        setUsers((prev) =>
          [...prev, created].sort(
            (a, b) => Number(a.id ?? 0) - Number(b.id ?? 0)
          )
        );

        setStatus(`User created`);
        resetForm();
      } else if (mode === "edit" && currentId) {
        setStatus("Updating user...");
        console.log(`📤 [UsersPage] PUT to ${endpoint}/${currentId}`);
        const res = await fetch(`${endpoint}/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedValues),
        });
        const updated = await res.json();
        console.log(`📥 [UsersPage] PUT response:`, updated);
        if (!res.ok) throw new Error(updated.message || "Failed to update");
        setUsers((prev) =>
          prev.map((u) => (u._id === updated._id ? updated : u))
        );
        setStatus(`User updated`);
        resetForm();
      }
    } catch (err) {
      console.error("❌ [UsersPage] Error:", err);
      setStatus(err.message);
    }
  }

  function handleEditClick(user) {
    if (!config) return;
    setMode("edit");
    setCurrentId(user._id);

    const vals = {};
    (config.fields || []).forEach((f) => {
      const userValue = user[f.name];
      if (f.type === "checkbox" && (f.array || f.array === "true")) {
        vals[f.name] = Array.isArray(userValue) ? userValue : [];
      } else if (f.type === "subString" || f.type === "safetychecks" || f.type === "permitchecklists") {
        vals[f.name] = Array.isArray(userValue) ? userValue : [];
      } else if (f.type === "checkbox") {
        vals[f.name] = userValue ?? false;
      } else {
        vals[f.name] = userValue ?? "";
      }
    });
    setFormValues(vals);
    setStatus(`Editing user`);
  }

  async function handleDelete(user) {
    if (!config) return;
    const id = user._id;

    if (!window.confirm(`Delete this user?`)) return;

    try {
      setStatus("Deleting user...");
      const endpoint = `${API_BASE}${config.apiPath || "/users"}`;
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete user");
      await loadUsers();
      setStatus("User deleted");
    } catch (err) {
      console.error(err);
      setStatus(`Failed to delete user: ${err.message}`);
    }
  }

  // -------------------
  // EXPORT logic
  // -------------------
  async function handleExport() {
    if (!config) return;
    try {
      setExporting(true);
      setStatus("Preparing export...");

      const endpoint = `${API_BASE}${config.apiPath || "/users"}/export`;

      // Build a simple fields array from config.columns
      const fields = (config.columns || []).map((c) => c.accessor || c.key || c.field || c.name).filter(Boolean);

      // You can change filter here if you want to export subset
      const body = {
        filter: {},       // export all by default
        fields: fields.length ? fields : undefined,
        filename: `${config.entityName || "users"}-export.csv`,
        limit: config.exportLimit || undefined
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // If server returns json error
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      // derive filename from content-disposition if present
      const cd = res.headers.get("Content-Disposition") || "";
      let filename = body.filename;
      const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i);
      if (match) filename = decodeURIComponent(match[1]);

      // trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus(`Export ready: ${filename}`);
    } catch (err) {
      console.error("Export error:", err);
      setStatus("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  }

  if (!config) {
    return (
      <div style={{ padding: "24px" }}>
        <h2 style={{ marginBottom: "16px", color: "#333" }}>Users</h2>
        <p style={{ fontSize: "14px", color: "#555" }}>{status}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ 
            marginBottom: "8px", 
            color: "#333",
            fontSize: "28px",
            fontWeight: "600"
          }}>
            Users Management
          </h2>
          <p style={{ 
            fontSize: "14px", 
            color: status.includes("Failed") ? "#dc3545" : status.includes("Loading") ? "#007bff" : "#28a745",
            fontWeight: status.includes("Failed") || status.includes("Loading") ? "500" : "400"
          }}>
            {status}
          </p>
        </div>

        <div>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: exporting ? "#f0f0f0" : "#fff",
              cursor: exporting ? "not-allowed" : "pointer",
              marginRight: "8px"
            }}
            title="Export visible fields to CSV"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      <EntityForm
        fields={config.fields || []}
        values={formValues}
        onChange={handleChange}
        onSubmit={handleSubmit}
        mode={mode}
      />

      <EntityTable
        columns={config.columns || []}
        data={users}
        onEdit={handleEditClick}
        onDelete={handleDelete}
      />
    </div>
  );
}
