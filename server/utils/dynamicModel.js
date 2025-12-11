import mongoose from "mongoose";
import axios from "axios";

// Prefer env override so deployments can point to a different JSON source
const REMOTE_CONFIG_URL =
  process.env.REMOTE_CONFIG_URL ||
  "https://api.jsonbin.io/v3/b/693a9bbad0ea881f4021b07d";

let models = {};
let lastConfigHash = "";
let configs = {};
let refreshInterval = null;

function hash(obj) {
  return JSON.stringify(obj);
}

function resolveMongooseType(typeName) {
  if (!typeName || typeof typeName !== "string") {
    return mongoose.Schema.Types.Mixed;
  }

  switch (typeName.toLowerCase()) {
    case "string":
      return String;
    case "number":
      return Number;
    case "boolean":
      return Boolean;
    case "date":
      return Date;
    case "objectid":
      return mongoose.Schema.Types.ObjectId;
    case "array":
      return Array;
    case "mixed":
      return mongoose.Schema.Types.Mixed;
    default:
      console.warn(`⚠ Unknown type "${typeName}", fallback to Mixed`);
      return mongoose.Schema.Types.Mixed;
  }
}

function convertFieldDef(def) {
  if (Array.isArray(def)) return [convertFieldDef(def[0])];
  if (typeof def === "string") return { type: resolveMongooseType(def) };

  if (typeof def === "object" && def !== null) {
    if ("type" in def) {
      const { type, ...rest } = def;

      if (typeof type === "string") {
        return { type: resolveMongooseType(type), ...rest };
      }

      if (Array.isArray(type)) {
        return { type: [convertFieldDef(type[0])], ...rest };
      }

      if (typeof type === "object") {
        return { type: convertFields(type), ...rest };
      }

      return { type: mongoose.Schema.Types.Mixed, ...rest };
    }

    return convertFields(def);
  }

  return { type: mongoose.Schema.Types.Mixed };
}

function convertFields(fields) {
  const result = {};
  for (const key of Object.keys(fields)) {
    result[key] = convertFieldDef(fields[key]);
  }
  return result;
}

async function buildModels() {
  console.log("🔄 Building models from configuration...");

  // Delete old models so schema changes are applied on rebuilds
  for (const modelName of Object.keys(models)) {
    if (mongoose.modelNames().includes(modelName)) {
      try {
        mongoose.deleteModel(modelName);
        console.log(`🧹 Deleted existing model: ${modelName}`);
      } catch (err) {
        console.warn(`⚠ Could not delete model ${modelName}:`, err.message);
      }
    }
  }

  models = {};

  Object.entries(configs).forEach(([modelName, config]) => {
    const { schema, options = {}, collection } = config;

    if (!schema) {
      console.warn(`❌ Missing schema for model: ${modelName}`);
      return;
    }

    const schemaObj = convertFields(schema);
    const schemaOptions = { timestamps: true, ...options };
    const mongooseSchema = new mongoose.Schema(schemaObj, schemaOptions);

    const Model = mongoose.model(
      modelName,
      mongooseSchema,
      collection || undefined
    );

    models[modelName] = Model;

    console.log(
      `📌 Model generated: ${modelName} (collection: ${Model.collection.collectionName})`
    );
  });

  console.log("✨ All models built successfully.");
  return models;
}

async function fetchConfig() {
  const res = await axios.get(REMOTE_CONFIG_URL);
  let json = res.data;

  // Remote JSON may wrap data under .data (e.g., { _id, name, data: { ... } })
  if (json?.data && typeof json.data === "object") {
    json = json.data;
  }

  // JSONBin v3 returns { record: { ... } }
  if (json?.record && typeof json.record === "object") {
    json = json.record;
  }

  return json;
}

async function loadModels() {
  try {
    console.log("🌍 Loading remote JSON config...");
    const conf = await fetchConfig();
    const newHash = hash(conf);

    if (newHash !== lastConfigHash) {
      console.log("⚡ Remote JSON changed → Rebuilding models");
      configs = conf;
      lastConfigHash = newHash;
      await buildModels();
    } else {
      console.log("✔ Remote JSON unchanged — using cached models");
    }

    // Auto-refresh every 60s
    if (!refreshInterval) {
      refreshInterval = setInterval(async () => {
        try {
          const latest = await fetchConfig();
          const latestHash = hash(latest);

          if (latestHash !== lastConfigHash) {
            console.log("🔁 Remote JSON updated → Rebuilding models live");
            configs = latest;
            lastConfigHash = latestHash;
            await buildModels();
          }
        } catch (err) {
          console.error("🔴 Auto-refresh error:", err.message);
        }
      }, 60000);
    }

    return models;
  } catch (err) {
    console.error("❌ Cannot load dynamic models:", err.message);
    return models;
  }
}

export default loadModels;
export { models };
