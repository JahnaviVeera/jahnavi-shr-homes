const express = require("express");
const router = express.Router();
const SupervisorController = require("./supervisor.controller");
const { authenticate, authorizeRoles } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Supervisors
 *     description: Supervisor management endpoints
 */

// Get all supervisors (Admin only can list all, but maybe user needs to see them? Assuming admin/user for now but let's stick to admin/public based on previous logic but restricting more safely)
// Actually, let's keep list open or restricted? Prompt said "Admin should only can create".
// Let's restrict list to Authenticated Users (Admin, User, Supervisor)
router.get("/", authenticate, authorizeRoles("admin", "supervisor", "user"), SupervisorController.getAllSupervisors);

// Create a new supervisor (Admin only)
router.post("/", authenticate, authorizeRoles("admin"), SupervisorController.createSupervisor);

// Assign project to supervisor (Admin only) - Must come before /:supervisorId route
router.post("/:supervisorId/assign-project", authenticate, authorizeRoles("admin"), SupervisorController.assignProjectToSupervisor);

// Remove project from supervisor (Admin only) - Must come before /:supervisorId route
router.delete("/:supervisorId/remove-project", authenticate, authorizeRoles("admin"), SupervisorController.removeProjectFromSupervisor);

// Get my profile (Authenticated Supervisor) - Must come before /:supervisorId route
router.get("/profile", authenticate, authorizeRoles("supervisor"), SupervisorController.getProfile);

// Update my profile (Authenticated Supervisor) - Must come before /:supervisorId route
router.put("/profile", authenticate, authorizeRoles("supervisor"), SupervisorController.updateProfile);

// Get my assigned projects (Authenticated Supervisor) - Must come before /:supervisorId route
router.get("/my-projects", authenticate, authorizeRoles("supervisor"), SupervisorController.getMyAssignedProjects);

// Get assigned projects count for supervisor - Must come before /:supervisorId route
router.get("/:supervisorId/assigned-projects-count", authenticate, authorizeRoles("admin", "supervisor"), SupervisorController.getAssignedProjectsCount);

// Get all assigned projects for supervisor - Must come before /:supervisorId route
router.get("/:supervisorId/assigned-projects", authenticate, authorizeRoles("admin", "supervisor", "user"), SupervisorController.getAssignedProjects);

// Get supervisor by ID
router.get("/:supervisorId", authenticate, authorizeRoles("admin", "supervisor", "user"), SupervisorController.getSupervisorById);

// Update supervisor (Admin only)
router.put("/:supervisorId", authenticate, authorizeRoles("admin"), SupervisorController.updateSupervisor);

// Delete supervisor (Admin only)
router.delete("/:supervisorId", authenticate, authorizeRoles("admin"), SupervisorController.deleteSupervisor);

export default router;


