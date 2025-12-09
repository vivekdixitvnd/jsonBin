import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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
  { timestamps: true,
    strict: false
   }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
