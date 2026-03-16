import express from "express";
import * as ReportController from "./reports.controller";
import { authenticate, authorizeRoles } from "../../middleware/auth.middleware";

const router = express.Router();

router.get(
    "/expenses", 
    authenticate, 
    authorizeRoles("admin", "accountant"), 
    ReportController.getConsolidatedExpenseReport
);

export default router;
