import express from "express";
import {
  getPublicCategories,
  getCategoryBySlug,
} from "../controllers/categoryController.js";
import { 
  getPublicProducts, 
  getProductBySlug 
} from "../controllers/productController.js";

const router = express.Router();

router.get("/categories", getPublicCategories);

router.get("/categories/slug/:slug", getCategoryBySlug);

router.get("/products", getPublicProducts);

router.get("/products/:slug", getProductBySlug);

export default router;