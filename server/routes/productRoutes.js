import express from "express";
import mongoose from "mongoose";
import Product from "../models/productModel.js";

const router = express.Router();

function buildUserQueryFromParam(idParam) {
  if (mongoose.isValidObjectId(idParam)) {
    return { _id: idParam };
  }

  const num = Number(idParam);
  if (!Number.isNaN(num)) {
    return { id: num };
  }

  return null;
}

// 👇 id generation ko touch nahi kar rahe
async function getNextProductId() {
  const lastProduct = await Product.findOne({ id: { $ne: null } })
    .sort({ id: -1 })
    .select("id")
    .lean();

  if (!lastProduct || lastProduct.id == null) {
    return 1;
  }

  return lastProduct.id + 1;
}

router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ id: 1 });
    res.json(products);
  } catch (err) {
    console.error("GET /products error:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

router.post("/", async (req, res) => {
  try {
    let { name, categoryId, price, stock, ...rest } = req.body;

    if (!name || categoryId == null || price == null || stock == null) {
      return res.status(400).json({
        message: "name, categoryId, price, stock are required"
      });
    }

    const nextId = await getNextProductId();

    const product = await Product.create({
      id: nextId,
      name,
      categoryId: Number(categoryId),
      price: Number(price),
      stock: Number(stock),
      ...rest
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("POST /products error:", err);
    res.status(500).json({ message: "Failed to create product" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.categoryId != null) {
      updateData.categoryId = Number(updateData.categoryId);
    }
    if (updateData.price != null) {
      updateData.price = Number(updateData.price);
    }
    if (updateData.stock != null) {
      updateData.stock = Number(updateData.stock);
    }

    const updated = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("PUT /products/:id error:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const removed = await Product.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted", removed });
  } catch (err) {
    console.error("DELETE /products/:id error:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

export default router;
