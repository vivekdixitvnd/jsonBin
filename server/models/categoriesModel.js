// server/models/categoriesModel.js
export function validateCategoryPayload(payload) {
  const { name, description } = payload;

  if (!name || typeof name !== "string") {
    throw new Error("Category name is required");
  }

  return {
    name,
    description: description ?? ""
  };
}

export function getNextCategoryId(categories) {
  if (!categories.length) return 1;
  return Math.max(...categories.map((c) => c.id)) + 1;
}
