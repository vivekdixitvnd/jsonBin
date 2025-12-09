// server/routes/usersRoutes.js
import express from "express";
import mongoose from "mongoose";
import User from "../models/usersModel.js";

const router = express.Router();

/**
 * Helper: build a Mongo query from URL param
 * Supports:
 *  - /api/users/<_id>  (Mongo ObjectId)
 *  - /api/users/<id>   (numeric id, like 1, 2, 3)
 */
function buildUserQueryFromParam(idParam) {
  // Case 1: valid ObjectId => treat as _id
  if (mongoose.isValidObjectId(idParam)) {
    return { _id: idParam };
  }

  // Case 2: numeric id => treat as our custom id
  const num = Number(idParam);
  if (!Number.isNaN(num)) {
    return { id: num };
  }

  // Invalid id
  return null;
}

// GET /api/users - list all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// OPTIONAL: GET /api/users/:id - fetch single user by _id or id
router.get("/:id", async (req, res) => {
  try {
    const query = buildUserQueryFromParam(req.params.id);
    if (!query) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("GET /users/:id error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// POST /api/users - create user
// POST /api/users
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, ...rest } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ message: "name, email and phone are required" });
    }

    const user = new User({ name, email, phone, ...rest });
    await user.save(); // <-- IMPORTANT! middleware triggers here

    res.status(201).json(user);
  } catch (err) {
    console.error("POST /users error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Failed to create user" });
  }
});


// PUT /api/users/:id - update by _id or numeric id
router.put("/:id", async (req, res) => {
  try {
    const query = buildUserQueryFromParam(req.params.id);
    if (!query) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const updated = await User.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("PUT /users/:id error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// DELETE /api/users/:id - delete by _id or numeric id
router.delete("/:id", async (req, res) => {
  try {
    const query = buildUserQueryFromParam(req.params.id);
    if (!query) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const removed = await User.findOneAndDelete(query);
    if (!removed) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted", removed });
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

export default router;
