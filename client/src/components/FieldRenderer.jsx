import { useEffect, useState } from "react";
import { getByPath } from "../utils/objPath";

export default function FieldRenderer({ field, values, onChange }) {
  const { name, label, type, options, api, apiTitle, array, subFields } = field;
  const value = getByPath(values, name) ?? (array ? [] : "");

  const [apiOptions, setApiOptions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadApi() {
      if (!api) return;
      try {
        const res = await fetch(api);
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data.items || data.record || data.data || [];
        if (!mounted) return;
        setApiOptions(list);
      } catch (e) {
        console.warn("Failed to load options", e);
      }
    }
    loadApi();
    return () => (mounted = false);
  }, [api]);

  function change(v) {
    onChange(name, v);
  }

  // helper: choose options (static > api)
  const resolvedOptions =
    Array.isArray(options) && options.length
      ? options
      : apiOptions.map((o) => (apiTitle ? o[apiTitle] ?? o : o));

  // upload helper (image/file)
  async function handleUploadFile(file) {
    if (!field.uploadApi) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(field.uploadApi, { method: "POST", body: fd });
      const json = await res.json();
      const url = json.url || json.data?.url || json.record?.url || json.path;
      if (url) change(url);
    } catch (e) {
      console.error("upload failed", e);
    } finally {
      setUploading(false);
    }
  }

  switch (type) {
    case "textarea":
      return (
        <textarea 
          value={value} 
          onChange={(e) => change(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            minHeight: "100px",
            resize: "vertical",
            width: "100%",
            boxSizing: "border-box",
            fontFamily: "inherit",
            transition: "border-color 0.2s"
          }}
          onFocus={(e) => e.target.style.borderColor = "#007bff"}
          onBlur={(e) => e.target.style.borderColor = "#ddd"}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => change(e.target.valueAsNumber)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            width: "100%",
            boxSizing: "border-box",
            transition: "border-color 0.2s"
          }}
          onFocus={(e) => e.target.style.borderColor = "#007bff"}
          onBlur={(e) => e.target.style.borderColor = "#ddd"}
        />
      );

    case "email":
      return (
        <input
          type="email"
          value={value ?? ""}
          onChange={(e) => change(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            width: "100%",
            boxSizing: "border-box",
            transition: "border-color 0.2s"
          }}
          onFocus={(e) => e.target.style.borderColor = "#007bff"}
          onBlur={(e) => e.target.style.borderColor = "#ddd"}
        />
      );

    case "phone":
      return (
        <input
          type="tel"
          value={value ?? ""}
          onChange={(e) => change(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            width: "100%",
            boxSizing: "border-box",
            transition: "border-color 0.2s"
          }}
          onFocus={(e) => e.target.style.borderColor = "#007bff"}
          onBlur={(e) => e.target.style.borderColor = "#ddd"}
        />
      );

    case "password":
      return (
        <label>
          {label}
          <input
            type="password"
            value={value ?? ""}
            onChange={(e) => change(e.target.value)}
          />
        </label>
      );

    case "boolean":
      return (
        <label>
          {label}
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => change(e.target.checked)}
          />
        </label>
      );

    case "Date":
      return (
        <label>
          {label}
          <input
            type="date"
            value={value ? String(value).split("T")[0] : ""}
            onChange={(e) => change(e.target.value)}
          />
        </label>
      );

    case "Time":
      return (
        <label>
          {label}
          <input
            type="time"
            value={value ?? ""}
            onChange={(e) => change(e.target.value)}
          />
        </label>
      );

    case "DateTime":
      return (
        <label>
          {label}
          <input
            type="datetime-local"
            value={value ?? ""}
            onChange={(e) => change(e.target.value)}
          />
        </label>
      );

    case "dropdown": {
      return (
        <select 
          value={value ?? ""} 
          onChange={(e) => change(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            width: "100%",
            boxSizing: "border-box",
            background: "white",
            cursor: "pointer",
            transition: "border-color 0.2s"
          }}
          onFocus={(e) => e.target.style.borderColor = "#007bff"}
          onBlur={(e) => e.target.style.borderColor = "#ddd"}
        >
          <option value="">— select —</option>
          {resolvedOptions.map((opt, i) =>
            typeof opt === "object" ? (
              <option key={i} value={opt.value ?? opt.id ?? opt[apiTitle]}>
                {opt.label ?? opt[apiTitle] ?? JSON.stringify(opt)}
              </option>
            ) : (
              <option key={i} value={opt}>
                {opt}
              </option>
            )
          )}
        </select>
      );
    }

    case "checkbox": {
      // multi-select when array=true
      if (array || field.array === "true") {
        const selected = Array.isArray(value) ? value : [];
        const opts = resolvedOptions;
        const toggle = (v) => {
          const next = selected.includes(v)
            ? selected.filter((x) => x !== v)
            : [...selected, v];
          change(next);
        };
        return (
          <div>
            <div>{label}</div>
            {opts.map((opt, i) => {
              const v =
                typeof opt === "object"
                  ? opt.value ?? opt[apiTitle] ?? opt.id
                  : opt;
              return (
                <label key={i} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(v)}
                    onChange={() => toggle(v)}
                  />
                  {typeof opt === "object"
                    ? opt.label ?? opt[apiTitle] ?? v
                    : v}
                </label>
              );
            })}
          </div>
        );
      }
      // fallback single checkbox handled as boolean
      return (
        <label>
          {label}
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => change(e.target.checked)}
          />
        </label>
      );
    }

    case "tags": {
      const arr = Array.isArray(value) ? value : [];
      return (
        <div>
          <div>{label}</div>
          <div>
            {arr.map((t, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  padding: 4,
                  margin: 4,
                  border: "1px solid #ccc",
                }}
              >
                {t}{" "}
                <button onClick={() => change(arr.filter((x) => x !== t))}>
                  x
                </button>
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
          />
          <button
            onClick={() => {
              if (!tagInput) return;
              change([...arr, tagInput]);
              setTagInput("");
            }}
          >
            Add
          </button>
        </div>
      );
    }

    case "imageLink":
    case "file": {
      return (
        <div>
          <label>{label}</label>
          <div>
            <input
              type="text"
              value={value ?? ""}
              onChange={(e) => change(e.target.value)}
              placeholder="paste url"
            />
          </div>
          <div>
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadFile(f);
              }}
            />
            {uploading ? <span>Uploading...</span> : null}
          </div>
          {value ? (
            <div style={{ marginTop: 8 }}>
              {type === "imageLink" ? (
                <img src={value} alt="preview" style={{ maxWidth: 180 }} />
              ) : (
                <a href={value}>{value}</a>
              )}
            </div>
          ) : null}
        </div>
      );
    }

    case "subString":
    case "safetychecks":
    case "permitchecklists": {
      const arr = Array.isArray(value) ? value : [];
      function updateItem(idx, key, v) {
        const copy = arr.slice();
        if (!copy[idx]) copy[idx] = {};
        copy[idx][key] = v;
        change(copy);
      }
      function addRow() {
        change([...arr, {}]);
      }
      function removeRow(i) {
        const copy = arr.slice();
        copy.splice(i, 1);
        change(copy);
      }
      return (
        <div>
          <button 
            type="button"
            onClick={addRow}
            style={{
              padding: "8px 16px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer",
              marginBottom: "12px",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => e.target.style.background = "#218838"}
            onMouseOut={(e) => e.target.style.background = "#28a745"}
          >
            + Add Item
          </button>
          {arr.map((row, i) => (
            <div
              key={i}
              style={{ 
                border: "1px solid #e0e0e0", 
                padding: "16px", 
                marginBottom: "12px",
                borderRadius: "6px",
                background: "#fafafa"
              }}
            >
              {subFields?.map((sf) => (
                <div key={sf.field} style={{ marginBottom: "12px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#555"
                  }}>
                    {sf.label}
                  </label>
                  <input
                    value={row[sf.field] ?? ""}
                    onChange={(e) => updateItem(i, sf.field, e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                      width: "100%",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              ))}
              <button 
                type="button"
                onClick={() => removeRow(i)}
                style={{
                  padding: "6px 12px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => e.target.style.background = "#c82333"}
                onMouseOut={(e) => e.target.style.background = "#dc3545"}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      );
    }

    case "geolocation": {
      function getLocation() {
        if (!navigator.geolocation) {
          alert("Geolocation not supported in this browser");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const val = `${latitude},${longitude}`;
            change(val);
          },
          (err) => {
            console.error("Geo error:", err);
            alert("Failed to get location");
          }
        );
      }

      return (
        <div>
          <label>{label}</label>

          {/* Manual override input */}
          <input
            type="text"
            placeholder="lat,lng"
            value={value ?? ""}
            onChange={(e) => change(e.target.value)}
            style={{ width: "100%", marginBottom: 6 }}
          />

          {/* Get location button */}
          <button type="button" onClick={getLocation}>
            Get Location
          </button>

          {/* Show Map Preview */}
          {value && (
            <div style={{ marginTop: 10 }}>
              <iframe
                width="100%"
                height="180"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://www.google.com/maps?q=${value}&output=embed`}
              ></iframe>
            </div>
          )}
        </div>
      );
    }

    default:
      return (
        <input 
          value={value ?? ""} 
          onChange={(e) => change(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            transition: "border-color 0.2s",
            width: "100%",
            boxSizing: "border-box"
          }}
          onFocus={(e) => e.target.style.borderColor = "#007bff"}
          onBlur={(e) => e.target.style.borderColor = "#ddd"}
        />
      );
  }
}


// import { useEffect, useState } from "react";
// import { getByPath } from "../utils/objPath";

// export default function FieldRenderer({ field, values, onChange }) {
//   const { name, label, type, options, api, apiTitle: topApiTitle, array, subFields } = field;
//   const value = getByPath(values, name) ?? (array ? [] : "");

//   const [apiOptions, setApiOptions] = useState([]); // merged from one or more APIs
//   const [uploading, setUploading] = useState(false);
//   const [tagInput, setTagInput] = useState("");

//   useEffect(() => {
//     let mounted = true;
//     // normalize apiSources: [] of { url, apiTitle? }
//     const apiSources = (() => {
//       if (!api) return [];
//       if (typeof api === "string") return [{ url: api, apiTitle: topApiTitle }];
//       if (Array.isArray(api)) {
//         return api.map((entry) => {
//           if (typeof entry === "string") return { url: entry, apiTitle: topApiTitle };
//           // allow object: { url, apiTitle }
//           return { url: entry.url, apiTitle: entry.apiTitle ?? topApiTitle };
//         });
//       }
//       // unexpected type
//       return [];
//     })();

//     if (apiSources.length === 0) {
//       setApiOptions([]);
//       return;
//     }

//     async function loadAll() {
//       try {
//         const allResults = [];

//         // fetch sequentially to avoid too many parallel requests; you can change to Promise.all if desired
//         for (const src of apiSources) {
//           try {
//             const res = await fetch(src.url);
//             if (!res.ok) {
//               console.warn(`API ${src.url} returned ${res.status}`);
//               continue;
//             }
//             const data = await res.json();
//             // try to find array in common shapes
//             let list = [];
//             if (Array.isArray(data)) list = data;
//             else if (Array.isArray(data.items)) list = data.items;
//             else if (data.record && Array.isArray(data.record)) list = data.record;
//             else if (Array.isArray(data.data)) list = data.data;
//             else if (Array.isArray(data.result)) list = data.result;
//             else if (data.record && typeof data.record === "object") {
//               // maybe record contains arrays for named entities; try to pick first array value
//               const arr = Object.values(data.record).find((v) => Array.isArray(v));
//               if (arr) list = arr;
//             }
//             // If still empty but the response is an object not array, push it as single object
//             if (!list.length && data && typeof data === "object" && !Array.isArray(data)) {
//               // If the response is an object with many keys but not arrays, skip to avoid garbage
//               // But if it has top-level fields we might still want to consider it:
//               // ignore by default
//             }

//             // Map each item to a uniform option object:
//             // { value, label, raw }
//             const mapped = (list || []).map((item) => {
//               if (typeof item === "string" || typeof item === "number") {
//                 return { value: String(item), label: String(item), raw: item };
//               }
//               // object: try id/value and apiTitle
//               const val = item.id ?? item.value ?? item._id ?? item.key ?? item[Object.keys(item)[0]];
//               const label =
//                 (src.apiTitle && item[src.apiTitle] !== undefined && String(item[src.apiTitle])) ||
//                 (topApiTitle && item[topApiTitle] !== undefined && String(item[topApiTitle])) ||
//                 item.name ??
//                 item.title ??
//                 item.label ??
//                 (typeof val !== "undefined" ? String(val) : JSON.stringify(item));

//               return { value: val != null ? String(val) : label, label, raw: item };
//             });

//             allResults.push(...mapped);
//           } catch (err) {
//             console.warn("Failed fetching api", src.url, err);
//           }
//         }

//         // dedupe by value (and fallback to label)
//         const dedupMap = new Map();
//         for (const opt of allResults) {
//           const key = opt.value ?? opt.label;
//           if (!dedupMap.has(key)) dedupMap.set(key, opt);
//         }

//         const merged = Array.from(dedupMap.values());

//         if (mounted) setApiOptions(merged);
//       } catch (e) {
//         console.warn("Failed to load options from APIs", e);
//         if (mounted) setApiOptions([]);
//       }
//     }

//     loadAll();

//     return () => {
//       mounted = false;
//     };
//   }, [api, topApiTitle]);

//   function change(v) {
//     onChange(name, v);
//   }

//   // helper: choose options (static > api)
//   const resolvedOptions =
//     Array.isArray(options) && options.length
//       ? // static options can be strings or objects { id, name } etc.
//         options.map((opt) =>
//           typeof opt === "object" ? { value: opt.value ?? opt.id ?? String(opt), label: opt.label ?? opt.name ?? String(opt), raw: opt } : { value: String(opt), label: String(opt), raw: opt }
//         )
//       : apiOptions; // already in {value,label} shape

//   // upload helper (image/file)
//   async function handleUploadFile(file) {
//     if (!field.uploadApi) return;
//     setUploading(true);
//     try {
//       const fd = new FormData();
//       fd.append("file", file);
//       const res = await fetch(field.uploadApi, { method: "POST", body: fd });
//       const json = await res.json();
//       const url = json.url || json.data?.url || json.record?.url || json.path;
//       if (url) change(url);
//     } catch (e) {
//       console.error("upload failed", e);
//     } finally {
//       setUploading(false);
//     }
//   }

//   // ---------- UI switch ----------
//   switch (type) {
//     case "textarea":
//       return (
//         <label>
//           {label}
//           <textarea value={value} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "number":
//       return (
//         <label>
//           {label}
//           <input type="number" value={value ?? ""} onChange={(e) => change(e.target.valueAsNumber)} />
//         </label>
//       );

//     case "email":
//       return (
//         <label>
//           {label}
//           <input type="email" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "phone":
//       return (
//         <label>
//           {label}
//           <input type="tel" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "password":
//       return (
//         <label>
//           {label}
//           <input type="password" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "boolean":
//       return (
//         <label>
//           {label}
//           <input type="checkbox" checked={Boolean(value)} onChange={(e) => change(e.target.checked)} />
//         </label>
//       );

//     case "Date":
//       return (
//         <label>
//           {label}
//           <input type="date" value={value ? String(value).split("T")[0] : ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "Time":
//       return (
//         <label>
//           {label}
//           <input type="time" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "DateTime":
//       return (
//         <label>
//           {label}
//           <input type="datetime-local" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "dropdown": {
//       return (
//         <label>
//           {label}
//           <select value={value ?? ""} onChange={(e) => change(e.target.value)}>
//             <option value="">— select —</option>
//             {resolvedOptions.map((opt, i) =>
//               typeof opt === "object" ? (
//                 <option key={i} value={opt.value}>
//                   {opt.label}
//                 </option>
//               ) : (
//                 <option key={i} value={String(opt)}>
//                   {String(opt)}
//                 </option>
//               )
//             )}
//           </select>
//         </label>
//       );
//     }

//     case "checkbox": {
//       if (array || field.array === "true") {
//         const selected = Array.isArray(value) ? value : [];
//         const opts = resolvedOptions;
//         const toggle = (v) => {
//           const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
//           change(next);
//         };
//         return (
//           <div>
//             <div>{label}</div>
//             {opts.map((opt, i) => {
//               const v = typeof opt === "object" ? opt.value : opt;
//               return (
//                 <label key={i} style={{ display: "block" }}>
//                   <input type="checkbox" checked={selected.includes(v)} onChange={() => toggle(v)} />
//                   {typeof opt === "object" ? opt.label : v}
//                 </label>
//               );
//             })}
//           </div>
//         );
//       }
//       return (
//         <label>
//           {label}
//           <input type="checkbox" checked={Boolean(value)} onChange={(e) => change(e.target.checked)} />
//         </label>
//       );
//     }

//     case "tags": {
//       const arr = Array.isArray(value) ? value : [];
//       return (
//         <div>
//           <div>{label}</div>
//           <div>
//             {arr.map((t, i) => (
//               <span key={i} style={{ display: "inline-block", padding: 4, margin: 4, border: "1px solid #ccc" }}>
//                 {t} <button onClick={() => change(arr.filter((x) => x !== t))}>x</button>
//               </span>
//             ))}
//           </div>
//           <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
//           <button
//             onClick={() => {
//               if (!tagInput) return;
//               change([...arr, tagInput]);
//               setTagInput("");
//             }}
//           >
//             Add
//           </button>
//         </div>
//       );
//     }

//     case "imageLink":
//     case "file": {
//       return (
//         <div>
//           <label>{label}</label>
//           <div>
//             <input type="text" value={value ?? ""} onChange={(e) => change(e.target.value)} placeholder="paste url" />
//           </div>
//           <div>
//             <input
//               type="file"
//               onChange={(e) => {
//                 const f = e.target.files?.[0];
//                 if (f) handleUploadFile(f);
//               }}
//             />
//             {uploading ? <span>Uploading...</span> : null}
//           </div>
//           {value ? (
//             <div style={{ marginTop: 8 }}>{type === "imageLink" ? <img src={value} alt="preview" style={{ maxWidth: 180 }} /> : <a href={value}>{value}</a>}</div>
//           ) : null}
//         </div>
//       );
//     }

//     case "subString":
//     case "safetychecks":
//     case "permitchecklists": {
//       const arr = Array.isArray(value) ? value : [];
//       function updateItem(idx, key, v) {
//         const copy = arr.slice();
//         if (!copy[idx]) copy[idx] = {};
//         copy[idx][key] = v;
//         change(copy);
//       }
//       function addRow() {
//         change([...arr, {}]);
//       }
//       function removeRow(i) {
//         const copy = arr.slice();
//         copy.splice(i, 1);
//         change(copy);
//       }
//       return (
//         <div>
//           <div style={{ fontWeight: "bold" }}>{label}</div>
//           <button onClick={addRow}>Add</button>
//           {arr.map((row, i) => (
//             <div key={i} style={{ border: "1px solid #eee", padding: 8, margin: 8 }}>
//               {subFields?.map((sf) => (
//                 <div key={sf.field}>
//                   <small>{sf.label}</small>
//                   <input value={row[sf.field] ?? ""} onChange={(e) => updateItem(i, sf.field, e.target.value)} />
//                 </div>
//               ))}
//               <button onClick={() => removeRow(i)}>Remove</button>
//             </div>
//           ))}
//         </div>
//       );
//     }

//     case "geolocation": {
//       function getLocation() {
//         if (!navigator.geolocation) {
//           alert("Geolocation not supported in this browser");
//           return;
//         }

//         navigator.geolocation.getCurrentPosition(
//           (pos) => {
//             const { latitude, longitude } = pos.coords;
//             const val = `${latitude},${longitude}`;
//             change(val);
//           },
//           (err) => {
//             console.error("Geo error:", err);
//             alert("Failed to get location");
//           }
//         );
//       }

//       return (
//         <div>
//           <label>{label}</label>

//           <input type="text" placeholder="lat,lng" value={value ?? ""} onChange={(e) => change(e.target.value)} style={{ width: "100%", marginBottom: 6 }} />

//           <button type="button" onClick={getLocation}>
//             Get Location
//           </button>

//           {value && (
//             <div style={{ marginTop: 10 }}>
//               <iframe width="100%" height="180" style={{ border: 0 }} loading="lazy" allowFullScreen src={`https://www.google.com/maps?q=${value}&output=embed`}></iframe>
//             </div>
//           )}
//         </div>
//       );
//     }

//     default:
//       return (
//         <label>
//           {label}
//           <input value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );
//   }
// }

// src/components/FieldRenderer.jsx
// import { useEffect, useState } from "react";
// import { getByPath } from "../utils/objPath";

// /**
//  * FieldRenderer
//  * - supports: textarea, number, email, phone, password, boolean, Date, Time, DateTime
//  * - dropdown (static options OR one/multiple api sources)
//  * - checkbox (single boolean OR multi-array)
//  * - tags, imageLink/file (upload), subString (subFields)
//  * - geolocation (manual input + "Get Location" + map preview)
//  *
//  * Props:
//  *  - field: config object
//  *  - values: object (current form values)
//  *  - onChange: function(name, value)  <-- parent is expected to handle nested paths (setByPath)
//  */
// export default function FieldRenderer({ field, values, onChange }) {
//   const { name, label, type, options, api, apiTitle: topApiTitle, array, subFields } = field;
//   const value = getByPath(values, name) ?? (array ? [] : "");

//   const [apiOptions, setApiOptions] = useState([]); // {value,label,raw}[]
//   const [uploading, setUploading] = useState(false);
//   const [tagInput, setTagInput] = useState("");

//   useEffect(() => {
//     let mounted = true;
//     // normalize api sources: allow string, array of strings, or array of { url, apiTitle }
//     const apiSources = (() => {
//       if (!api) return [];
//       if (typeof api === "string") return [{ url: api, apiTitle: topApiTitle }];
//       if (Array.isArray(api)) {
//         return api.map((entry) => {
//           if (typeof entry === "string") return { url: entry, apiTitle: topApiTitle };
//           return { url: entry.url, apiTitle: entry.apiTitle ?? topApiTitle };
//         });
//       }
//       if (typeof api === "object" && api.url) return [{ url: api.url, apiTitle: api.apiTitle ?? topApiTitle }];
//       return [];
//     })();

//     if (apiSources.length === 0) {
//       setApiOptions([]);
//       return;
//     }

//     async function loadAll() {
//       try {
//         const allResults = [];
//         // sequential fetch - safe
//         for (const src of apiSources) {
//           try {
//             const res = await fetch(src.url);
//             if (!res.ok) {
//               console.warn(`API ${src.url} returned ${res.status}`);
//               continue;
//             }
//             const data = await res.json();

//             // try to find sensible array in response
//             let list = [];
//             if (Array.isArray(data)) list = data;
//             else if (Array.isArray(data.items)) list = data.items;
//             else if (Array.isArray(data.data)) list = data.data;
//             else if (Array.isArray(data.result)) list = data.result;
//             else if (data.record && Array.isArray(data.record)) list = data.record;
//             else if (data.record && typeof data.record === "object") {
//               const arr = Object.values(data.record).find((v) => Array.isArray(v));
//               if (arr) list = arr;
//             }

//             // map to uniform shape { value, label, raw }
//             const mapped = (list || []).map((item) => {
//               if (typeof item === "string" || typeof item === "number") {
//                 return { value: String(item), label: String(item), raw: item };
//               }
//               // object: pick id-like or first field as fallback
//               const val = item.id ?? item.value ?? item._id ?? item.key ?? null;
//               const label =
//                 (src.apiTitle && item[src.apiTitle] !== undefined && String(item[src.apiTitle])) ||
//                 (topApiTitle && item[topApiTitle] !== undefined && String(item[topApiTitle])) ||
//                 item.name ??
//                 item.title ??
//                 item.label ??
//                 (val != null ? String(val) : JSON.stringify(item));
//               return { value: val != null ? String(val) : label, label, raw: item };
//             });

//             allResults.push(...mapped);
//           } catch (err) {
//             console.warn("Failed fetching api", src.url, err);
//           }
//         }

//         // dedupe by value then label
//         const dedup = new Map();
//         for (const o of allResults) {
//           const k = o.value ?? o.label;
//           if (!dedup.has(k)) dedup.set(k, o);
//         }
//         const merged = Array.from(dedup.values());
//         if (mounted) setApiOptions(merged);
//       } catch (e) {
//         console.warn("Failed to load options from APIs", e);
//         if (mounted) setApiOptions([]);
//       }
//     }

//     loadAll();
//     return () => (mounted = false);
//   }, [api, topApiTitle]);

//   function safeOnChange(nm, val) {
//     if (typeof onChange === "function") onChange(nm, val);
//     else console.warn("FieldRenderer: onChange not provided", nm, val);
//   }

//   function change(v) {
//     safeOnChange(name, v);
//   }

//   async function handleUploadFile(file) {
//     if (!field.uploadApi) return;
//     setUploading(true);
//     try {
//       const fd = new FormData();
//       fd.append("file", file);
//       const res = await fetch(field.uploadApi, { method: "POST", body: fd });
//       const json = await res.json();
//       const url = json.url || json.data?.url || json.record?.url || json.path;
//       if (url) change(url);
//     } catch (e) {
//       console.error("upload failed", e);
//     } finally {
//       setUploading(false);
//     }
//   }

//   // resolvedOptions: uniform {value,label,raw}[]
//   const resolvedOptions =
//     Array.isArray(options) && options.length
//       ? options.map((opt) =>
//           typeof opt === "object"
//             ? { value: String(opt.value ?? opt.id ?? opt.key ?? opt[Object.keys(opt)[0]] ?? JSON.stringify(opt)), label: String(opt.label ?? opt.name ?? JSON.stringify(opt)), raw: opt }
//             : { value: String(opt), label: String(opt), raw: opt }
//         )
//       : apiOptions;

//   // ---------- Render by type ----------
//   switch (type) {
//     case "textarea":
//       return (
//         <label>
//           {label}
//           <textarea value={value} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "number":
//       return (
//         <label>
//           {label}
//           <input type="number" value={value ?? ""} onChange={(e) => change(e.target.valueAsNumber)} />
//         </label>
//       );

//     case "email":
//       return (
//         <label>
//           {label}
//           <input type="email" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "phone":
//       return (
//         <label>
//           {label}
//           <input type="tel" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "password":
//       return (
//         <label>
//           {label}
//           <input type="password" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "boolean":
//       return (
//         <label>
//           {label}
//           <input type="checkbox" checked={Boolean(value)} onChange={(e) => change(e.target.checked)} />
//         </label>
//       );

//     case "Date":
//       return (
//         <label>
//           {label}
//           <input type="date" value={value ? String(value).split("T")[0] : ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "Time":
//       return (
//         <label>
//           {label}
//           <input type="time" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "DateTime":
//       return (
//         <label>
//           {label}
//           <input type="datetime-local" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "dropdown": {
//       return (
//         <label>
//           {label}
//           <select value={value ?? ""} onChange={(e) => change(e.target.value)}>
//             <option value="">— select —</option>
//             {resolvedOptions.map((opt, i) => (
//               <option key={i} value={opt.value}>
//                 {opt.label}
//               </option>
//             ))}
//           </select>
//         </label>
//       );
//     }

//     case "checkbox": {
//       // multi-select when array=true
//       if (array || field.array === "true") {
//         const selected = Array.isArray(value) ? value : [];
//         const opts = resolvedOptions;
//         const toggle = (v) => {
//           const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
//           change(next);
//         };
//         return (
//           <div>
//             <div>{label}</div>
//             {opts.map((opt, i) => (
//               <label key={i} style={{ display: "block" }}>
//                 <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} />
//                 {opt.label}
//               </label>
//             ))}
//           </div>
//         );
//       }
//       // fallback single checkbox
//       return (
//         <label>
//           {label}
//           <input type="checkbox" checked={Boolean(value)} onChange={(e) => change(e.target.checked)} />
//         </label>
//       );
//     }

//     case "tags": {
//       const arr = Array.isArray(value) ? value : [];
//       return (
//         <div>
//           <div>{label}</div>
//           <div>
//             {arr.map((t, i) => (
//               <span key={i} style={{ display: "inline-block", padding: 4, margin: 4, border: "1px solid #ccc" }}>
//                 {t} <button type="button" onClick={() => change(arr.filter((x) => x !== t))}>x</button>
//               </span>
//             ))}
//           </div>
//           <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
//           <button type="button" onClick={() => { if (!tagInput) return; change([...arr, tagInput]); setTagInput(""); }}>Add</button>
//         </div>
//       );
//     }

//     case "imageLink":
//     case "file": {
//       return (
//         <div>
//           <label>{label}</label>
//           <div>
//             <input type="text" value={value ?? ""} onChange={(e) => change(e.target.value)} placeholder="paste url" />
//           </div>
//           <div>
//             <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); }} />
//             {uploading ? <span>Uploading...</span> : null}
//           </div>
//           {value ? <div style={{ marginTop: 8 }}>{type === "imageLink" ? <img src={value} alt="preview" style={{ maxWidth: 180 }} /> : <a href={value}>{value}</a>}</div> : null}
//         </div>
//       );
//     }

//     case "subString":
//     case "safetychecks":
//     case "permitchecklists": {
//       // subRows is an array of objects; each subField can be any type supported (we render FieldRenderer recursively)
//       const arr = Array.isArray(value) ? value : [];

//       function updateItem(idx, key, v) {
//         const copy = arr.slice();
//         if (!copy[idx]) copy[idx] = {};
//         copy[idx][key] = v;
//         change(copy);
//       }
//       function addRow() {
//         change([...arr, {}]);
//       }
//       function removeRow(i) {
//         const copy = arr.slice();
//         copy.splice(i, 1);
//         change(copy);
//       }

//       return (
//         <div>
//           <div style={{ fontWeight: "bold", marginBottom: 6 }}>{label}</div>
//           <button type="button" onClick={addRow}>Add</button>

//           {arr.map((row, i) => (
//             <div key={i} style={{ border: "1px solid #eee", padding: 8, margin: 8 }}>
//               {(subFields || []).map((sf) => {
//                 // for nesting we construct a temporary values object that points to the sub-row for FieldRenderer to read current value
//                 const tempValues = { [sf.field]: row[sf.field] ?? "" };
//                 return (
//                   <div key={sf.field} style={{ marginBottom: 8 }}>
//                     <label style={{ fontWeight: 600 }}>{sf.label}</label>
//                     {/* Render subfield using FieldRenderer but intercept onChange to update the row */}
//                     <FieldRenderer
//                       field={sf}
//                       values={tempValues}
//                       onChange={(subName, val) => {
//                         // subName is expected to be the simple field key inside sub-row (sf.field). We update row accordingly.
//                         updateItem(i, sf.field, val);
//                       }}
//                     />
//                   </div>
//                 );
//               })}
//               <div>
//                 <button type="button" onClick={() => removeRow(i)}>Remove</button>
//               </div>
//             </div>
//           ))}
//         </div>
//       );
//     }

//     case "geolocation": {
//       function getLocation() {
//         if (!navigator.geolocation) {
//           alert("Geolocation not supported in this browser");
//           return;
//         }
//         navigator.geolocation.getCurrentPosition(
//           (pos) => {
//             const { latitude, longitude } = pos.coords;
//             const val = `${latitude},${longitude}`;
//             change(val);
//           },
//           (err) => {
//             console.error("Geo error:", err);
//             alert("Failed to get location");
//           }
//         );
//       }

//       return (
//         <div>
//           <label>{label}</label>
//           <input type="text" placeholder="lat,lng" value={value ?? ""} onChange={(e) => change(e.target.value)} style={{ width: "100%", marginBottom: 6 }} />
//           <button type="button" onClick={getLocation}>Get Location</button>
//           {value && (
//             <div style={{ marginTop: 10 }}>
//               <iframe width="100%" height="180" style={{ border: 0 }} loading="lazy" allowFullScreen
//                 src={`https://www.google.com/maps?q=${encodeURIComponent(value)}&output=embed`}></iframe>
//             </div>
//           )}
//         </div>
//       );
//     }

//     default:
//       return (
//         <label>
//           {label}
//           <input value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );
//   }
// }

// // src/components/FieldRenderer.jsx
// import { useEffect, useState } from "react";
// import { getByPath } from "../utils/objPath";

// export default function FieldRenderer({ field, values, onChange }) {
//   const { name, label, type, options, api, apiTitle: topApiTitle, array, subFields } = field;
//   const value = getByPath(values, name) ?? (array ? [] : "");

//   const [apiOptions, setApiOptions] = useState([]); // merged from one or more APIs
//   const [uploading, setUploading] = useState(false);
//   const [tagInput, setTagInput] = useState("");

//   // ---- safe onChange wrapper ----
//   function safeOnChange(nm, val) {
//     if (typeof onChange === "function") onChange(nm, val);
//     else console.warn("FieldRenderer: onChange not provided", nm, val);
//   }

//   useEffect(() => {
//     let mounted = true;
//     // normalize apiSources: [] of { url, apiTitle? }
//     const apiSources = (() => {
//       if (!api) return [];
//       if (typeof api === "string") return [{ url: api, apiTitle: topApiTitle }];
//       if (Array.isArray(api)) {
//         return api.map((entry) => {
//           if (typeof entry === "string") return { url: entry, apiTitle: topApiTitle };
//           // allow object: { url, apiTitle }
//           return { url: entry.url, apiTitle: entry.apiTitle ?? topApiTitle };
//         });
//       }
//       // unexpected type
//       return [];
//     })();

//     if (apiSources.length === 0) {
//       setApiOptions([]);
//       return;
//     }

//     async function loadAll() {
//       try {
//         const allResults = [];

//         // fetch sequentially to avoid too many parallel requests; you can change to Promise.all if desired
//         for (const src of apiSources) {
//           try {
//             const res = await fetch(src.url);
//             if (!res.ok) {
//               console.warn(`API ${src.url} returned ${res.status}`);
//               continue;
//             }
//             const data = await res.json();
//             // try to find array in common shapes
//             let list = [];
//             if (Array.isArray(data)) list = data;
//             else if (Array.isArray(data.items)) list = data.items;
//             else if (data.record && Array.isArray(data.record)) list = data.record;
//             else if (Array.isArray(data.data)) list = data.data;
//             else if (Array.isArray(data.result)) list = data.result;
//             else if (data.record && typeof data.record === "object") {
//               const arr = Object.values(data.record).find((v) => Array.isArray(v));
//               if (arr) list = arr;
//             }

//             // Map each item to a uniform option object:
//             // { value, label, raw }
//             const mapped = (list || []).map((item) => {
//               if (typeof item === "string" || typeof item === "number") {
//                 return { value: String(item), label: String(item), raw: item };
//               }
//               // object: try id/value and apiTitle
//               const val = item.id ?? item.value ?? item._id ?? item.key ?? item[Object.keys(item)[0]];
//               const labelResolved =
//                 (src.apiTitle && item[src.apiTitle] !== undefined && String(item[src.apiTitle])) ||
//                 (topApiTitle && item[topApiTitle] !== undefined && String(item[topApiTitle])) ||
//                 item.name ??
//                 item.title ??
//                 item.label ??
//                 (typeof val !== "undefined" ? String(val) : JSON.stringify(item));

//               return { value: val != null ? String(val) : labelResolved, label: labelResolved, raw: item };
//             });

//             allResults.push(...mapped);
//           } catch (err) {
//             console.warn("Failed fetching api", src.url, err);
//           }
//         }

//         // dedupe by value (and fallback to label)
//         const dedupMap = new Map();
//         for (const opt of allResults) {
//           const key = opt.value ?? opt.label;
//           if (!dedupMap.has(key)) dedupMap.set(key, opt);
//         }

//         const merged = Array.from(dedupMap.values());

//         if (mounted) setApiOptions(merged);
//       } catch (e) {
//         console.warn("Failed to load options from APIs", e);
//         if (mounted) setApiOptions([]);
//       }
//     }

//     loadAll();

//     return () => {
//       mounted = false;
//     };
//   }, [api, topApiTitle]);

//   // change helper uses safeOnChange
//   function change(v) {
//     safeOnChange(name, v);
//   }

//   // helper: choose options (static > api)
//   const resolvedOptions =
//     Array.isArray(options) && options.length
//       ? // static options can be strings or objects { id, name } etc.
//         options.map((opt) =>
//           typeof opt === "object" ? { value: opt.value ?? opt.id ?? String(opt), label: opt.label ?? opt.name ?? String(opt), raw: opt } : { value: String(opt), label: String(opt), raw: opt }
//         )
//       : apiOptions; // already in {value,label} shape

//   // upload helper (image/file)
//   async function handleUploadFile(file) {
//     if (!field.uploadApi) {
//       console.warn("uploadApi not provided for file upload");
//       return;
//     }
//     setUploading(true);
//     try {
//       const fd = new FormData();
//       fd.append("file", file);
//       const res = await fetch(field.uploadApi, { method: "POST", body: fd });
//       const json = await res.json();
//       const url = json.url || json.data?.url || json.record?.url || json.path;
//       if (url) change(url);
//     } catch (e) {
//       console.error("upload failed", e);
//     } finally {
//       setUploading(false);
//     }
//   }

//   // ---------- UI switch ----------
//   switch (type) {
//     case "textarea":
//       return (
//         <label>
//           {label}
//           <textarea value={value} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "number":
//       return (
//         <label>
//           {label}
//           <input type="number" value={value ?? ""} onChange={(e) => change(e.target.valueAsNumber)} />
//         </label>
//       );

//     case "email":
//       return (
//         <label>
//           {label}
//           <input type="email" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "phone":
//       return (
//         <label>
//           {label}
//           <input type="tel" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "password":
//       return (
//         <label>
//           {label}
//           <input type="password" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "boolean":
//       return (
//         <label>
//           {label}
//           <input type="checkbox" checked={Boolean(value)} onChange={(e) => change(e.target.checked)} />
//         </label>
//       );

//     case "Date":
//       return (
//         <label>
//           {label}
//           <input type="date" value={value ? String(value).split("T")[0] : ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "Time":
//       return (
//         <label>
//           {label}
//           <input type="time" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "DateTime":
//       return (
//         <label>
//           {label}
//           <input type="datetime-local" value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );

//     case "dropdown": {
//       return (
//         <label>
//           {label}
//           <select value={value ?? ""} onChange={(e) => change(e.target.value)}>
//             <option value="">— select —</option>
//             {resolvedOptions.map((opt, i) =>
//               typeof opt === "object" ? (
//                 <option key={i} value={opt.value}>
//                   {opt.label}
//                 </option>
//               ) : (
//                 <option key={i} value={String(opt)}>
//                   {String(opt)}
//                 </option>
//               )
//             )}
//           </select>
//         </label>
//       );
//     }

//     case "checkbox": {
//       if (array || field.array === "true") {
//         const selected = Array.isArray(value) ? value : [];
//         const opts = resolvedOptions;
//         const toggle = (v) => {
//           const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
//           change(next);
//         };
//         return (
//           <div>
//             <div>{label}</div>
//             {opts.map((opt, i) => {
//               const v = typeof opt === "object" ? opt.value : opt;
//               return (
//                 <label key={i} style={{ display: "block" }}>
//                   <input type="checkbox" checked={selected.includes(v)} onChange={() => toggle(v)} />
//                   {typeof opt === "object" ? opt.label : v}
//                 </label>
//               );
//             })}
//           </div>
//         );
//       }
//       return (
//         <label>
//           {label}
//           <input type="checkbox" checked={Boolean(value)} onChange={(e) => change(e.target.checked)} />
//         </label>
//       );
//     }

//     case "tags": {
//       const arr = Array.isArray(value) ? value : [];
//       return (
//         <div>
//           <div>{label}</div>
//           <div>
//             {arr.map((t, i) => (
//               <span key={i} style={{ display: "inline-block", padding: 4, margin: 4, border: "1px solid #ccc" }}>
//                 {t} <button type="button" onClick={() => change(arr.filter((x) => x !== t))}>x</button>
//               </span>
//             ))}
//           </div>
//           <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
//           <button type="button" onClick={() => {
//               if (!tagInput) return;
//               change([...arr, tagInput]);
//               setTagInput("");
//             }}>
//             Add
//           </button>
//         </div>
//       );
//     }

//     case "imageLink":
//     case "file": {
//       return (
//         <div>
//           <label>{label}</label>
//           <div>
//             <input type="text" value={value ?? ""} onChange={(e) => change(e.target.value)} placeholder="paste url" />
//           </div>
//           <div>
//             <input
//               type="file"
//               onChange={(e) => {
//                 const f = e.target.files?.[0];
//                 if (f) handleUploadFile(f);
//               }}
//             />
//             {uploading ? <span>Uploading...</span> : null}
//           </div>
//           {value ? (
//             <div style={{ marginTop: 8 }}>{type === "imageLink" ? <img src={value} alt="preview" style={{ maxWidth: 180 }} /> : <a href={value}>{value}</a>}</div>
//           ) : null}
//         </div>
//       );
//     }

//     case "subString":
//     case "safetychecks":
//     case "permitchecklists": {
//       const arr = Array.isArray(value) ? value : [];
//       function updateItem(idx, key, v) {
//         const copy = arr.slice();
//         if (!copy[idx]) copy[idx] = {};
//         copy[idx][key] = v;
//         change(copy);
//       }
//       function addRow() {
//         change([...arr, {}]);
//       }
//       function removeRow(i) {
//         const copy = arr.slice();
//         copy.splice(i, 1);
//         change(copy);
//       }
//       return (
//         <div>
//           <div style={{ fontWeight: "bold" }}>{label}</div>
//           <button type="button" onClick={addRow}>Add</button>
//           {arr.map((row, i) => (
//             <div key={i} style={{ border: "1px solid #eee", padding: 8, margin: 8 }}>
//               {subFields?.map((sf) => (
//                 <div key={sf.field}>
//                   <small>{sf.label}</small>
//                   <input value={row[sf.field] ?? ""} onChange={(e) => updateItem(i, sf.field, e.target.value)} />
//                 </div>
//               ))}
//               <button type="button" onClick={() => removeRow(i)}>Remove</button>
//             </div>
//           ))}
//         </div>
//       );
//     }

//     case "geolocation": {
//       function getLocation() {
//         if (!navigator.geolocation) {
//           alert("Geolocation not supported in this browser");
//           return;
//         }

//         navigator.geolocation.getCurrentPosition(
//           (pos) => {
//             const { latitude, longitude } = pos.coords;
//             const val = `${latitude},${longitude}`;
//             change(val);
//           },
//           (err) => {
//             console.error("Geo error:", err);
//             alert("Failed to get location");
//           }
//         );
//       }

//       return (
//         <div>
//           <label>{label}</label>

//           <input type="text" placeholder="lat,lng" value={value ?? ""} onChange={(e) => change(e.target.value)} style={{ width: "100%", marginBottom: 6 }} />

//           <button type="button" onClick={getLocation}>
//             Get Location
//           </button>

//           {value && (
//             <div style={{ marginTop: 10 }}>
//               <iframe width="100%" height="180" style={{ border: 0 }} loading="lazy" allowFullScreen src={`https://www.google.com/maps?q=${value}&output=embed`}></iframe>
//             </div>
//           )}
//         </div>
//       );
//     }

//     default:
//       return (
//         <label>
//           {label}
//           <input value={value ?? ""} onChange={(e) => change(e.target.value)} />
//         </label>
//       );
//   }
// }