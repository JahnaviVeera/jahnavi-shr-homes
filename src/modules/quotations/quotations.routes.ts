const express = require("express");
const router = express.Router();
const QuotationController = require("./quotations.controller");
const upload = require("../../config/multer.config").default;
const { authenticate, authorizeRoles } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Quotations
 *     description: Quotation management endpoints
 */

// ============================================
// Admin Routes
// ============================================

// Create a new quotation (Admin only)
router.post("/", authenticate, authorizeRoles("admin"), upload.single("file"), QuotationController.createQuotation);
router.get("/:quotationId/total-amount", authenticate, authorizeRoles("admin", "supervisor", "customer"), QuotationController.getQuotationTotalAmount);
router.get("/:quotationId/download", authenticate, authorizeRoles("admin", "supervisor", "customer"), QuotationController.downloadQuotation);
router.get("/", authenticate, authorizeRoles("admin", "customer"), QuotationController.getAllQuotations);
router.get("/pending", authenticate, authorizeRoles("admin", "customer"), QuotationController.getPendingQuotations);
router.get("/status/:status", authenticate, authorizeRoles("admin", "customer"), QuotationController.getQuotationsByStatus);
router.get("/project/:projectId", authenticate, authorizeRoles("admin", "supervisor", "customer"), QuotationController.getQuotationsByProject);
router.get("/user/:userId", authenticate, authorizeRoles("admin", "customer"), QuotationController.getQuotationsByUserId);

// Approve quotation (User only)
router.post("/:quotationId/approve", authenticate, authorizeRoles("customer"), QuotationController.approveQuotation);

// Reject quotation (User only)
router.post("/:quotationId/reject", authenticate, authorizeRoles("customer"), QuotationController.rejectQuotation);
router.get("/:quotationId", authenticate, authorizeRoles("admin", "supervisor", "customer"), QuotationController.getQuotationById);
router.put("/:quotationId", authenticate, authorizeRoles("admin"), upload.single("file"), QuotationController.updateQuotation);
router.post("/:quotationId/resend", authenticate, authorizeRoles("admin"), QuotationController.resendQuotation);
router.delete("/:quotationId", authenticate, authorizeRoles("admin"), QuotationController.deleteQuotation);

export default router;


