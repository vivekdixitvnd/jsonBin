// server/routes/categoriesRoutes.js
import express from "express";
import { getRecord, updateRecord } from "../jsonBin.js";
import {
  validateCategoryPayload,
  getNextCategoryId
} from "../models/categoriesModel.js";

const router = express.Router();

// GET /api/categories
router.get("/", async (req, res) => {
  try {
    const record = await getRecord();
    res.json(record.categories || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// POST /api/categories
router.post("/", async (req, res) => {
  try {
    const record = await getRecord();
    if (!record.categories) record.categories = [];

    const clean = validateCategoryPayload(req.body);
    const newCategory = {
      id: getNextCategoryId(record.categories),
      ...clean
    };

    record.categories.push(newCategory);
    await updateRecord(record);

    res.status(201).json(newCategory);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to create category" });
  }
});

// PUT /api/categories/:id
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const record = await getRecord();
    if (!record.categories) record.categories = [];

    const index = record.categories.findIndex((c) => c.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "Category not found" });
    }

    const existing = record.categories[index];

    const clean = validateCategoryPayload({
      name: req.body.name ?? existing.name,
      description: req.body.description ?? existing.description
    });

    const updatedCategory = { ...existing, ...clean };
    record.categories[index] = updatedCategory;

    await updateRecord(record);
    res.json(updatedCategory);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to update category" });
  }
});

// DELETE /api/categories/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const record = await getRecord();
    if (!record.categories) record.categories = [];

    const index = record.categories.findIndex((c) => c.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "Category not found" });
    }

    const removed = record.categories.splice(index, 1)[0];
    await updateRecord(record);

    res.json({ message: "Category deleted", removed });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to delete category" });
  }
});

export default router;
