import express from "express";
import { body } from "express-validator";
import * as controller from "../controllers/menuController.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", controller.listMenu);
router.get(
  "/admin/items",
  authenticate,
  authorize("admin"),
  controller.listMenuAdmin,
);
router.get(
  "/categories",
  authenticate,
  authorize("admin"),
  controller.listCategories,
);

router.post(
  "/categories",
  authenticate,
  authorize("admin"),
  [body("name").notEmpty()],
  controller.createCategory,
);
router.post(
  "/items",
  authenticate,
  authorize("admin"),
  [body("name").notEmpty(), body("price").isNumeric()],
  controller.createMenuItem,
);
router.patch(
  "/items/:id",
  authenticate,
  authorize("admin"),
  controller.updateMenuItem,
);
router.delete(
  "/items/:id",
  authenticate,
  authorize("admin"),
  controller.deleteMenuItem,
);

export default router;
