import express from "express";
import {
  getPublicCategories,
  getCategoryBySlug,
} from "../controllers/categoryController.js";
import { 
  getAllProducts, 
  getProductBySlug 
} from "../controllers/productController.js";

const router = express.Router();

router.get("/categories", getPublicCategories);

router.get("/categories/slug/:slug", getCategoryBySlug);

router.get("/products", getAllProducts);

router.get("/products/:slug", getProductBySlug);

export default router;