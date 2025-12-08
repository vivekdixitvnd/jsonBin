// server/routes/couponsRoutes.js
import express from "express";
import { getRecord, updateRecord } from "../jsonBin.js";
import {
  validateCouponPayload,
  getNextCouponId
} from "../models/couponModel.js";

const router = express.Router();

// GET /api/coupons
router.get("/", async (req, res) => {
  try {
    const record = await getRecord();
    res.json(record.coupons || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch coupons" });
  }
});

// POST /api/coupons
router.post("/", async (req, res) => {
  try {
    const record = await getRecord();
    if (!record.coupons) record.coupons = [];

    const clean = validateCouponPayload(req.body);
    const newCoupon = {
      id: getNextCouponId(record.coupons),
      ...clean
    };

    record.coupons.push(newCoupon);
    await updateRecord(record);

    res.status(201).json(newCoupon);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to create coupon" });
  }
});

// PUT /api/coupons/:id
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const record = await getRecord();
    if (!record.coupons) record.coupons = [];

    const index = record.coupons.findIndex((c) => c.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    const existing = record.coupons[index];

    const clean = validateCouponPayload(
      {
        code: req.body.code ?? existing.code,
        discount:
          req.body.discount !== undefined
            ? req.body.discount
            : existing.discount,
        isActive:
          req.body.isActive !== undefined
            ? req.body.isActive
            : existing.isActive,
        validTill: req.body.validTill ?? existing.validTill
      },
      existing
    );

    const updatedCoupon = { ...existing, ...clean };
    record.coupons[index] = updatedCoupon;

    await updateRecord(record);
    res.json(updatedCoupon);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to update coupon" });
  }
});

// DELETE /api/coupons/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const record = await getRecord();
    if (!record.coupons) record.coupons = [];

    const index = record.coupons.findIndex((c) => c.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    const removed = record.coupons.splice(index, 1)[0];
    await updateRecord(record);

    res.json({ message: "Coupon deleted", removed });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to delete coupon" });
  }
});

export default router;
