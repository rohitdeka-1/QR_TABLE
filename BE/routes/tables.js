import express from "express";
import { body } from "express-validator";
import * as controller from "../controllers/tableController.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.get(
  "/session/:accessCode",
  controller.resolveSession,
);
router.get(
  "/by-code/:code",
  controller.getTableByCode,
);
router.get(
  "/by-number/:tableNumber",
  controller.getTableByNumber,
);
router.get(
  "/",
  authenticate,
  authorize(["admin", "staff"]),
  controller.listTables,
);
router.post(
  "/sync-range",
  authenticate,
  authorize("admin"),
  [body("startNumber").isInt({ min: 1 }), body("endNumber").isInt({ min: 1 })],
  controller.syncTableRange,
);
router.post(
  "/",
  authenticate,
  authorize("admin"),
  [body("tableNumber").notEmpty()],
  controller.createTable,
);
router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  controller.updateTable,
);
router.patch(
  "/:id/regenerate-qr",
  authenticate,
  authorize("admin"),
  controller.regenerateQr,
);
router.get(
  "/:id/qr",
  authenticate,
  authorize(["admin", "staff"]),
  controller.getQr,
);
router.get(
  "/:id/qr/png",
  authenticate,
  authorize(["admin", "staff"]),
  controller.getQrPng,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  controller.deleteTable,
);
router.delete(
  "/",
  authenticate,
  authorize("admin"),
  controller.deleteAllTables,
);
router.get(
  "/download-all-qr",
  authenticate,
  authorize("admin"),
  controller.downloadAllQrs,
);
router.patch(
  "/set-restaurant-location-global",
  authenticate,
  authorize("admin"),
  controller.setRestaurantLocationGlobal,
);
router.patch(
  "/:tableId/set-location",
  authenticate,
  authorize("admin"),
  controller.setRestaurantLocation,
);

export default router;
