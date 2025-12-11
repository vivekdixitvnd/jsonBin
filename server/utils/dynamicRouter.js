import express from "express";
import pkg from "json-2-csv";
const { json2csvAsync } = pkg;
import mongoose from "mongoose";

/**
 * Helper: normalize query value (string or array) to a single string
 */
function firstQueryValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Helper: cast string to Number / Boolean when possible
 */
function smartCast(value) {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  const num = Number(trimmed);
  if (!Number.isNaN(num) && trimmed !== "") return num;

  return trimmed;
}

/**
 * Build MongoDB filter object from request query.
 * - Excludes reserved params like page, limit, sort, select, populate, search, searchFields
 * - Supports comma-separated values as $in
 */
function buildFilters(query) {
  const RESERVED = new Set([
    "page",
    "limit",
    "sort",
    "select",
    "populate",
    "search",
    "searchFields"
  ]);

  const filters = {};

  for (const [key, rawVal] of Object.entries(query)) {
    if (RESERVED.has(key)) continue;

    const value = firstQueryValue(rawVal);
    if (value == null || value === "") continue;

    // Comma-separated => $in
    if (typeof value === "string" && value.includes(",")) {
      filters[key] = {
        $in: value.split(",").map((v) => smartCast(v))
      };
    } else {
      filters[key] = smartCast(value);
    }
  }

  return filters;
}

/**
 * Apply basic search with regex on given fields.
 * query.search = "text"
 * query.searchFields = "name,code,ownerName"
 */
function applySearch(filters, query) {
  const search = firstQueryValue(query.search);
  const searchFields = firstQueryValue(query.searchFields);

  if (!search || !searchFields) return filters;

  const fields = searchFields
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  if (!fields.length) return filters;

  const rx = new RegExp(search.trim(), "i");

  return {
    ...filters,
    $or: fields.map((field) => ({ [field]: rx }))
  };
}

function getPopulatePaths(Model) {
  const paths = new Set();
  const visited = new Set();

  function scan(model, prefix = "") {
    if (!model) return;
    const visitKey = `${model.modelName}:${prefix || "<root>"}`;
    if (visited.has(visitKey)) return;
    visited.add(visitKey);

    for (const [name, pathDef] of Object.entries(model.schema.paths)) {
      const base = prefix ? `${prefix}.${name}` : name;

      // ObjectId ref
      if (pathDef.options?.ref) {
        paths.add(base);
        const refName = pathDef.options.ref;
        const refModel =
          mongoose.models[refName] ||
          mongoose.models[refName.charAt(0).toUpperCase() + refName.slice(1)] ||
          mongoose.models[refName.toLowerCase()];

        scan(refModel, base); // go deeper without depth limit
        continue;
      }

      // Array of ObjectId refs
      if (pathDef.instance === "Array" && pathDef.caster?.options?.ref) {
        paths.add(base);
        const refModel = mongoose.models[pathDef.caster.options.ref];
        scan(refModel, base);
        continue;
      }

      // SubSchema
      if (pathDef.schema?.paths) {
        scan({ schema: pathDef.schema, modelName: model.modelName }, base);
      }
    }
  }

  scan(Model);
  return Array.from(paths);
}

function applyPopulate(query, mongooseQuery, Model) {
  // get *all* populate paths in the whole schema tree
  const paths = getPopulatePaths(Model); // unlimited recursion

  // split deep paths into grouped populate calls
  // Example: ["project", "project.staff", "project.staff.role", "items.material", "items.material.category"]
  const grouped = {};

  paths.forEach((p) => {
    const top = p.split(".")[0];
    if (!grouped[top]) grouped[top] = [];
    grouped[top].push(p);
  });

  // apply nested populate in Mongoose format
  for (const [root, subs] of Object.entries(grouped)) {
    mongooseQuery = mongooseQuery.populate({
      path: root,
      populate: subs
        .filter((s) => s !== root)
        .map((s) => ({
          path: s.replace(`${root}.`, ""),
          populate: [] // Mongoose will recursively fill nested again
        }))
    });
  }

  return mongooseQuery;
}

