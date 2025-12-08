import { useEffect, useState } from "react";
import EntityTable from "../components/EntityTable.jsx";
import EntityForm from "../components/EntityForm.jsx";

const API_BASE = import.meta.env.VITE_API_URL;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [mode, setMode] = useState("create"); // "create" | "edit"
  const [currentId, setCurrentId] = useState(null);
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    phone: ""
  });

  async function loadUsers() {
    try {
      setStatus("Loading users...");
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      setUsers(data);
      setStatus("Users loaded");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load users");
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleChange(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setFormValues({ name: "", email: "", phone: "" });
    setMode("create");
    setCurrentId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (mode === "create") {
        setStatus("Creating user...");
        const res = await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues)
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.message || "Failed to create");
        setUsers((prev) => [...prev, created]);
        setStatus(`User #${created.id} created`);
        resetForm();
      } else if (mode === "edit" && currentId != null) {
        setStatus("Updating user...");
        const res = await fetch(`${API_BASE}/users/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues)
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.message || "Failed to update");
        setUsers((prev) =>
          prev.map((u) => (u.id === updated.id ? updated : u))
        );
        setStatus(`User #${updated.id} updated`);
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setStatus(err.message);
    }
  }

  function handleEditClick(user) {
    setMode("edit");
    setCurrentId(user.id);
    setFormValues({
      name: user.name,
      email: user.email,
      phone: user.phone
    });
    setStatus(`Editing user #${user.id}`);
  }

  async function handleDelete(user) {
    if (!window.confirm(`Are you sure you want to delete user #${user.id}?`)) {
      return;
    }
    try {
      setStatus("Deleting user...");
      const res = await fetch(`${API_BASE}/users/${user.id}`, {
        method: "DELETE"
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete user");
      await loadUsers(); // Reload users after deletion
      setStatus(`User #${user.id} deleted successfully`);
    } catch (err) {
      console.error(err);
      setStatus(`Failed to delete user: ${err.message}`);
    }
  }

  const fields = [
    { name: "name", label: "Name", required: true },
    { name: "email", label: "Email", required: true },
    { name: "phone", label: "Phone", required: true }
  ];

  const columns = [
    { header: "ID", accessor: "id" },
    { header: "Name", accessor: "name" },
    { header: "Email", accessor: "email" },
    { header: "Phone", accessor: "phone" }
  ];

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
