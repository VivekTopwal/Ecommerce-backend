import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
} from "../controllers/wishlistController.js";

const router = express.Router();

router.use(protect);

router.get("/", getWishlist);
router.post("/add", addToWishlist);
router.post("/toggle", toggleWishlist);
router.delete("/remove/:productId", removeFromWishlist);

export default router;