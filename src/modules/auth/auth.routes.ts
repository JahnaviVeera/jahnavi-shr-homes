import express from "express";
import * as authController from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication endpoints for Admin, User, and Supervisor
 */


router.post("/admin/login", authController.adminLogin);


router.post("/user/login", authController.userLogin);


router.post("/supervisor/login", authController.supervisorLogin);

router.post("/refresh", authController.refreshAccessToken);

router.post("/logout", authenticate, authController.logout);


export default router;
