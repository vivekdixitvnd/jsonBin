// server/models/usersModel.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // apna custom numeric ID (1,2,3...) - optional but useful for UI
    id: {
      type: Number,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

// Auto-increment numeric id when document is new
userSchema.pre("save", async function (next) {
  if (!this.isNew || this.id != null) {
    return next();
  }

  try {
    const lastUser = await mongoose
      .model("User")
      .findOne({})
      .sort({ id: -1 })
      .select("id");

    this.id = lastUser && lastUser.id != null ? lastUser.id + 1 : 1;
    next();
  } catch (err) {
    next(err);
  }
});

const User = mongoose.model("User", userSchema);
export default User;
