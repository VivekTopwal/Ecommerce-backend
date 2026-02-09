import express from "express";
import {
  register,
  login,
  adminLogin,
  getMe,
  updateProfile,
  changePassword,
  logout,
} from "../controllers/authController.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.post("/register", register);
router.post("/login", login);
router.post("/admin/login", adminLogin);


router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.post("/logout", protect, logout);

export default router;