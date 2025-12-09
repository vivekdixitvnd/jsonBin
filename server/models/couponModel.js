import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    isActive: {
      type: Boolean,
      default: true
    },
    validTill: {
      type: Date
    }
  },
  { timestamps: true,
    strict: false 
  }
);

const Coupon =
  mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

export default Coupon;
