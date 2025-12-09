export function validateProductPayload(payload) {
  const { name, categoryId, price, stock } = payload;

  if (!name || typeof name !== "string") {
    throw new Error("Product name is required");
  }

  const catIdNum = categoryId !== undefined ? Number(categoryId) : null;
  const priceNum = price !== undefined ? Number(price) : 0;
  const stockNum = stock !== undefined ? Number(stock) : 0;

  return {
    name,
    categoryId: catIdNum,
    price: priceNum,
    stock: stockNum
  };
}

export function getNextProductId(products) {
  if (!products.length) return 1;
  return Math.max(...products.map((p) => p.id)) + 1;
}

import mongoose, { mongo } from "mongoose";

const productSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true,
      sparse: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    categoryId: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    stock: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { timestamps: true,
    strict: false
   }
);

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
