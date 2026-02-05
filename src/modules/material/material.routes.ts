const express = require("express");
const router = express.Router();
const MaterialController = require("./material.controller");
const { authenticate, authorizeRoles } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Materials
 *     description: Material management endpoints
 */

// Get materials by project (must come before /:materialId route)
router.get("/project/:projectId", authenticate, authorizeRoles("admin", "supervisor", "customer"), MaterialController.getMaterialsByProject);

// Get total material count by project (must come before /:materialId route)
router.get("/project/:projectId/total-count", authenticate, authorizeRoles("admin", "supervisor"), MaterialController.getTotalMaterialCountByProject);

// Get all materials
router.get("/", authenticate, authorizeRoles("admin", "supervisor", "customer"), MaterialController.getAllMaterials);
router.get("/getallmaterials", authenticate, authorizeRoles("admin", "supervisor", "customer"), MaterialController.getAllMaterials);

// Get materials for logged-in supervisor
router.get("/supervisor/materials", authenticate, authorizeRoles("supervisor"), MaterialController.getSupervisorMaterials);

// Create a new material (Admin and Supervisor)
// Prompt says Admin: "materials usage ... admin should only can create"
// Prompt says Supervisor: "Material Usage"
// This implies both need write access.
router.post("/", authenticate, authorizeRoles("admin", "supervisor"), MaterialController.createMaterial);

// Get material by ID
router.get("/:materialId", authenticate, authorizeRoles("admin", "supervisor", "customer"), MaterialController.getMaterialById);

// Update material (Admin and Supervisor)
router.put("/:materialId", authenticate, authorizeRoles("admin", "supervisor"), MaterialController.updateMaterial);

// Delete material (Admin and Supervisor)
router.delete("/:materialId", authenticate, authorizeRoles("admin", "supervisor"), MaterialController.deleteMaterial);

export default router;


