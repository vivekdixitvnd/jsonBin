import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import usersRoutes from "./routes/usersRoutes.js";
import categoriesRoutes from "./routes/categoriesRoutes.js";
import productsRoutes from "./routes/productRoutes.js";
import ordersRoutes from "./routes/ordersRoutes.js";
import couponsRoutes from "./routes/couponRoutes.js";
// yahan baad me categoriesRoutes, productsRoutes etc. import kar lena

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// routes
app.use("/api/users", usersRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/coupons", couponsRoutes);

app.get("/", (req, res) => {
  res.json({ message: "JSONBin CRUD API running" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
