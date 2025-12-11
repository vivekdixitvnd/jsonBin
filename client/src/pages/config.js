const CONFIG_URL =
  "https://api.jsonbin.io/v3/b/69343188d0ea881f4016c598/latest";

async function loadEntityConfig(entityKey, setStatus) {
  try {
    setStatus?.(`Loading ${entityKey} config...`);

    const res = await fetch(CONFIG_URL);
    const raw = await res.json();

    const record = raw.record || raw;
    const cfg = record.config?.[entityKey];

    if (!cfg) {
      throw new Error(`${entityKey} config not found in JSON`);
    }

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