
import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

wishlistSchema.index({ user: 1 }, { sparse: true });
wishlistSchema.index({ sessionId: 1 }, { sparse: true });

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

export default Wishlist;
