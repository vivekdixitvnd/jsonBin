import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./db.js";

// Static routes (legacy)
// import usersRoutes from "./routes/usersRoutes.js";
// import categoriesRoutes from "./routes/categoriesRoutes.js";
// import productsRoutes from "./routes/productRoutes.js";
// import ordersRoutes from "./routes/ordersRoutes.js";
// import couponsRoutes from "./routes/couponRoutes.js";
// import materialsRoutes from "./routes/materialsRoutes.js";

// Dynamic models + routes
import loadModels from "./utils/dynamicModel.js";
import generateCRUDRoutes from "./utils/generateCRUDRoutes.js";

// Upload route
import uploadRoutes from "../../routes/uploadRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Upload endpoint for images
app.use("/api/upload", uploadRoutes);

// API routes (static)
// app.use("/api/users", usersRoutes);
// app.use("/api/categories", categoriesRoutes);
// app.use("/api/products", productsRoutes);
// app.use("/api/orders", ordersRoutes);
// app.use("/api/coupons", couponsRoutes);
// app.use("/api/materials", materialsRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Mongo CRUD API running" });
});

async function startServer() {
  await connectDB();

  // Dynamic routes from remote config
  try {
    const models = await loadModels();
    Object.entries(models).forEach(([name, Model]) => {
      const route = `/api/${name}`;
      console.log(`🔗 Mounting dynamic route: ${route}`);
      app.use(route, generateCRUDRoutes(Model));
    });
  } catch (err) {
    console.error("❌ Failed to load dynamic models/routes:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err.message);
});
