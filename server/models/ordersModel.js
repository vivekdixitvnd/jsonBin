import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    userId: {
      type: Number,
      required: true
    },

    productIds: [
      {
        type: Number,
        required: true
      }
    ],

    orderDate: {
      type: Date,
      default: Date.now
    },

    status: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true,
    strict: false
   }
);

const Order =
  mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
