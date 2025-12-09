import express from "express";
import Coupon from "../models/couponModel.js";

const router = express.Router();

async function getNextCouponId() {
  const last = await Coupon.findOne({ id: { $exists: true } })
    .sort({ createdAt: -1 })
    .select("id")
    .lean();

  let nextNum = 1;
  if (last && last.id) {
    const match = String(last.id).match(/C(\d+)/);
    if (match) nextNum = Number(match[1]) + 1;
  }
  return `C${nextNum}`;
}

router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch coupons" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { code, discount, isActive = true, validTill } = req.body;

    if (!code || discount == null) {
      return res.status(400).json({ message: "code & discount required" });
    }

    const newId = await getNextCouponId();

    const coupon = await Coupon.create({
      id: newId,
      code,
      discount: Number(discount),
      isActive,
      validTill: validTill ? new Date(validTill) : null
    });

    res.status(201).json(coupon);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Coupon code or ID already exists" });
    }
    res.status(500).json({ message: "Failed to create coupon" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.id) delete updateData.id;

    if (updateData.discount != null) {
      updateData.discount = Number(updateData.discount);
    }
    if (updateData.validTill) {
      updateData.validTill = new Date(updateData.validTill);
    }

    const updated = await Coupon.findOneAndUpdate({ id }, updateData, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update coupon" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const removed = await Coupon.findOneAndDelete({ id: req.params.id });

    if (!removed) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json({ message: "Coupon deleted", removed });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete coupon" });
  }
});

export default router;
