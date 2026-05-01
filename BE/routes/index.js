import express from "express";
import auth from "./auth.js";
import menu from "./menu.js";
import orders from "./orders.js";
import tables from "./tables.js";

const router = express.Router();

router.use("/auth", auth);
router.use("/menu", menu);
router.use("/orders", orders);
router.use("/tables", tables);

export default router;
