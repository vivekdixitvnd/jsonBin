// server/models/productsModel.js
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
