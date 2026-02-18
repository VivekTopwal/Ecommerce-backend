import express from "express";
import { optionalAuth, protect } from "../middlewares/authMiddleware.js";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  mergeWishlist,
} from "../controllers/wishlistController.js";

const router = express.Router();
router.use(optionalAuth);
// router.use(protect);

router.get("/", getWishlist);
router.post("/add", addToWishlist);
router.post("/toggle", toggleWishlist);
router.delete("/remove/:productId", removeFromWishlist);

router.post("/merge", protect, mergeWishlist);

export default router;