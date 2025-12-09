// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./db.js";

import usersRoutes from "./routes/usersRoutes.js";
import categoriesRoutes from "./routes/categoriesRoutes.js";
import productsRoutes from "./routes/productRoutes.js";
import ordersRoutes from "./routes/ordersRoutes.js";
import couponsRoutes from "./routes/couponRoutes.js";
// agar config route bhi bana hai to:
// import configRoutes from "./routes/configRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/users", usersRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/coupons", couponsRoutes);
// app.use("/api/config", configRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Mongo CRUD API running" });
});

// --------- Mongo connect + server start ---------
async function startServer() {
  await connectDB(); // pehle DB se connect
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err.message);
});
