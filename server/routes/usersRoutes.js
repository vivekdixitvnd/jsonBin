import express from "express";
import mongoose from "mongoose";
import User from "../models/usersModel.js";

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

async function getNextUserId() {
  const lastUser = await User.findOne({ id: { $ne: null } })
    .sort({ id: -1 })
    .select("id")
    .lean();

  if (!lastUser || lastUser.id == null) {
    return 1;
  }

  return lastUser.id + 1;
}

router.get("/", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, ...rest } = req.body;

    if (!name || !email || !phone) {
      return res
        .status(400)
        .json({ message: "name, email and phone are required" });
    }

    const nextId = await getNextUserId();

    const user = await User.create({
      id: nextId,
      name,
      email,
      phone,
      ...rest
    });

    res.status(201).json(user);
  } catch (err) {
    console.error("POST /users error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists or id duplicate" });
    }
    res.status(500).json({ message: "Failed to create user" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const query = buildUserQueryFromParam(req.params.id);
    if (!query) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const { id, _id, ...updateData } = req.body;

    const updated = await User.findOneAndUpdate(query, updateData, {
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
