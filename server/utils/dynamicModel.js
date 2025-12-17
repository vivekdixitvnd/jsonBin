// dynamic-model-loader.js
import mongoose from "mongoose";
import axios from "axios";

const CONFIG_URL =
  process.env.REMOTE_CONFIG_URL ||
  "https://api.jsonbin.io/v3/b/69411118d0ea881f402cbde2/latest";

let models = {};

/**
 * Ensure mongoose is connected. If not connected, attempt to connect using
 * process.env.MONGO_URI. Throws an error if there's no URI or the connection fails.
 */
async function ensureConnected() {
  const ready = mongoose.connection.readyState; // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (ready === 1) return; // already connected

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!uri) {
    throw new Error(
      "MONGO_URI / MONGODB_URI is not set. Set process.env.MONGO_URI or process.env.MONGODB_URI."
    );
  }

  // Log masked host for easier debugging (do not print credentials)
  try {
    const masked = uri.replace(/:[^:@]+@/, ':***@');
    console.log(`🔑 Using MongoDB URI: ${masked.split('/').slice(0,3).join('/')}`);
  } catch (e) {}

  console.log("⏳ Mongoose not connected — attempting to connect...");
  try {
    // mongoose v6+ doesn't require these options, but harmless to include
    await mongoose.connect(uri, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      // serverSelectionTimeoutMS: 5000
    });
    console.log("🔌 Mongoose connected.");
  } catch (err) {
    console.error("❌ Mongoose connection failed:", err.message);
    throw err;
  }
}

/**
 * Resolve simple type names from config to mongoose types.
 */
function resolveType(typeName) {
  const types = {
    string: String,
    number: Number,
    boolean: Boolean,
    date: Date,
    objectid: mongoose.Schema.Types.ObjectId,
    array: Array,
    mixed: mongoose.Schema.Types.Mixed,
    // add others if needed: buffer, decimal128, map, etc.
  };
  return types[typeName?.toLowerCase()] || mongoose.Schema.Types.Mixed;
}

/**
 * Convert a config field definition into a mongoose-compatible definition.
 * Handles:
 *  - simple string types: "string" -> { type: String }
 *  - arrays: ["string"] -> [{ type: String }]
 *  - objects with `type` key: { type: "string", required: true }
 *  - plain nested objects (sub-doc schemas)
 */
function convertField(def) {
  if (Array.isArray(def)) return [convertField(def[0])];

  if (typeof def === "string") return { type: resolveType(def) };

  if (typeof def === "object") {
    if (def.type) {
      const { type, ...rest } = def;

      // If `type` itself is a plain object, treat it as nested schema
      if (typeof type === "object" && !Array.isArray(type)) {
        return buildSchemaFields(type);
      }

      return { type: resolveType(type), ...rest };
    }

    // Plain object without `type` -> nested sub-document schema
    return buildSchemaFields(def);
  }

  return def;
}

function buildSchemaFields(fields) {
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = convertField(value);
  }
  return result;
}

/**
 * Create or reuse an existing model to avoid OverwriteModelError.
 * If the model already exists, we return the existing one and log a warning.
 */
function createOrGetModel(name, schema) {
  if (mongoose.models[name]) {
    // Model already exists (likely from a previous load); reuse it.
    console.warn(`⚠️ Model "${name}" already exists. Reusing existing model.`);
    return mongoose.model(name);
  }

  return mongoose.model(name, schema);
}

/**
 * Main loader: fetches config, builds schemas, and registers models.
 * It will ensure a mongoose connection exists (tries to connect using MONGO_URI if needed).
 */
async function loadModels({ autoConnect = true } = {}) {
  try {
    console.log("🌍 Loading models from JSONBin...");

    if (autoConnect) {
      await ensureConnected();
    } else if (mongoose.connection.readyState !== 1) {
      throw new Error(
        "Mongoose not connected. Set autoConnect=true or connect mongoose before calling loadModels()."
      );
    }

    const res = await axios.get(CONFIG_URL);
    // Recursively unwrap common wrapper shapes until we find the model map
    function findModels(obj) {
      if (!obj || typeof obj !== "object") return null;
      // heuristic: model map likely contains known collection keys like 'users' or 'products'
      const candidates = ["users", "products", "categories", "orders", "coupons"];
      if (candidates.some((k) => Object.prototype.hasOwnProperty.call(obj, k))) return obj;
      if (obj.record) return findModels(obj.record);
      if (obj.data) return findModels(obj.data);
      // Sometimes the payload is wrapped in { _id, name, data, ... } where data.record holds models
      for (const v of Object.values(obj)) {
        if (typeof v === "object") {
          const found = findModels(v);
          if (found) return found;
        }
      }
      return null;
    }

    const config = findModels(res.data) || (res.data?.record || res.data?.data || res.data);
    console.log("🌐 Remote config fetched. Top-level keys:", Object.keys(config || {}));

    if (!config || typeof config !== "object") {
      throw new Error("Invalid remote config — expected an object of model configs.");
    }

    for (const [modelName, modelConfig] of Object.entries(config)) {
      if (modelName === "metadata") continue;

      // Support new combined JSON shape where schema lives under modelConfig.backend.schema
      const backend = modelConfig.backend || modelConfig;
      const schemaDef = backend.schema || modelConfig.schema;
      if (!schemaDef) {
        console.warn(`ℹ️ Skipping model ${modelName} — no schema found`);
        continue;
      }

      const schemaFields = buildSchemaFields(schemaDef || {});
      const schemaOptions = { timestamps: true, ...backend.options, ...modelConfig.options };
      const mongooseSchema = new mongoose.Schema(schemaFields, schemaOptions);

      // Use createOrGetModel to avoid OverwriteModelError
      models[modelName] = createOrGetModel(modelName, mongooseSchema);
      console.log(`✅ Model created/loaded: ${modelName}`);
    }

    console.log("✨ All models loaded successfully");
    return models;
  } catch (err) {
    console.error("❌ Failed to load models:", err?.message || err);
    return models;
  }
}

export default loadModels;
export { models };