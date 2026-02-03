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

// ============================================
// General / User Routes
// ============================================

// Get total amount of a specific quotation (Authenticated)
router.get("/:quotationId/total-amount", authenticate, authorizeRoles("admin", "supervisor", "customer"), QuotationController.getQuotationTotalAmount);

// Download quotation file (Authenticated)
router.get("/:quotationId/download", authenticate, authorizeRoles("admin", "supervisor", "customer"), QuotationController.downloadQuotation);


// Get all quotations (Admin, Supervisor, maybe User?)
router.get("/", authenticate, authorizeRoles("admin", "customer"), QuotationController.getAllQuotations);


// Get pending quotations (must be before /:quotationId route)
router.get("/pending", authenticate, authorizeRoles("admin", "customer"), QuotationController.getPendingQuotations);

// Get quotations by status (must be before /:quotationId route)
router.get("/status/:status", authenticate, authorizeRoles("admin", "customer"), QuotationController.getQuotationsByStatus);

// Get quotations by project (must be before /:quotationId route)
router.get("/project/:projectId", authenticate, authorizeRoles("admin", "supervisor", "customer"), QuotationController.getQuotationsByProject);

// Get quotations by user (must be before /:quotationId route)
router.get("/user/:userId", authenticate, authorizeRoles("admin", "customer"), QuotationController.getQuotationsByUserId);

// Approve quotation (User only)
router.post("/:quotationId/approve", authenticate, authorizeRoles("customer"), QuotationController.approveQuotation);

// Reject quotation (User only)
router.post("/:quotationId/reject", authenticate, authorizeRoles("customer"), QuotationController.rejectQuotation);

// Get quotation by ID
router.get("/:quotationId", authenticate, authorizeRoles("admin", "supervisor", "customer"), QuotationController.getQuotationById);

// Update quotation (Admin only)
router.put("/:quotationId", authenticate, authorizeRoles("admin"), upload.single("file"), QuotationController.updateQuotation);

// Resend quotation (Admin only)
router.post("/:quotationId/resend", authenticate, authorizeRoles("admin"), QuotationController.resendQuotation);

// Delete quotation (Admin only)
router.delete("/:quotationId", authenticate, authorizeRoles("admin"), QuotationController.deleteQuotation);

export default router;


