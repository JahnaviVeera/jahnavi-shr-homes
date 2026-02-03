const express = require("express");
const router = express.Router();
const DocumentController = require("./documents.controller");
const upload = require("../../config/multer.config").default;
const { authenticate, authorizeRoles } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Documents
 *     description: Document management endpoints for Agreements, plans, permits, and others
 */

// POST - Create Document (Admin only)
router.post("/", authenticate, authorizeRoles("admin"), upload.single("file"), DocumentController.createDocument);

// GET - Get All Documents (with optional filters: ?documentType=Agreement&projectId=uuid)
router.get("/", authenticate, authorizeRoles("admin", "customer"), DocumentController.getAllDocuments);

// GET - Get Document Counts by Type
router.get("/counts/by-type", authenticate, authorizeRoles("admin", "supervisor", "customer"), DocumentController.getDocumentCountsByType);

// GET - Get Documents by Project ID
router.get("/project/:projectId", authenticate, authorizeRoles("admin", "customer"), DocumentController.getDocumentsByProject);

// GET - Get Document by ID
router.get("/:documentId", authenticate, authorizeRoles("admin", "supervisor", "customer"), DocumentController.getDocumentById);

// GET - Download Document File
router.get("/:documentId/download", authenticate, authorizeRoles("admin", "supervisor", "customer"), DocumentController.downloadDocument);

// PUT - Update Document (Admin only)
router.put("/:documentId", authenticate, authorizeRoles("admin"), upload.single("file"), DocumentController.updateDocument);

// DELETE - Delete Document (Admin only)
router.delete("/:documentId", authenticate, authorizeRoles("admin"), DocumentController.deleteDocument);

export default router;

