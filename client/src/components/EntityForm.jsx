export default function EntityForm({ fields, values, onChange, onSubmit, mode }) {
  return (
    <form
      onSubmit={onSubmit}
      style={{
        marginTop: "20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px",
        maxWidth: "600px"
      }}
    >
      {fields.map((field) => (
        <div key={field.name} style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ marginBottom: "4px", fontWeight: "bold" }}>
            {field.label}
          </label>
          {field.type === "select" && field.options ? (
            <select
              name={field.name}
              value={values[field.name] ?? ""}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={field.required}
              style={{ padding: "6px 8px" }}
            >
              <option value="">Select {field.label}</option>
              {field.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type || "text"}
              name={field.name}
              value={values[field.name] ?? ""}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={field.required}
              style={{ padding: "6px 8px" }}
            />
          )}
        </div>
      ))}

      <div>
        <button type="submit" style={{ marginTop: "18px", padding: "6px 12px" }}>
          {mode === "edit" ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
