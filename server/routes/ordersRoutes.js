import express from "express";
import Order from "../models/ordersModel.js";

const router = express.Router();

function parseProductIds(raw) {
  if (Array.isArray(raw)) return raw.map((v) => Number(v));

  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s));
  }

  return [];
}

async function getNextOrderId() {
  const last = await Order.findOne({ orderId: { $exists: true } })
    .sort({ createdAt: -1 })
    .select("orderId")
    .lean();

  let nextNumber = 111; // starting point

  if (last && last.orderId) {
    const match = String(last.orderId).match(/ORD(\d+)/);
    if (match) {
      const lastNum = Number(match[1]);
      if (!Number.isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }
  }

  return `ORD${nextNumber}`;
}

router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("GET /orders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

router.post("/", async (req, res) => {
  try {
    let { userId, productIds, orderDate, status, ...rest } = req.body;

    if (userId == null || !status) {
      return res
        .status(400)
        .json({ message: "userId and status are required" });
    }

    userId = Number(userId);
    const parsedProductIds = parseProductIds(productIds);

    const orderId = await getNextOrderId();

    const order = await Order.create({
      orderId,
      userId,
      productIds: parsedProductIds,
      orderDate: orderDate || new Date(),
      status,
      ...rest
    });

    res.status(201).json(order);
  } catch (err) {
    console.error("POST /orders error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Duplicate orderId" });
    }
    res.status(500).json({ message: "Failed to create order" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = { ...req.body };

    if (updateData.orderId) {
      delete updateData.orderId;
    }

    if (updateData.userId != null) {
      updateData.userId = Number(updateData.userId);
    }
    if (updateData.productIds != null) {
      updateData.productIds = parseProductIds(updateData.productIds);
    }
    if (updateData.orderDate) {
      updateData.orderDate = new Date(updateData.orderDate);
    }

    const updated = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("PUT /orders/:id error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Duplicate orderId" });
    }
    res.status(500).json({ message: "Failed to update order" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const removed = await Order.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted", removed });
  } catch (err) {
    console.error("DELETE /orders/:id error:", err);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

export default router;
