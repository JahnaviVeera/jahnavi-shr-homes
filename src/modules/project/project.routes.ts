const express = require("express");
const router = express.Router();

const projectController = require("./project.controller");
const { authenticate, authorizeRoles } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management endpoints
 */


router.post("/createproject", authenticate, authorizeRoles("admin"), projectController.createProject);


router.put("/updateproject/:projectId", authenticate, authorizeRoles("admin"), projectController.updateProject);


router.delete("/deleteproject/:projectId", authenticate, authorizeRoles("admin"), projectController.deleteProject);


router.get("/getproject/:projectId", authenticate, authorizeRoles("admin", "supervisor", "customer"), projectController.getProjectById);



router.get("/getallprojects", authenticate, authorizeRoles("admin", "supervisor", "customer"), projectController.getAllProjects);

router.get("/project-summary", authenticate, authorizeRoles("customer"), projectController.getProjectSummary);

export default router;

