import express from "express";
import Category from "../models/categoriesModel.js";

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

router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    console.error("GET /categories error:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

async function getNextCategoryId() {
  const lastCategory = await Category.findOne({ id: { $ne: null } })
    .sort({ id: -1 })
    .select("id")
    .lean();

  if (!lastCategory || lastCategory.id == null) {
    return 1;
  }

  return lastCategory.id + 1;
}

router.post("/", async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const nextId = await getNextCategoryId();
    const category = await Category.create({ id: nextId, name, description });
    res.status(201).json(category);
  } catch (err) {
    console.error("POST /categories error:", err);
    res.status(500).json({ message: "Failed to create category" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const query = buildUserQueryFromParam(req.params.id);
    if (!query) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const { id, _id, ...updateData } = req.body;
    const updated = await Category.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("PUT /categories/:id error:", err);
    res.status(500).json({ message: "Failed to update category" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const removed = await Category.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "Category deleted", removed });
  } catch (err) {
    console.error("DELETE /categories/:id error:", err);
    res.status(500).json({ message: "Failed to delete category" });
  }
});

export default router;
