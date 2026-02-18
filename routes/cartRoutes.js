import express from "express";
import { optionalAuth, protect } from "../middlewares/authMiddleware.js";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCart,
} from "../controllers/cartController.js";

const router = express.Router();
router.use(optionalAuth);
// router.use(protect);
router.get("/", getCart);
router.post("/add", addToCart);
router.put("/update", updateCartItem);
router.delete("/remove/:productId", removeFromCart);
router.delete("/clear", clearCart);

router.post("/merge", protect, mergeCart);
export default router;