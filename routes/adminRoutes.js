import express from "express";
import upload from "../middlewares/upload.js";
import { addProduct, getAllProducts, getProductBySlug, deleteProduct, togglePublish, updateProduct } from "../controllers/productController.js";
import { addCategory, getAllCategories, getCategoryBySlug, getCategoryById, deleteCategory, toggleCategoryPublish, updateCategory, getPublicCategories } from "../controllers/categoryController.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";


const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.post("/add-product", upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "featureImages", maxCount: 5 },
]), addProduct);
router.get("/products", getAllProducts);
router.get('/products/:slug', getProductBySlug);
router.get('/admin/products/:slug', getProductBySlug);


router.delete("/products/:id", deleteProduct);
router.put("/products/:id", upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "featureImages", maxCount: 5 },
]), updateProduct);
router.patch("/products/:id/publish", togglePublish);



router.post("/add-category", upload.single("icon"), addCategory);

router.get("/categories", getAllCategories);

router.get('/categories/slug/:slug', getCategoryBySlug);

router.get('/categories/:id', getCategoryById);

router.put("/categories/:id", upload.single("icon"), updateCategory);

router.delete("/categories/:id", deleteCategory);

router.patch("/categories/:id/publish", toggleCategoryPublish);








export default router;
