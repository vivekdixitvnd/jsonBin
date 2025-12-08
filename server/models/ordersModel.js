// server/models/ordersModel.js
export function validateOrderPayload(payload, existingOrder) {
  const base = existingOrder || {};

  const userId =
    payload.userId !== undefined ? Number(payload.userId) : base.userId;
  if (!userId) {
    throw new Error("userId is required");
  }

  const productIds =
    payload.productIds !== undefined
      ? payload.productIds.map((id) => Number(id))
      : base.productIds || [];

  const orderDate = payload.orderDate ?? base.orderDate ?? new Date().toISOString().slice(0, 10);
  const status = payload.status ?? base.status ?? "pending";

  return {
    userId,
    productIds,
    orderDate,
    status
  };
}

// naya orderId generate karne ke liye (ORD111 type)
export function getNextOrderId(orders) {
  if (!orders.length) return "ORD101";

  const nums = orders
    .map((o) => {
      const m = String(o.orderId || "").match(/ORD(\d+)/);
      return m ? Number(m[1]) : null;
    })
    .filter((n) => n !== null);

  const next = nums.length ? Math.max(...nums) + 1 : 101;
  return `ORD${next}`;
}