export default function generateCRUDRoutes(Model) {
  const router = express.Router();

  // CREATE (single or bulk)
  router.post("/", async (req, res) => {
    try {
      const payload = Array.isArray(req.body) ? req.body : [req.body];
      const created = await Model.insertMany(payload, { ordered: false });
      res.status(201).json({
        data: created,
        meta: { count: created.length }
      });
    } catch (e) {
      console.error("CREATE error:", e);
      res.status(400).json({ error: e.message });
    }
  });

  // VALIDATE (single or bulk) without saving
  router.post("/validate", async (req, res) => {
    try {
      const payload = Array.isArray(req.body) ? req.body : [req.body];

      const docs = payload.map((item) => new Model(item));
      const results = [];

      for (const doc of docs) {
        try {
          await doc.validate();
          results.push({ ok: true });
        } catch (err) {
          results.push({
            ok: false,
            error: err.message,
            details: err.errors
              ? Object.fromEntries(
                  Object.entries(err.errors).map(([k, v]) => [k, v.message])
                )
              : undefined
          });
        }
      }

      const allValid = results.every((r) => r.ok);

      res.json({
        valid: allValid,
        results
      });
    } catch (e) {
      console.error("VALIDATE error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // LIST with pagination, filters, search, sort, select, populate
  router.get("/", async (req, res) => {
    try {
      // Pagination
      const page = Math.max(
        parseInt(firstQueryValue(req.query.page) || "1", 10),
        1
      );
      const limitRaw = parseInt(firstQueryValue(req.query.limit) || "20", 10);
      const limit = Math.min(Math.max(limitRaw, 1), 200);
      const skip = (page - 1) * limit;

      // Filters
      let filters = buildFilters(req.query);
      filters = applySearch(filters, req.query);

      // Base query
      let mongooseQuery = Model.find(filters);

      // Sort
      const sort = firstQueryValue(req.query.sort);
      if (sort) {
        mongooseQuery = mongooseQuery.sort(sort.replace(/,/g, " "));
      } else if (Model.schema.paths.createdAt) {
        // Default sort: newest first if timestamps exist
        mongooseQuery = mongooseQuery.sort("-createdAt");
      }

      // Field selection
      const select = firstQueryValue(req.query.select);
      if (select) {
        mongooseQuery = mongooseQuery.select(select.replace(/,/g, " "));
      }

      // Populate
      mongooseQuery = applyPopulate(req.query, mongooseQuery, Model);

      // Execute query + count in parallel
      const [docs, total] = await Promise.all([
        mongooseQuery.skip(skip).limit(limit),
        Model.countDocuments(filters)
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      res.json({
        data: docs,
        meta: {
          page,
          limit,
          total,
          totalPages
        }
      });
    } catch (e) {
      console.error("LIST error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/schema", (req, res) => {
    const fields = Object.keys(Model.schema.paths).map((path) => {
      const p = Model.schema.paths[path];
      return {
        path,
        instance: p.instance,
        options: p.options || {}
      };
    });

    res.json({
      model: Model.modelName,
      collection: Model.collection.collectionName,
      fields
    });
  });

  router.get("/distinct/:field", async (req, res) => {
    try {
      const { field } = req.params;
      if (!field) {
        return res.status(400).json({ error: "Field param is required" });
      }

      let filters = buildFilters(req.query);
      filters = applySearch(filters, req.query);

      const values = await Model.distinct(field, filters);
      res.json({ field, values });
    } catch (e) {
      console.error("DISTINCT error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // EXPORT data as JSON or CSV
  router.get("/export", async (req, res) => {
    try {
      let filters = buildFilters(req.query);
      filters = applySearch(filters, req.query);

      let mongooseQuery = Model.find(filters);

      // Sort
      const sort = firstQueryValue(req.query.sort);
      if (sort) {
        mongooseQuery = mongooseQuery.sort(sort.replace(/,/g, " "));
      } else if (Model.schema.paths.createdAt) {
        mongooseQuery = mongooseQuery.sort("-createdAt");
      }

      // Select
      const select = firstQueryValue(req.query.select);
      if (select) {
        mongooseQuery = mongooseQuery.select(select.replace(/,/g, " "));
      }

      // Populate
      mongooseQuery = applyPopulate(req.query, mongooseQuery, Model);

      // Optional hard limit for export (default 5000)
      const limitRaw = parseInt(firstQueryValue(req.query.limit) || "5000", 10);
      const limit = Math.min(Math.max(limitRaw, 1), 20000);

      const docs = await mongooseQuery.limit(limit).lean();

      const format = (
        firstQueryValue(req.query.format) || "json"
      ).toLowerCase();

      if (format === "csv") {
        const csv = await json2csvAsync(docs || []);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${Model.modelName}_export.csv"`
        );
        return res.send(csv);
      }

      // Default: JSON
      res.json({
        data: docs,
        meta: {
          total: docs.length,
          format: "json"
        }
      });
    } catch (e) {
      console.error("EXPORT error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // STATS / AGGREGATION
  router.get("/stats", async (req, res) => {
    try {
      const groupByParam = firstQueryValue(req.query.groupBy);
      if (!groupByParam) {
        return res
          .status(400)
          .json({ error: "Query param 'groupBy' is required" });
      }

      const groupFields = groupByParam
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      if (!groupFields.length) {
        return res
          .status(400)
          .json({ error: "No valid 'groupBy' fields provided" });
      }

      const sumFields = (firstQueryValue(req.query.sum) || "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      const avgFields = (firstQueryValue(req.query.avg) || "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      const minFields = (firstQueryValue(req.query.min) || "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      const maxFields = (firstQueryValue(req.query.max) || "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      let match = buildFilters(req.query);
      match = applySearch(match, req.query);

      const groupId = {};
      groupFields.forEach((field) => {
        groupId[field] = `$${field}`;
      });

      const groupStage = { _id: groupId };

      sumFields.forEach((field) => {
        groupStage[`sum_${field}`] = { $sum: { $ifNull: [`$${field}`, 0] } };
      });

      avgFields.forEach((field) => {
        groupStage[`avg_${field}`] = { $avg: `$${field}` };
      });

      minFields.forEach((field) => {
        groupStage[`min_${field}`] = { $min: `$${field}` };
      });

      maxFields.forEach((field) => {
        groupStage[`max_${field}`] = { $max: `$${field}` };
      });

      const pipeline = [{ $match: match }, { $group: groupStage }];

      const raw = await Model.aggregate(pipeline);

      const formatted = raw.map((row) => {
        const base = { ...row._id };
        delete row._id;
        return { ...base, ...row };
      });

      res.json({ data: formatted });
    } catch (e) {
      console.error("STATS error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // COUNT endpoint
  router.get("/count/all", async (req, res) => {
    try {
      let filters = buildFilters(req.query);
      filters = applySearch(filters, req.query);

      const count = await Model.countDocuments(filters);
      res.json({ count });
    } catch (e) {
      console.error("COUNT error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // GET by ID (with optional populate)
  router.get("/:id", async (req, res) => {
    try {
      let mongooseQuery = Model.findById(req.params.id);
      mongooseQuery = applyPopulate(req.query, mongooseQuery, Model);

      const doc = await mongooseQuery;
      if (!doc) return res.status(404).json({ message: "Not found" });

      res.json({ data: doc });
    } catch (e) {
      console.error("GET BY ID error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // UPDATE by ID (partial update)
  router.put("/:id", async (req, res) => {
    try {
      const updated = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });

      if (!updated) {
        return res.status(404).json({ message: "Not found" });
      }

      res.json({ data: updated });
    } catch (e) {
      console.error("UPDATE error:", e);
      res.status(400).json({ error: e.message });
    }
  });

  // BULK UPDATE
  router.patch("/bulk-update", async (req, res) => {
    try {
      const { filter = {}, update = {}, options = {} } = req.body || {};

      if (!update || Object.keys(update).length === 0) {
        return res
          .status(400)
          .json({ error: "Update object is required and cannot be empty" });
      }

      const result = await Model.updateMany(filter, update, options);

      const matched = result.matchedCount ?? result.n ?? result.nModified ?? 0;
      const modified = result.modifiedCount ?? result.nModified ?? 0;

      res.json({
        matched,
        modified
      });
    } catch (e) {
      console.error("BULK UPDATE error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE by ID
  router.delete("/:id", async (req, res) => {
    try {
      const deleted = await Model.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Not found" });
      }
      res.json({ message: "Deleted", id: req.params.id });
    } catch (e) {
      console.error("DELETE error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // BULK DELETE by array of IDs
  router.post("/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body || {};

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(400)
          .json({ error: "Body must include non-empty 'ids' array" });
      }

      const result = await Model.deleteMany({ _id: { $in: ids } });

      const deleted = result.deletedCount ?? result.n ?? 0;

      res.json({
        deleted,
        ids
      });
    } catch (e) {
      console.error("BULK DELETE error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}


