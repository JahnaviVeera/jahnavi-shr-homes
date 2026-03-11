const express = require("express");
const router = express.Router();
const DailyUpdatesController = require("./daily-updates.controller");
const upload = require("../../config/multer.config").default;
const { authenticate, authorizeRoles } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Daily Updates
 *     description: Daily construction updates management endpoints
 */

// Get daily updates by status for user (Authenticated Customer) - Must come before /:dailyUpdateId
router.get("/user/status/:status", authenticate, authorizeRoles("customer"), DailyUpdatesController.getDailyUpdatesByStatusForUser);

// Get all daily updates for a user (Authenticated Customer)
router.get("/user/updates", authenticate, authorizeRoles("customer"), DailyUpdatesController.getDailyUpdatesForUser);

// Get all daily updates
router.get("/", authenticate, authorizeRoles("admin", "supervisor", "customer"), DailyUpdatesController.getAllDailyUpdates);

// Get pending daily updates
router.get("/pending", authenticate, authorizeRoles("admin", "supervisor", "customer"), DailyUpdatesController.getPendingDailyUpdates);

// Get approved daily updates
router.get("/approved", authenticate, authorizeRoles("admin", "supervisor", "customer"), DailyUpdatesController.getApprovedDailyUpdates);

// Get rejected daily updates
router.get("/rejected", authenticate, authorizeRoles("admin", "supervisor", "customer"), DailyUpdatesController.getRejectedDailyUpdates);

// Get daily updates for assigned projects (Authenticated Supervisor) - Must come before /:dailyUpdateId
router.get("/supervisor/assigned-projects", authenticate, authorizeRoles("supervisor"), DailyUpdatesController.getDailyUpdatesForSupervisor);

// Get supervisor stats (Public - Supervisor ID via query param) - Keeping it public as requested previously, or restricting to admin/supervisor? Prompt said "Supervisor privileges...". Let's restrict to authenticated users at least.
// Let's protect it. "Supervisor privileges - Uploading dailyupdates...". Stats could be public or admin. I'll make it Auth required for now.
router.get("/supervisor/stats", authenticate, authorizeRoles("admin", "supervisor"), DailyUpdatesController.getSupervisorStats);

// Get construction timeline for a project (Admin or Supervisor)
router.get("/project/:projectId/timeline", authenticate, authorizeRoles("admin", "supervisor", "customer"), DailyUpdatesController.getConstructionTimeline);

// Create a new daily update (Supervisor only)
// Matches POST /api/daily-updates
// Body must include 'constructionStage'. Optional: 'image', 'video'
router.post("/", authenticate, authorizeRoles("supervisor"), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), DailyUpdatesController.createDailyUpdate);

// Get all admin daily updates (Admin & Supervisor only)
// Matches GET /api/daily-updates/admin/all
router.get("/admin/all", authenticate, authorizeRoles("admin", "supervisor"), DailyUpdatesController.getAllAdminDailyUpdates);

// Create a new admin daily update (Supervisor only)
// Matches POST /api/daily-updates/admin
// Body must include 'projectId'. Optional: 'quantityConsumption', 'labourWorkers', 'image'
router.post("/admin", authenticate, authorizeRoles("supervisor"), upload.fields([{ name: 'image', maxCount: 1 }]), DailyUpdatesController.createAdminDailyUpdate);

// Download daily update image
// Must come before /:dailyUpdateId if using regex, but here it's fine as "image" is literal
router.get("/:dailyUpdateId/image", authenticate, authorizeRoles("admin", "supervisor", "customer"), DailyUpdatesController.downloadImage);

// Download daily update video
router.get("/:dailyUpdateId/video", authenticate, authorizeRoles("admin", "supervisor", "customer"), DailyUpdatesController.downloadVideo);

// Request approval for a daily update (Supervisor only) — changes status from draft/pending → Approval_Requested
router.put("/:dailyUpdateId/request-approval", authenticate, authorizeRoles("supervisor"), DailyUpdatesController.requestApprovalForDailyUpdate);

// Admin Approval/Rejection
router.put("/:dailyUpdateId/approve", authenticate, authorizeRoles("admin"), DailyUpdatesController.adminApproveUpdate);
router.put("/:dailyUpdateId/reject", authenticate, authorizeRoles("admin"), DailyUpdatesController.adminRejectUpdate);

// Customer Approval/Rejection
router.put("/:dailyUpdateId/customer-approve", authenticate, authorizeRoles("customer"), DailyUpdatesController.customerApproveUpdate);
router.put("/:dailyUpdateId/customer-reject", authenticate, authorizeRoles("customer"), DailyUpdatesController.customerRejectUpdate);

// Add feedback to daily update (Customer only)
router.post("/:dailyUpdateId/feedback", authenticate, authorizeRoles("customer"), DailyUpdatesController.addFeedback);

// Mark stage as complete (Supervisor)
router.post("/stage/mark-complete", authenticate, authorizeRoles("supervisor"), DailyUpdatesController.markStageComplete);

// Approve stage (Customer)
router.post("/stage/approve", authenticate, authorizeRoles("customer"), DailyUpdatesController.approveStage);

// Get daily update by ID (General access, maybe restricted later?)
router.get("/:dailyUpdateId", authenticate, authorizeRoles("admin", "supervisor", "customer"), DailyUpdatesController.getDailyUpdateById);

// Update daily update (Supervisor only)
// Matches PUT /api/daily-updates/:dailyUpdateId
router.put("/:dailyUpdateId", authenticate, authorizeRoles("supervisor"), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), DailyUpdatesController.updateDailyUpdate);

// Delete daily update (Supervisor only)
router.delete("/:dailyUpdateId", authenticate, authorizeRoles("supervisor"), DailyUpdatesController.deleteDailyUpdate);

export default router;
