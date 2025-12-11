import express from "express";
import mongoose from "mongoose";
import Material from "../models/materialsModel.js";

const router = express.Router();

function buildMaterialQueryFromParam(idParam) {
  if (mongoose.isValidObjectId(idParam)) {
    return { _id: idParam };
  }

  const num = Number(idParam);
  if (!Number.isNaN(num)) {
    return { id: num };
  }

  return null;
}

async function getNextMaterialId() {
  const lastMaterial = await Material.findOne({ id: { $ne: null } })
    .sort({ id: -1 })
    .select("id")
    .lean();

  if (!lastMaterial || lastMaterial.id == null) {
    return 1;
  }

  return lastMaterial.id + 1;
}

router.get("/", async (req, res) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 });
    console.log(`📋 GET /materials - Found ${materials.length} materials`);
    if (materials.length > 0) {
      console.log(`   First material:`, materials[0]);
    }
    res.json(materials);
  } catch (err) {
    console.error("❌ GET /materials error:", err);
    res.status(500).json({ message: "Failed to fetch materials", error: err.message });
  }
});

// Test endpoint to manually add a material
router.post("/test", async (req, res) => {
  try {
    console.log("🧪 TEST POST /materials/test - BODY:", JSON.stringify(req.body, null, 2));
    const { name = "Test Material", description = "Test Description" } = req.body;
    
    const nextId = await getNextMaterialId();
    const material = await Material.create({
      id: nextId,
      name,
      description,
      ...req.body
    });
    
    console.log(`✅ Test material created:`, material._id);
    res.status(201).json({ success: true, material });
  } catch (err) {
    console.error("❌ TEST POST /materials/test error:", err);
    res.status(500).json({ message: "Failed to create test material", error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, ...rest } = req.body;

    // SIMPLE: Just ensure name exists
    const materialName = name || `Material-${Date.now()}`;

    const nextId = await getNextMaterialId();

    const material = await Material.create({
      id: nextId,
      name: materialName,
      description: description || "",
      ...rest
    });

    res.status(201).json(material);
  } catch (err) {
    console.error("POST /materials error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Duplicate material" });
    }
    res.status(500).json({ message: "Failed to create material", error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const query = buildMaterialQueryFromParam(req.params.id);
    if (!query) {
      return res.status(400).json({ message: "Invalid material id" });
    }

    const { id, _id, ...updateData } = req.body;

    const updated = await Material.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ message: "Material not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("PUT /materials/:id error:", err);
    res.status(500).json({ message: "Failed to update material" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const query = buildMaterialQueryFromParam(req.params.id);
    if (!query) {
      return res.status(400).json({ message: "Invalid material id" });
    }

    const removed = await Material.findOneAndDelete(query);
    if (!removed) {
      return res.status(404).json({ message: "Material not found" });
    }

    res.json({ message: "Material deleted", removed });
  } catch (err) {
    console.error("DELETE /materials/:id error:", err);
    res.status(500).json({ message: "Failed to delete material" });
  }
});

export default router;

