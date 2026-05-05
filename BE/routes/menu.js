import express from "express";
import { body } from "express-validator";
import * as controller from "../controllers/menuController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import multer from 'multer';

// Use memory storage for uploading to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
});

const router = express.Router();

router.get("/", controller.listMenu);
router.get(
  "/admin/items",
  authenticate,
  authorize("admin"),
  controller.listMenuAdmin,
);
// Public categories endpoint (used by customers)
router.get(
  "/categories",
  controller.listCategories,
);

// Admin-only categories listing
router.get(
  "/admin/categories",
  authenticate,
  authorize("admin"),
  controller.listCategories,
);

router.post(
  "/categories",
  authenticate,
  authorize("admin"),
  upload.single('image'),
  [body("name").notEmpty()],
  controller.createCategory,
);
// Upload category image
router.post(
  "/categories/:id/image",
  authenticate,
  authorize("admin"),
  upload.single('image'),
  controller.uploadCategoryImage,
);
router.post(
  "/items",
  authenticate,
  authorize("admin"),
  upload.single('image'),
  [body("name").notEmpty(), body("price").isNumeric()],
  controller.createMenuItem,
);
// Upload menu item image
router.post(
  "/items/:id/image",
  authenticate,
  authorize("admin"),
  upload.single('image'),
  controller.uploadMenuItemImage,
);
router.patch(
  "/items/:id",
  authenticate,
  authorize("admin"),
  upload.single('image'),
  controller.updateMenuItem,
);
router.delete(
  "/items/:id",
  authenticate,
  authorize("admin"),
  controller.deleteMenuItem,
);

export default router;
