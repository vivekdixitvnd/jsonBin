// server/routes/productsRoutes.js
import express from "express";
import { getRecord, updateRecord } from "../jsonBin.js";
import {
  validateProductPayload,
  getNextProductId
} from "../models/productModel.js";

const router = express.Router();

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const record = await getRecord();
    res.json(record.products || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// POST /api/products
router.post("/", async (req, res) => {
  try {
    const record = await getRecord();
    if (!record.products) record.products = [];

    const clean = validateProductPayload(req.body);
    const newProduct = {
      id: getNextProductId(record.products),
      ...clean
    };

    record.products.push(newProduct);
    await updateRecord(record);

    res.status(201).json(newProduct);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to create product" });
  }
});

// PUT /api/products/:id
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const record = await getRecord();
    if (!record.products) record.products = [];

    const index = record.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existing = record.products[index];

    const clean = validateProductPayload({
      name: req.body.name ?? existing.name,
      categoryId:
        req.body.categoryId !== undefined
          ? req.body.categoryId
          : existing.categoryId,
      price: req.body.price ?? existing.price,
      stock: req.body.stock ?? existing.stock
    });

    const updatedProduct = { ...existing, ...clean };
    record.products[index] = updatedProduct;

    await updateRecord(record);
    res.json(updatedProduct);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to update product" });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const record = await getRecord();
    if (!record.products) record.products = [];

    const index = record.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "Product not found" });
    }

    const removed = record.products.splice(index, 1)[0];
    await updateRecord(record);

    res.json({ message: "Product deleted", removed });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to delete product" });
  }
});

export default router;
