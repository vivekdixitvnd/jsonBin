import { useEffect, useState } from "react";
import EntityTable from "../components/EntityTable.jsx";
import EntityForm from "../components/EntityForm.jsx";
import { loadEntityConfig } from "./config.js";

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

  async function loadUsers() {
    if (!config) return;
    try {
      setStatus("Loading users...");
      const endpoint = `${API_BASE}${config.apiPath || "/users"}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load users");

      const sorted = [...data].sort((a, b) => {
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
    setFormValues((prev) => ({ ...prev, [field]: value }));
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

    try {
      if (mode === "create") {
        setStatus("Creating user...");
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues),
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
          body: JSON.stringify(formValues),
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
      vals[f.name] = user[f.name] ?? "";
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
      <div>
        <h2>Users</h2>
        <p style={{ fontSize: "14px", color: "#555" }}>{status}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Users</h2>
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
        data={users}
        onEdit={handleEditClick}
        onDelete={handleDelete}
      />
    </div>
  );
}
