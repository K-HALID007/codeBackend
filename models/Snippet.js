import mongoose from "mongoose";

const snippetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a snippet name"],
      trim: true,
    },
    language: {
      type: String,
      default: "javascript",
      trim: true,
    },
    code: {
      type: String,
      default: "", // Make it optional with empty default
    },
    description: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Snippet = mongoose.model("Snippet", snippetSchema);

export default Snippet;
