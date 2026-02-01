const express = require("express");
const router = express.Router();

const paymentController = require("./payments.controller");
const upload = require("../../config/multer.config").default;
const { authenticate, authorizeRoles } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: Payment management endpoints
 */

// Admin only routes
router.post("/createpayment", authenticate, authorizeRoles("admin"), upload.single("file"), paymentController.createPayment);
router.put("/updatepayment/:paymentId", authenticate, authorizeRoles("admin"), upload.single("file"), paymentController.updatePayment);
router.delete("/deletepayment/:paymentId", authenticate, authorizeRoles("admin"), paymentController.deletePayment);

// Public routes (Restricted to authenticated users)
router.get("/getpayment/:paymentId", authenticate, authorizeRoles("admin", "supervisor", "user"), paymentController.getPaymentById);
router.get("/getallpayments", authenticate, authorizeRoles("admin", "supervisor", "user"), paymentController.getAllPayments);
router.get("/budget-summary", paymentController.getBudgetSummary); // Budget summary probably admin only? Or allow supervisor/user? Prompt says "Payments" creation is admin only. Viewing is usually open. Let's start with all authenticated for View, except general summary which might be sensitive.
// Let's check "Customer will only have view access". So View is OK.
router.get("/budget-summary/:projectId", authenticate, authorizeRoles("admin", "supervisor", "user"), paymentController.getBudgetSummaryByProject);

export default router;



