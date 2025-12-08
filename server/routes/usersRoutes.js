import express from "express";
import { getRecord, updateRecord, createRecord } from "../jsonBin.js";
// import { getRecord, updateRecord } from "../jsonbinClient.js";
import { validateUserPayload, getNextUserId } from "../models/usersModel.js";

const router = express.Router();

// GET /api/users - list all users
router.get("/", async (req, res) => {
  try {
    const record = await getRecord();
    res.json(record.users || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// POST /api/users - create user
router.post("/", async (req, res) => {
  try {
    const record = await getRecord();
    if (!record.users) record.users = [];

    const clean = validateUserPayload(req.body);
    const newUser = {
      id: getNextUserId(record.users),
      ...clean
    };

    record.users.push(newUser);
    await updateRecord(record);

    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to create user" });
  }
});

// PUT /api/users/:id - edit user
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const record = await getRecord();
    if (!record.users) record.users = [];

    const index = record.users.findIndex((u) => u.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "User not found" });
    }

    const existing = record.users[index];
    const clean = validateUserPayload({
      name: req.body.name ?? existing.name,
      email: req.body.email ?? existing.email,
      phone: req.body.phone ?? existing.phone
    });

    const updatedUser = { ...existing, ...clean };
    record.users[index] = updatedUser;

    await updateRecord(record);

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to update user" });
  }
});

// OPTIONAL: DELETE /api/users/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const record = await getRecord();
    if (!record.users) record.users = [];

    const index = record.users.findIndex((u) => u.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "User not found" });
    }

    const removed = record.users.splice(index, 1)[0];
    await updateRecord(record);

    res.json({ message: "User deleted", removed });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to delete user" });
  }
});

export default router;
