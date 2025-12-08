export default function EntityTable({ columns, data, onEdit, onDelete }) {
  return (
    <table
      style={{
        borderCollapse: "collapse",
        width: "100%",
        marginTop: "20px"
      }}
    >
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.accessor}
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                background: "#f5f5f5",
                textAlign: "left"
              }}
            >
              {col.header}
            </th>
          ))}
          {(onEdit || onDelete) && (
            <th
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                background: "#f5f5f5"
              }}
            >
              Actions
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id || row.orderId || row.code}>
            {columns.map((col) => (
              <td
                key={col.accessor}
                style={{
                  border: "1px solid #eee",
                  padding: "8px"
                }}
              >
                {row[col.accessor]}
              </td>
            ))}
            {(onEdit || onDelete) && (
              <td
                style={{
                  border: "1px solid #eee",
                  padding: "8px"
                }}
              >
                <div style={{ display: "flex", gap: "8px" }}>
                  {onEdit && (
                    <button onClick={() => onEdit(row)}>Edit</button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(row)}
                      style={{
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        padding: "4px 8px",
                        cursor: "pointer",
                        borderRadius: "4px"
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
