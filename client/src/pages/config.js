const CONFIG_URL =
  import.meta.env.VITE_CONFIG_URL ||
  "https://api.jsonbin.io/v3/b/69411118d0ea881f402cbde2/latest";

async function loadEntityConfig(entityKey, setStatus) {
  try {
    setStatus?.(`Loading ${entityKey} config...`);

    const res = await fetch(CONFIG_URL);
    const raw = await res.json();

    // Recursively unwrap wrappers until we locate the entity map
    function findRoot(obj) {
      if (!obj || typeof obj !== "object") return null;
      if (obj[entityKey] || (obj.config && obj.config[entityKey])) return obj;
      if (obj.record) return findRoot(obj.record);
      if (obj.data) return findRoot(obj.data);
      for (const v of Object.values(obj)) {
        if (typeof v === "object") {
          const found = findRoot(v);
          if (found) return found;
        }
      }
      return null;
    }

    const root = findRoot(raw) || raw.record || raw.data?.record || raw.data || raw;
    const entityDef = root[entityKey] || root.config?.[entityKey];
    if (!entityDef) {
      throw new Error(`${entityKey} config not found in JSON`);
    }

    // Prefer frontend block if present
    const cfg = entityDef.frontend || entityDef.config || entityDef;

    // form ke liye initial values
    const initialForm = {};
    (cfg.fields || []).forEach((f) => {
      if (f.type === "checkbox" && !f.array && f.array !== "true") {
        initialForm[f.name] = false;
      } else if (f.type === "checkbox" && (f.array || f.array === "true")) {
        initialForm[f.name] = [];
      } else if (f.type === "subString" || f.type === "safetychecks" || f.type === "permitchecklists" || (f.array || f.array === "true")) {
        initialForm[f.name] = [];
      } else {
        initialForm[f.name] = "";
      }
    });

    setStatus?.("Config loaded");
    return { config: cfg, initialForm };
  } catch (err) {
    console.error(err);
    setStatus?.("Failed to load config: " + err.message);
    throw err;
  }
}
export { loadEntityConfig };