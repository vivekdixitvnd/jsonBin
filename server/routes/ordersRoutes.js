// server/routes/ordersRoutes.js
import express from "express";
import { getRecord, updateRecord } from "../jsonBin.js";
import {
  validateOrderPayload,
  getNextOrderId
} from "../models/ordersModel.js";

const router = express.Router();

// GET /api/orders
router.get("/", async (req, res) => {
  try {
    const record = await getRecord();
    res.json(record.orders || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// POST /api/orders
router.post("/", async (req, res) => {
  try {
    const record = await getRecord();
    if (!record.orders) record.orders = [];

    const clean = validateOrderPayload(req.body);
    const newOrder = {
      orderId: getNextOrderId(record.orders),
      ...clean
    };

    record.orders.push(newOrder);
    await updateRecord(record);

    res.status(201).json(newOrder);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to create order" });
  }
});

// PUT /api/orders/:orderId
router.put("/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const record = await getRecord();
    if (!record.orders) record.orders = [];

    const index = record.orders.findIndex((o) => o.orderId === orderId);
    if (index === -1) {
      return res.status(404).json({ message: "Order not found" });
    }

    const existing = record.orders[index];

    const clean = validateOrderPayload(
      {
        userId:
          req.body.userId !== undefined ? req.body.userId : existing.userId,
        productIds:
          req.body.productIds !== undefined
            ? req.body.productIds
            : existing.productIds,
        orderDate: req.body.orderDate ?? existing.orderDate,
        status: req.body.status ?? existing.status
      },
      existing
    );

    const updatedOrder = { ...existing, ...clean };
    record.orders[index] = updatedOrder;

    await updateRecord(record);
    res.json(updatedOrder);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to update order" });
  }
});

// DELETE /api/orders/:orderId
router.delete("/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const record = await getRecord();
    if (!record.orders) record.orders = [];

    const index = record.orders.findIndex((o) => o.orderId === orderId);
    if (index === -1) {
      return res.status(404).json({ message: "Order not found" });
    }

    const removed = record.orders.splice(index, 1)[0];
    await updateRecord(record);

    res.json({ message: "Order deleted", removed });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Failed to delete order" });
  }
});

export default router;
