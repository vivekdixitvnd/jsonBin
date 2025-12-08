// server/models/couponsModel.js
export function validateCouponPayload(payload, existingCoupon) {
  const base = existingCoupon || {};

  const code = payload.code ?? base.code;
  if (!code) {
    throw new Error("Coupon code is required");
  }

  const discount =
    payload.discount !== undefined
      ? Number(payload.discount)
      : base.discount ?? 0;

  const isActive =
    payload.isActive !== undefined
      ? Boolean(payload.isActive)
      : base.isActive ?? true;

  const validTill = payload.validTill ?? base.validTill ?? null;

  return {
    code,
    discount,
    isActive,
    validTill
  };
}

export function getNextCouponId(coupons) {
  if (!coupons.length) return "C1";

  const nums = coupons
    .map((c) => {
      const m = String(c.id || "").match(/C(\d+)/);
      return m ? Number(m[1]) : null;
    })
    .filter((n) => n !== null);

  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `C${next}`;
}
