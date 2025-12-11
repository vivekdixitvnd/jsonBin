import { useEffect, useState } from "react";
import EntityTable from "../components/EntityTable.jsx";
import EntityForm from "../components/EntityForm.jsx";
import { loadEntityConfig } from "./config.js";
import { setByPath } from "../utils/objPath.js";

const API_BASE = import.meta.env.VITE_API_URL;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [mode, setMode] = useState("create");
  const [currentId, setCurrentId] = useState(null);

  const [config, setConfig] = useState(null);
  const [formValues, setFormValues] = useState({});

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

  // async function loadUsers() {
  //   if (!config) return;
  //   try {
  //     setStatus("Loading users...");
  //     const endpoint = `${API_BASE}${config.apiPath || "/users"}`;
  //     const res = await fetch(endpoint);
  //     const data = await res.json();
  //     if (!res.ok) throw new Error(data.message || "Failed to load users");

  //     const sorted = [...data].sort((a, b) => {
  //       const aId = Number(a.id ?? 0);
  //       const bId = Number(b.id ?? 0);
  //       return aId - bId;
  //     });

  //     setUsers(sorted);
  //     setStatus("Users loaded");
  //   } catch (err) {
  //     console.error(err);
  //     setStatus("Failed to load users: " + err.message);
  //   }
  // }

  // inside UsersPage
  async function loadUsers() {
    if (!config) return;
    try {
      setStatus("Loading users...");
      const endpoint = `${API_BASE}${config.apiPath || "/users"}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load users");

      console.log("DEBUG: raw users from API:", data);
      console.log("DEBUG: columns config:", config.columns);

      // Normalize: ensure row has 'id' if config.columns expect it
      const norm = (data || []).map((u) => {
        // shallow copy
        const copy = { ...u };
        if (
          (config.columns || []).some((c) => c.accessor === "id") &&
          copy.id == null
        ) {
          // if backend gives _id, set id = _id
          if (copy._id) copy.id = copy._id;
        }
        // also ensure categoryName etc. handled elsewhere
        return copy;
      });
      const sorted = [...norm].sort((a, b) => {
        const aId = Number(a.id ?? 0);
        const bId = Number(b.id ?? 0);
        return aId - bId;
      });

      setUsers(sorted);
      setStatus("Users loaded");
    } catch (err) {
      console.error(err);
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

    // Clean form values: remove empty strings, keep empty arrays as [] (not null)
    const cleanedValues = {};
    Object.keys(formValues).forEach((key) => {
      const val = formValues[key];
      // Keep arrays (even empty ones) and other non-empty values
      if (Array.isArray(val)) {
        cleanedValues[key] = val;
      } else if (val !== "" && val != null) {
        cleanedValues[key] = val;
      }
    });

    try {
      if (mode === "create") {
        setStatus("Creating user...");
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedValues),
        });
        const created = await res.json();
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
        const res = await fetch(`${endpoint}/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedValues),
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.message || "Failed to update");
        setUsers((prev) =>
          prev.map((u) => (u._id === updated._id ? updated : u))
        );
        setStatus(`User updated`);
        resetForm();
      }
    } catch (err) {
      console.error(err);
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
      <div style={{ marginBottom: "24px" }}>
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
