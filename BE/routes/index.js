import express from "express";
import auth from "./auth.js";
import menu from "./menu.js";
import orders from "./orders.js";
import tables from "./tables.js";
import admin from "./admin.js";
import { tenantFromParams } from '../middlewares/tenant.js';

const router = express.Router();

// attach tenant context (from JWT or params/body) for all API routes
router.use(tenantFromParams);

router.use("/auth", auth);
router.use("/menu", menu);
router.use("/orders", orders);
router.use("/tables", tables);
router.use("/admin", admin);
console.log('Routes: mounted /api/admin');

export default router;
