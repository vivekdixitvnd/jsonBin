export function validateUserPayload(payload) {
  const { name, email, phone } = payload;

  if (!name || typeof name !== "string") {
    throw new Error("name is required");
  }
  if (!email || typeof email !== "string") {
    throw new Error("email is required");
  }
  if (!phone || typeof phone !== "string") {
    throw new Error("phone is required");
  }

  return { name, email, phone };
}

export function getNextUserId(users) {
  if (!users.length) return 1;
  return Math.max(...users.map((u) => u.id)) + 1;
}
