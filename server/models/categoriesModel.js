import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
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
    description: {
      type: String,
      default: ""
    }
  },
  { timestamps: true,
    strict: false }
);

const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);

export default Category;
