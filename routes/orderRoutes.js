import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  createOrder,
  getOrderById,
  getOrderByNumber,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/", protect, createOrder);
router.get("/user", protect, getUserOrders);
router.get("/number/:orderNumber", protect, getOrderByNumber);
router.get("/:id", protect, getOrderById);
router.put("/:id/cancel", protect, cancelOrder);


router.get("/admin/all", protect, adminOnly, getAllOrders);
router.put("/admin/:id/status", protect, adminOnly, updateOrderStatus);

export default router;