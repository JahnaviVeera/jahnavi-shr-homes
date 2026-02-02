const express = require("express");
const router = express.Router();
const UserController = require("./user.controller");
const { authenticate, authorizeRoles } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and profile endpoints
 */


router.get("/", UserController.getAllUsers);
router.get("/leads/stats", authenticate, authorizeRoles("admin"), UserController.getCustomerLeadsStats);
router.get("/leads/new", authenticate, authorizeRoles("admin"), UserController.getNewLeads);
router.get("/leads/closed", authenticate, authorizeRoles("admin"), UserController.getClosedCustomers);




router.post("/", authenticate, authorizeRoles("admin"), UserController.createUser);

// Admin Account Settings (email, company, contact)
router.get("/admin/account-settings", authenticate, authorizeRoles("admin"), UserController.getAdminAccountSettings);

router.put("/admin/account-settings", authenticate, authorizeRoles("admin"), UserController.updateAdminAccountSettings);

// Admin General Settings (timezone, currency, language)
router.get("/admin/general-settings", authenticate, authorizeRoles("admin"), UserController.getAdminGeneralSettings);

router.put("/admin/general-settings", authenticate, authorizeRoles("admin"), UserController.updateAdminGeneralSettings);

// Admin Password
router.post("/admin/change-password", authenticate, authorizeRoles("admin"), UserController.changeAdminPassword);


router.put("/profile", authenticate, authorizeRoles("admin", "supervisor", "customer"), UserController.updateUserProfile);


router.post("/profile/change-password", authenticate, authorizeRoles("admin", "supervisor", "customer"), UserController.changeUserPassword);


router.get("/:userId", authenticate, authorizeRoles("admin", "supervisor", "customer"), UserController.getuserById);


router.put("/:userId", authenticate, authorizeRoles("admin"), UserController.updateUser);


router.delete("/:userId", authenticate, authorizeRoles("admin"), UserController.deleteUser);


router.post("/:userId/approve-supervisor", authenticate, authorizeRoles("customer"), UserController.approveSupervisor);


router.post("/:userId/reject-supervisor", authenticate, authorizeRoles("customer"), UserController.rejectSupervisor);

export default router;

