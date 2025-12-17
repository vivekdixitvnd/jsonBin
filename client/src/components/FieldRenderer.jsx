import { useEffect, useState } from "react";
import { getByPath } from "../utils/objPath";

export default function FieldRenderer({ field, values, onChange }) {
  const { name, label, type, options, api, apiTitle, array, subFields } = field;
  const value = getByPath(values, name) ?? (array ? [] : "");

  console.log(`📌 [FieldRenderer] Mounted: name="${name}", type="${type}", hasSubFields=${!!subFields}, subFieldsCount=${subFields?.length || 0}`);
  if (subFields && subFields.length > 0) {
    console.log(`   📌 [FieldRenderer] subFields details:`, subFields.map(sf => ({ field: sf.field, label: sf.label, hasApi: !!sf.api, api: sf.api })));
  }

  const [apiOptions, setApiOptions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [subFieldApiOptions, setSubFieldApiOptions] = useState({});

  // Resolve API path to full URL using VITE_API_URL or window.location.origin
  function resolveApiUrl(apiPath) {
    if (!apiPath) return apiPath;
    try {
      const viteApi = import.meta.env.VITE_API_URL || "";
      const serverOrigin = (viteApi || window.location.origin).replace(/\/api\/?$/, "").replace(/\/$/, "");
      if (/^https?:\/\//i.test(apiPath)) return apiPath;
      if (apiPath.startsWith("/")) return serverOrigin + apiPath;
      return serverOrigin + "/" + apiPath;
    } catch (e) {
      // fallback: return original
      return apiPath;
    }
  }
  // Function to save fetched data to the same API endpoint
  async function saveToDatabase(items, apiUrl) {
    if (!apiUrl || !Array.isArray(items) || items.length === 0) {
      console.log("⚠️ saveToDatabase: No items to save or invalid API URL");
      return;
    }

    setSaving(true);
    try {
      const resolvedApi = resolveApiUrl(apiUrl);
      console.log(`🔍 Checking existing items in ${resolvedApi}...`);
      // First, fetch existing items from the API to check for duplicates
      const existingRes = await fetch(resolvedApi);
      let existingItems = [];
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        existingItems = Array.isArray(existingData)
          ? existingData
          : existingData.items || existingData.record || existingData.data || [];
        console.log(`📋 Found ${existingItems.length} existing items`);
      } else {
        console.warn(`⚠️ Failed to fetch existing items: ${existingRes.status}`);
      }

      // Create a set of existing identifiers for quick lookup
      const existingIds = new Set();
      const existingNames = new Set();
      const existingEmails = new Set();
      
      existingItems.forEach(item => {
        if (item.id) existingIds.add(String(item.id));
        if (item._id) existingIds.add(String(item._id));
        if (item.name) existingNames.add(String(item.name).toLowerCase());
        if (item.email) existingEmails.add(String(item.email).toLowerCase());
        if (item.emailId) existingEmails.add(String(item.emailId).toLowerCase());
      });

      // Save each item that doesn't already exist
      let savedCount = 0;
      let skippedCount = 0;
      for (const item of items) {
        // Check if item already exists
        const itemId = String(item.id || item._id || item.userId || "");
        const itemName = item.name || "";
        const itemEmail = item.email || item.emailId || "";
        
        const exists = 
          (itemId && existingIds.has(itemId)) ||
          (itemName && existingNames.has(String(itemName).toLowerCase())) ||
          (itemEmail && existingEmails.has(String(itemEmail).toLowerCase()));

        if (!exists) {
          try {
            console.log(`💾 Saving item:`, item);
            // Save to the same API endpoint using POST
            const saveRes = await fetch(resolvedApi, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item),
            });
            
            if (saveRes.ok) {
              savedCount++;
              const saved = await saveRes.json();
              console.log(`✅ Saved item successfully:`, saved);
              // Add to existing set to avoid duplicate saves in same batch
              if (saved.id) existingIds.add(String(saved.id));
              if (saved._id) existingIds.add(String(saved._id));
              if (saved.name) existingNames.add(String(saved.name).toLowerCase());
              if (saved.email) existingEmails.add(String(saved.email).toLowerCase());
              if (saved.emailId) existingEmails.add(String(saved.emailId).toLowerCase());
            } else {
              const errorData = await saveRes.json().catch(() => ({}));
              console.error(`❌ Failed to save item:`, errorData);
              // If it's a duplicate error, skip it
              if (saveRes.status !== 400 && saveRes.status !== 409) {
                console.warn(`⚠️ Save failed with status ${saveRes.status}:`, errorData);
              } else {
                skippedCount++;
              }
            }
          } catch (err) {
            console.error(`❌ Error saving item to ${apiUrl}:`, err);
          }
        } else {
          skippedCount++;
          console.log(`⏭️ Skipping duplicate item:`, item);
        }
      }

      if (savedCount > 0) {
        console.log(`✅ Successfully saved ${savedCount} new items to ${resolvedApi}`);
      }
      if (skippedCount > 0) {
        console.log(`⏭️ Skipped ${skippedCount} duplicate items`);
      }
      if (savedCount === 0 && skippedCount === 0) {
        console.log(`ℹ️ No items were saved (all were duplicates or failed)`);
      }
    } catch (err) {
      console.error("❌ Error in saveToDatabase:", err);
    } finally {
      setSaving(false);
    }
  }

  // Load API data for subFields in subString/safetychecks/permitchecklists
  async function loadSubFieldApi(subFieldConfig, fieldName) {
    console.log(`🔵 [loadSubFieldApi] Called for field="${fieldName}", hasApi=${!!subFieldConfig?.api}, api="${subFieldConfig?.api}"`);
    if (!subFieldConfig?.api) {
      console.debug(`ℹ️ No API for subField "${fieldName}"`);
      return;
    }
    try {
      const subApiUrl = resolveApiUrl(subFieldConfig.api);
      console.log(`🔄 [subString] Fetching API for subField "${fieldName}": ${subApiUrl}`);
      const res = await fetch(subApiUrl);
      if (!res.ok) {
        console.warn(`⚠️ [subString] API response not OK: ${res.status}`);
        // ensure we set an empty array so render knows we've attempted the call
        setSubFieldApiOptions((prev) => ({ ...prev, [fieldName]: [] }));
        return;
      }
      const data = await res.json();
      console.log(`🟢 [subString] API response data:`, data);
      const list = Array.isArray(data) ? data : data.items || data.record || data.data || [];
      console.log(`📊 [subString] Fetched ${list.length} items for "${fieldName}":`, list);
        console.log(`🔴 [subString] Setting subFieldApiOptions[${fieldName}] = `, list);
      setSubFieldApiOptions((prev) => {
        const updated = { ...prev, [fieldName]: list };
        console.log(`🔴 [subString] Updated subFieldApiOptions state:`, updated);
        return updated;
      });
      console.log(`✅ [subString] SubField options loaded (NOT saving - only for dropdown display)`);
    } catch (err) {
      console.error(`❌ [subString] Failed to load API for "${fieldName}":`, err);
      // ensure component renders a dropdown (even if empty) so user can add items
      setSubFieldApiOptions((prev) => ({ ...prev, [fieldName]: [] }));
    }
  }

  useEffect(() => {
    console.log(`🟣 [useEffect subFields] Running: name="${name}", subFields=${subFields?.length || 0}`);
    console.log(`  Current subFieldApiOptions:`, subFieldApiOptions);
    if (!subFields || subFields.length === 0) {
      console.log(`⚪ [useEffect subFields] Skipping - no subFields`);
      return;
    }
    console.debug(`🔍 [subString] Loading subField APIs for "${name}"...`);
    subFields.forEach((sf) => {
      console.log(`  📋 subField: field="${sf.field}", api="${sf.api}", apiTitle="${sf.apiTitle}"`);
      if (sf.api) {
        console.log(`  🔵 Calling loadSubFieldApi for "${sf.field}"`);
        loadSubFieldApi(sf, sf.field);
      }
    });
  }, [name, subFields]);

  useEffect(() => {
    let mounted = true;
    async function loadApi() {
      if (!api || type !== "dropdown") return;
      try {
        const apiUrl = resolveApiUrl(api);
        console.log(`🔄 Fetching data from API: ${apiUrl}`);
        // Fetch data from resolved API URL
        const res = await fetch(apiUrl);
        if (!res.ok) {
          console.warn(`⚠️ API response not OK: ${res.status} ${res.statusText}`);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data.items || data.record || data.data || [];
        if (!mounted) return;
        
        console.log(`📊 Fetched ${list.length} items from ${apiUrl}`);
        setApiOptions(list);

        // Save fetched data to the same API endpoint (use resolved URL)
        if (list.length > 0) {
          console.log(`💾 Saving ${list.length} items to ${apiUrl}...`);
          await saveToDatabase(list, apiUrl);
        } else {
          console.log(`ℹ️ No data to save (empty array from ${apiUrl})`);
          console.log(`💡 Tip: Create a user to automatically add data to materials collection`);
        }
      } catch (e) {
        console.error("❌ Failed to load options from API:", e);
        console.error("API URL:", api);
      }
    }
    loadApi();
    return () => (mounted = false);
  }, [api, type]);

  function change(v) {
    onChange(name, v);
  }

  // helper: choose options (static > api)
  const resolvedOptions =
    Array.isArray(options) && options.length
      ? options
      : apiOptions.map((o) => {
          // Keep objects intact for dropdown rendering
          if (typeof o === "object" && o !== null) {
            return {
              value: o.id ?? o.value ?? o._id ?? o.userId ?? o[apiTitle],
              label: apiTitle ? (o[apiTitle] ?? o.name ?? o.label ?? JSON.stringify(o)) : (o.name ?? o.label ?? JSON.stringify(o)),
              raw: o
            };
          }
          return o;
        });

  // upload helper (image/file)
  async function handleUploadFile(file) {
    // allow default upload endpoint when not provided in field config
    const uploadPath = field.uploadApi || "/api/upload";
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const viteApi = import.meta.env.VITE_API_URL || "";
      // derive server origin (strip any trailing /api)
      const serverOrigin = (viteApi || window.location.origin).replace(/\/api\/?$/, "").replace(/\/$/, "");

      const uploadUrl = /^https?:\/\//i.test(uploadPath)
        ? uploadPath
        : uploadPath.startsWith("/")
        ? serverOrigin + uploadPath
        : serverOrigin + "/" + uploadPath;

      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));

      let url = json.url || json.data?.url || json.record?.url || json.path;
      if (url) {
        // server might return "/public/uploads/.." — normalize to served path
        if (url.startsWith("/public/")) url = url.replace(/^\/public/, "");

        if (!/^https?:\/\//i.test(url)) {
          url = url.startsWith("/") ? serverOrigin + url : serverOrigin + "/" + url;
        }
        change(url);
      } else {
        console.warn("Upload succeeded but no url returned", json);
      }
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
// plain password type fo rdecryption in the frontend
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
        <div style={{ position: "relative", width: "100%" }}>
          <select 
            value={value ?? ""} 
            onChange={(e) => change(e.target.value)}
            disabled={saving}
            style={{
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              width: "100%",
              boxSizing: "border-box",
              background: saving ? "#f5f5f5" : "white",
              cursor: saving ? "not-allowed" : "pointer",
              transition: "border-color 0.2s",
              opacity: saving ? 0.7 : 1
            }}
            onFocus={(e) => e.target.style.borderColor = "#007bff"}
            onBlur={(e) => e.target.style.borderColor = "#ddd"}
          >
            <option value="">— select —</option>
            {resolvedOptions.map((opt, i) => {
              if (typeof opt === "object" && opt !== null) {
                const optValue = opt.value ?? opt.id ?? opt._id ?? opt.userId ?? (apiTitle ? opt[apiTitle] : "");
                const optLabel = opt.label ?? opt.name ?? (apiTitle ? opt[apiTitle] : JSON.stringify(opt));
                return (
                  <option key={i} value={optValue ?? ""}>
                    {optLabel}
                  </option>
                );
              }
              return (
                <option key={i} value={String(opt)}>
                  {String(opt)}
                </option>
              );
            })}
          </select>
          {saving && (
            <div style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "12px",
              color: "#007bff"
            }}>
              Saving...
            </div>
          )}
        </div>
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
                <button type="button" onClick={() => change(arr.filter((x) => x !== t))}>
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
            type="button"
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
    case "imagelink":
    case "image":
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

    case "subString": {
      const arr = Array.isArray(value) ? value : [];
      function updateItem(idx, key, v) {
        console.log(`📝 [subString] Updated row[${idx}].${key} = ${v}`);
        const copy = arr.slice();
        if (!copy[idx]) copy[idx] = {};
        copy[idx][key] = v;
        change(copy);
      }
      function addRow() {
        console.log(`➕ [subString] Adding new row to "${name}"`);
        change([...arr, {}]);
      }
      function removeRow(i) {
        console.log(`❌ [subString] Removing row ${i} from "${name}"`);
        const copy = arr.slice();
        copy.splice(i, 1);
        change(copy);
      }
      return (
        <div>
          <button type="button" onClick={addRow} style={{ padding: "8px 16px", background: "#28a745", color: "white", border: "none", borderRadius: "6px", fontSize: "14px", cursor: "pointer", marginBottom: "12px" }} onMouseOver={(e) => e.target.style.background = "#218838"} onMouseOut={(e) => e.target.style.background = "#28a745"}>+ Add Item</button>
          {arr.map((row, i) => (
            <div key={i} style={{ border: "1px solid #e0e0e0", padding: "16px", marginBottom: "12px", borderRadius: "6px", background: "#fafafa" }}>
              {subFields?.map((sf) => {
                // Render subField using the same FieldRenderer so it behaves identical
                // Build a nested name path: parentName.index.field
                const nestedName = `${name}.${i}.${sf.field}`;
                const nestedField = { ...sf, name: nestedName };
                return (
                  <div key={nestedName} style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#555" }}>{sf.label}</label>
                    <FieldRenderer field={nestedField} values={values} onChange={onChange} />
                  </div>
                );
              })}
              <button type="button" onClick={() => removeRow(i)} style={{ padding: "6px 12px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", fontSize: "13px", cursor: "pointer" }} onMouseOver={(e) => e.target.style.background = "#c82333"} onMouseOut={(e) => e.target.style.background = "#dc3545"}>Remove</button>
            </div>
          ))}
        </div>
      );
    }

    case "safetychecks": {
      // Safety checks: render boolean checkboxes for each subField
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
          <button type="button" onClick={addRow} style={{ padding: "8px 16px", background: "#28a745", color: "white", border: "none", borderRadius: "6px", fontSize: "14px", cursor: "pointer", marginBottom: "12px" }} onMouseOver={(e) => e.target.style.background = "#218838"} onMouseOut={(e) => e.target.style.background = "#28a745"}>+ Add Item</button>
          {arr.map((row, i) => (
            <div key={i} style={{ border: "1px solid #e0e0e0", padding: "16px", marginBottom: "12px", borderRadius: "6px", background: "#fafafa" }}>
              {subFields?.map((sf) => (
                <div key={sf.field} style={{ marginBottom: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={Boolean(row[sf.field])} onChange={(e) => updateItem(i, sf.field, e.target.checked)} />
                    <span style={{ fontSize: "13px", color: "#555" }}>{sf.label}</span>
                  </label>
                </div>
              ))}
              <button type="button" onClick={() => removeRow(i)} style={{ padding: "6px 12px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", fontSize: "13px", cursor: "pointer" }} onMouseOver={(e) => e.target.style.background = "#c82333"} onMouseOut={(e) => e.target.style.background = "#dc3545"}>Remove</button>
            </div>
          ))}
        </div>
      );
    }

    case "permitchecklists": {
      // Permit checklists: render Yes/No select for each subField
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
          <button type="button" onClick={addRow} style={{ padding: "8px 16px", background: "#28a745", color: "white", border: "none", borderRadius: "6px", fontSize: "14px", cursor: "pointer", marginBottom: "12px" }} onMouseOver={(e) => e.target.style.background = "#218838"} onMouseOut={(e) => e.target.style.background = "#28a745"}>+ Add Item</button>
          {arr.map((row, i) => (
            <div key={i} style={{ border: "1px solid #e0e0e0", padding: "16px", marginBottom: "12px", borderRadius: "6px", background: "#fafafa" }}>
              {subFields?.map((sf) => (
                <div key={sf.field} style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#555" }}>{sf.label}</label>
                  <select value={row[sf.field] ?? ""} onChange={(e) => updateItem(i, sf.field, e.target.value)} style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px", width: "100%", boxSizing: "border-box" }}>
                    <option value="">— select —</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              ))}
              <button type="button" onClick={() => removeRow(i)} style={{ padding: "6px 12px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", fontSize: "13px", cursor: "pointer" }} onMouseOver={(e) => e.target.style.background = "#c82333"} onMouseOut={(e) => e.target.style.background = "#dc3545"}>Remove</button>
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


