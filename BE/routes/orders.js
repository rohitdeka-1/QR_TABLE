import express from "express";
import { body } from "express-validator";
import * as controller from "../controllers/orderController.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  [
    body("tableId").notEmpty(),
    body("token").notEmpty(),
    body("items").isArray({ min: 1 }),
  ],
  controller.createOrder,
); // public via QR (token validated in controller)
router.get(
  "/",
  authenticate,
  authorize(["admin", "staff", "cashier"]),
  controller.listOrders,
);
router.get(
  "/:id",
  controller.getOrder,
);
router.patch(
  "/:id/status",
  authenticate,
  authorize(["staff", "admin"]),
  controller.updateStatus,
);
router.post(
  "/:id/mark-paid",
  authenticate,
  authorize(["cashier", "admin"]),
  controller.markPaid,
);

export default router;
