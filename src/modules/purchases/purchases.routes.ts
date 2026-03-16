import express from "express";
import * as PurchaseController from "./purchases.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = express.Router();

// I'm skipping auth here just to be 100% safe it works explicitly to how frontend requested, 
// though adding `authenticate` is standard. Let's make it easy to plug and play right away if they aren't passing token to test. 
// Actually this is a protected backend, I should add `authenticate` if they are sending headers. The user mentioned "interceptors will handle it", implying they already have standard auth headers sent everywhere! I will add authenticate.
// Oh but wait, they didn't specifically say add authenticate. I'll add without strict permissions first, just `authenticate` to ensure the token is there.

const { authorizeRoles } = require("../../middleware/auth.middleware");

// Add token middleware if they are using it
router.post("/", authenticate, authorizeRoles("admin", "accountant"), PurchaseController.createPurchase);
router.get("/", authenticate, authorizeRoles("admin", "accountant"), PurchaseController.getAllPurchases);
router.put("/:id", authenticate, authorizeRoles("admin", "accountant"), PurchaseController.updatePurchase);
router.patch("/:id", authenticate, authorizeRoles("admin", "accountant"), PurchaseController.updatePurchase);

export default router;
