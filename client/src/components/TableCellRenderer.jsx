import { getByPath } from "../utils/objPath";

export default function TableCellRenderer({ row, column }) {
  const { accessor, type } = column;
  const raw = getByPath(row, accessor);

  switch (type) {
    case "imageLink":
      return raw ? <img src={raw} alt="" style={{ width: 64, borderRadius: "4px" }} /> : null;

    case "textarea": {
      const s = String(raw ?? "");
      return s.length > 80 ? s.slice(0, 80) + "…" : s;
    }

    case "Date": {
      if (!raw) return "";
      const d = new Date(raw);
      return d.toLocaleDateString();
    }

    case "DateTime": {
      if (!raw) return "";
      const d = new Date(raw);
      return d.toLocaleString();
    }

    case "checkbox":
      return Array.isArray(raw) ? raw.join(", ") : String(raw ?? "");

    case "boolean":
      return raw ? <span style={{ color: "#28a745", fontWeight: "500" }}>Yes</span> : <span style={{ color: "#999" }}>No</span>;

    case "number":
      return raw ?? "";

    case "subString":
    case "safetychecks":
    case "permitchecklists": {
      if (!Array.isArray(raw) || raw.length === 0) {
        return <span style={{ color: "#999", fontStyle: "italic" }}>No items</span>;
      }
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {raw.map((item, idx) => {
            // If item is an object, show its values in a readable format
            if (typeof item === "object" && item !== null) {
              const entries = Object.entries(item).filter(([k, v]) => v != null && v !== "");
              if (entries.length === 0) {
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: "6px 10px", 
                      background: "#f5f5f5", 
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: "#999"
                    }}
                  >
                    Empty item
                  </div>
                );
              }
              return (
                <div 
                  key={idx} 
                  style={{ 
                    padding: "8px 12px", 
                    background: "#e8f4f8", 
                    borderRadius: "6px",
                    fontSize: "12px",
                    border: "1px solid #b3d9e6"
                  }}
                >
                  {entries.map(([key, value], i) => (
                    <div key={i} style={{ marginBottom: i < entries.length - 1 ? "4px" : "0" }}>
                      <span style={{ fontWeight: "600", color: "#555", marginRight: "6px" }}>
                        {key}:
                      </span>
                      <span style={{ color: "#333" }}>{String(value)}</span>
                    </div>
                  ))}
                </div>
              );
            }
            // If item is a simple value
            return (
              <div 
                key={idx} 
                style={{ 
                  padding: "6px 10px", 
                  background: "#e8f4f8", 
                  borderRadius: "4px",
                  fontSize: "12px"
                }}
              >
                {String(item)}
              </div>
            );
          })}
        </div>
      );
    }

    default:
      // Handle arrays in default case too (for material field or other arrays)
      if (Array.isArray(raw)) {
        if (raw.length === 0) {
          return <span style={{ color: "#999", fontStyle: "italic" }}>Empty</span>;
        }
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {raw.map((item, idx) => {
              // If item is an object, show its values in a readable format
              if (typeof item === "object" && item !== null && !Array.isArray(item)) {
                const entries = Object.entries(item).filter(([k, v]) => v != null && v !== "");
                if (entries.length === 0) {
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        padding: "6px 10px", 
                        background: "#f5f5f5", 
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "#999"
                      }}
                    >
                      Empty item
                    </div>
                  );
                }
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: "8px 12px", 
                      background: "#e8f4f8", 
                      borderRadius: "6px",
                      fontSize: "12px",
                      border: "1px solid #b3d9e6"
                    }}
                  >
                    {entries.map(([key, value], i) => (
                      <div key={i} style={{ marginBottom: i < entries.length - 1 ? "4px" : "0" }}>
                        <span style={{ fontWeight: "600", color: "#555", marginRight: "6px" }}>
                          {key}:
                        </span>
                        <span style={{ color: "#333" }}>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                );
              }
              // If item is a simple value
              return (
                <div 
                  key={idx}
                  style={{ 
                    padding: "6px 10px", 
                    background: "#e3f2fd", 
                    borderRadius: "4px",
                    fontSize: "12px"
                  }}
                >
                  {String(item)}
                </div>
              );
            })}
          </div>
        );
      }
      // Handle objects that are not arrays
      if (typeof raw === "object" && raw !== null) {
        const entries = Object.entries(raw).filter(([k, v]) => v != null && v !== "");
        if (entries.length === 0) {
          return <span style={{ color: "#999", fontStyle: "italic" }}>Empty</span>;
        }
        return (
          <div style={{ 
            padding: "8px 12px", 
            background: "#e8f4f8", 
            borderRadius: "6px",
            fontSize: "12px",
            border: "1px solid #b3d9e6"
          }}>
            {entries.map(([key, value], i) => (
              <div key={i} style={{ marginBottom: i < entries.length - 1 ? "4px" : "0" }}>
                <span style={{ fontWeight: "600", color: "#555", marginRight: "6px" }}>
                  {key}:
                </span>
                <span style={{ color: "#333" }}>
                  {Array.isArray(value) ? `${value.length} items` : String(value)}
                </span>
              </div>
            ))}
          </div>
        );
      }
      return String(raw ?? "");
  }
}
