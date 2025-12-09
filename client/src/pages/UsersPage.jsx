import { useEffect, useState } from "react";
import EntityTable from "../components/EntityTable.jsx";
import EntityForm from "../components/EntityForm.jsx";

const API_BASE = import.meta.env.VITE_API_URL;
// yeh direct JSONBin ka link hai jo tumne diya
const CONFIG_URL = import.meta.env.VITE_CONFIG_URL;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [mode, setMode] = useState("create"); // "create" | "edit"
  const [currentId, setCurrentId] = useState(null);

  const [config, setConfig] = useState(null); // { apiPath, fields, columns }
  const [formValues, setFormValues] = useState({});

  // ---------- CONFIG LOAD KAREIN (JSONBin se) ----------
  async function loadConfig() {
    try {
      setStatus("Loading config...");

      const res = await fetch(CONFIG_URL);
      const raw = await res.json();

      // JSONBin v3: data.record ke andar hota hai
      const record = raw.record || raw;
      const cfg = record.config?.users;

      if (!cfg) {
        throw new Error("Users config not found in JSON");
      }

      setConfig(cfg);

      // form ke liye initial values bana do (har field = "")
      const initialForm = {};
      (cfg.fields || []).forEach((f) => {
        initialForm[f.name] = "";
      });
      setFormValues(initialForm);

      setStatus("Config loaded");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load config: " + err.message);
    }
  }

  // ---------- USERS DATA LOAD KAREIN (backend se) ----------
  async function loadUsers() {
    if (!config) return; // config ke bina apiPath pata nahi hoga
    try {
      setStatus("Loading users...");
      const endpoint = `${API_BASE}${config.apiPath}`; // apiPath JSON se, fallback /users
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load users");
      setUsers(data);
      setStatus("Users loaded");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load users: " + err.message);
    }
  }

  // mount par -> pehle config load
  useEffect(() => {
    loadConfig();
  }, []);

  // jab config aa jaye -> users load karo
  useEffect(() => {
    if (config) {
      loadUsers();
    }
  }, [config]);

  // ---------- FORM HANDLERS ----------
  function handleChange(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    if (!config) return;
    const reset = {};
    (config.fields || []).forEach((f) => {
      reset[f.name] = "";
    });
    setFormValues(reset);
    setMode("create");
    setCurrentId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!config) return;

    const endpoint = `${API_BASE}${config.apiPath || "/users"}`; // /api/users

    try {
      if (mode === "create") {
        setStatus("Creating user...");
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues)
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.message || "Failed to create");
        setUsers((prev) => [...prev, created]);
        setStatus(`User #${created.id ?? created._id} created`);
        resetForm();
      } else if (mode === "edit" && currentId != null) {
        setStatus("Updating user...");
        const res = await fetch(`${endpoint}/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues)
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.message || "Failed to update");
        setUsers((prev) =>
          prev.map((u) =>
            (u.id ?? u._id) === (updated.id ?? updated._id) ? updated : u
          )
        );
        setStatus(`User #${updated.id ?? updated._id} updated`);
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setStatus(err.message);
    }
  }

  function handleEditClick(user) {
    if (!config) return;
    const id = user.id ?? user._id;
    setMode("edit");
    setCurrentId(id);

    // config.fields ke basis par formValues fill karo
    const newValues = {};
    (config.fields || []).forEach((f) => {
      newValues[f.name] = user[f.name] ?? "";
    });
    setFormValues(newValues);

    setStatus(`Editing user #${id}`);
  }

  async function handleDelete(user) {
    if (!config) return;
    const id = user.id ?? user._id;

    if (!window.confirm(`Are you sure you want to delete user #${id}?`)) {
      return;
    }
    try {
      setStatus("Deleting user...");
      const endpoint = `${API_BASE}${config.apiPath || "/users"}`;
      const res = await fetch(`${endpoint}/${id}`, {
        method: "DELETE"
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete user");
      await loadUsers(); // reload
      setStatus(`User #${id} deleted successfully`);
    } catch (err) {
      console.error(err);
      setStatus(`Failed to delete user: ${err.message}`);
    }
  }

  // ---------- UI RENDER ----------
  if (!config) {
    return (
      <div>
        <h2>Users</h2>
        <p style={{ fontSize: "14px", color: "#555" }}>{status}</p>
      </div>
    );
  }

  const fields = config.fields || [];
  const columns = config.columns || [];

  return (
    <div>
      <h2>Users</h2>
      <p style={{ fontSize: "14px", color: "#555" }}>{status}</p>

      <EntityForm
        fields={fields}
        values={formValues}
        onChange={handleChange}
        onSubmit={handleSubmit}
        mode={mode}
      />

      <EntityTable
        columns={columns}
        data={users}
        onEdit={handleEditClick}
        onDelete={handleDelete}
      />
    </div>
  );
}
