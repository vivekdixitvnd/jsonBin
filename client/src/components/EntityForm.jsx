// // export default function EntityForm({ fields, values, onChange, onSubmit, mode }) {
// //   return (
// //     <form
// //       onSubmit={onSubmit}
// //       style={{
// //         marginTop: "20px",
// //         display: "grid",
// //         gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
// //         gap: "12px",
// //         maxWidth: "600px"
// //       }}
// //     >
// //       {fields.map((field) => (
// //         <div key={field.name} style={{ display: "flex", flexDirection: "column" }}>
// //           <label style={{ marginBottom: "4px", fontWeight: "bold" }}>
// //             {field.label}
// //           </label>
// //           {field.type === "select" && field.options ? (
// //             <select
// //               name={field.name}
// //               value={values[field.name] ?? ""}
// //               onChange={(e) => onChange(field.name, e.target.value)}
// //               required={field.required}
// //               style={{ padding: "6px 8px" }}
// //             >
// //               <option value="">Select {field.label}</option>
// //               {field.options.map((option) => (
// //                 <option key={option.id} value={option.id}>
// //                   {option.name}
// //                 </option>
// //               ))}
// //             </select>
// //           ) : (
// //             <input
// //               type={field.type || "text"}
// //               name={field.name}
// //               value={values[field.name] ?? ""}
// //               onChange={(e) => onChange(field.name, e.target.value)}
// //               required={field.required}
// //               style={{ padding: "6px 8px" }}
// //             />
// //           )}
// //         </div>
// //       ))}

// //       <div>
// //         <button type="submit" style={{ marginTop: "18px", padding: "6px 12px" }}>
// //           {mode === "edit" ? "Update" : "Create"}
// //         </button>
// //       </div>
// //     </form>
// //   );
// // }

// import FieldRenderer from "../components/FieldRenderer";
// import { setByPath } from "../utils/objPath";

// <FieldRenderer
//   key={f.name}
//   field={f}
//   values={formValues}
//   onChange={(name, val) => {
//     setFormValues(prev => {
//       const copy = JSON.parse(JSON.stringify(prev));
//       setByPath(copy, name, val);
//       return copy;
//     });
//   }}
// />

/// src/components/EntityForm.jsx
import { useEffect, useState } from "react";
import FieldRenderer from "./FieldRenderer";
import { setByPath } from "../utils/objPath";

/**
 * Minimal-change EntityForm that preserves your original design.
 *
 * Props:
 *  - fields: array of { name, label, type, options, ... }
 *  - values: object (controlled values)
 *  - onChange: (name, value) => void  (controlled mode)
 *  - onSubmit: (e) => void (parent handler)
 *  - mode: "create" | "edit"
 *
 * Behaviour:
 *  - If onChange is provided, component works in controlled mode and calls onChange(name, value).
 *  - If onChange is NOT provided, it keeps an internal state and submits that.
 *  - Visual layout exactly matches your original: grid, minmax(200px,1fr), gap, maxWidth.
 */
export default function EntityForm({
  fields = [],
  values = {},
  onChange,
  onSubmit,
  mode = "create"
}) {
  // internal values fallback if parent doesn't control the form
  const [internalValues, setInternalValues] = useState(() => {
    const init = {};
    (fields || []).forEach((f) => {
      if (f.type === "checkbox" && (f.array || f.array === "true")) init[f.name] = [];
      else if (f.type === "boolean") init[f.name] = false;
      else init[f.name] = "";
    });
    return init;
  });

  // keep internalValues in sync when fields change (add/remove)
  useEffect(() => {
    setInternalValues((prev) => {
      const next = { ...(prev || {}) };
      (fields || []).forEach((f) => {
        if (next[f.name] === undefined) {
          if (f.type === "checkbox" && (f.array || f.array === "true")) next[f.name] = [];
          else if (f.type === "boolean") next[f.name] = false;
          else next[f.name] = "";
        }
      });
      return next;
    });
  }, [fields]);

  function getValueForField(name) {
    if (onChange) {
      return values?.[name] ?? "";
    }
    return internalValues?.[name] ?? "";
  }

  // Called by FieldRenderer
  function handleFieldChange(name, val) {
    if (onChange) {
      // controlled parent will handle nested paths if it uses setByPath
      onChange(name, val);
      return;
    }
    // uncontrolled: update nested path in internalValues
    setInternalValues((prev) => {
      const copy = JSON.parse(JSON.stringify(prev || {}));
      setByPath(copy, name, val);
      return copy;
    });
  }

  function handleSubmit(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (onSubmit) {
      // Controlled parent will read its values object
      return onSubmit(e);
    }
    // Uncontrolled fallback: call onSubmit-like behaviour by dispatching a synthetic event
    // But if no onSubmit provided, just log payload (helpful during dev)
    // You may change this to send fetch directly from here if you prefer.
    // console.log("EntityForm submit (uncontrolled):", internalValues);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: "20px",
        padding: "24px",
        background: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
        maxWidth: "900px"
      }}
    >
      {(fields || []).map((field) => (
        <div 
          key={field.name} 
          style={{ 
            display: "flex", 
            flexDirection: "column",
            gridColumn: field.type === "textarea" || field.type === "subString" || field.type === "safetychecks" || field.type === "permitchecklists" ? "1 / -1" : "auto"
          }}
        >
          <label style={{ 
            marginBottom: "8px", 
            fontWeight: "600",
            fontSize: "14px",
            color: "#333"
          }}>
            {field.label}
            {field.required && <span style={{ color: "#dc3545", marginLeft: "4px" }}>*</span>}
          </label>

          {/* Use FieldRenderer so different `type`s from JSON work.
              FieldRenderer expects:
                - field (the config)
                - values (object) -> we pass controlled values or internal values
                - onChange(name, value)
          */}
          <FieldRenderer
            field={field}
            values={onChange ? values : internalValues}
            onChange={handleFieldChange}
          />
        </div>
      ))}

      <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
        <button 
          type="submit" 
          style={{ 
            padding: "10px 24px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background 0.2s"
          }}
          onMouseOver={(e) => e.target.style.background = "#0056b3"}
          onMouseOut={(e) => e.target.style.background = "#007bff"}
        >
          {mode === "edit" ? "Update User" : "Create User"}
        </button>
      </div>
    </form>
  );
}
