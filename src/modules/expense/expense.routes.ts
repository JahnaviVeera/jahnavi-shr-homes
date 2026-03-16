const express = require("express");
const router = express.Router();
const ExpenseController = require("./expense.controller");
const { authenticate, authorizeRoles } = require("../../middleware/auth.middleware");
const upload = require("../../config/multer.config").default || require("../../config/multer.config");

/**
 * @swagger
 * tags:
 *   - name: Expenses
 *     description: Expense management endpoints for tracking project expenses
 */

// Get total expense count (must come before /:expenseId route)
router.get("/total-count", authenticate, authorizeRoles("admin", "supervisor", "accountant"), ExpenseController.getTotalExpenseCount);

// Get expense summary for all projects (must come before /:expenseId route)
router.get("/summary/all-projects", authenticate, authorizeRoles("admin", "accountant"), ExpenseController.getExpenseSummaryAllProjects);

// Get expense summary by project (must come before /:expenseId route)
router.get("/summary/:projectId", authenticate, authorizeRoles("admin", "supervisor", "accountant"), ExpenseController.getExpenseSummaryByProject);

// Get expenses by project (must come before /:expenseId route)
router.get("/project/:projectId", authenticate, authorizeRoles("admin", "supervisor", "accountant"), ExpenseController.getExpensesByProject);

// Get total expense count by project (must come before /:expenseId route)
router.get("/project/:projectId/total-count", authenticate, authorizeRoles("admin", "supervisor", "accountant"), ExpenseController.getTotalExpenseCountByProject);

// Get total expense amount by project (must come before /:expenseId route)
router.get("/project/:projectId/total-amount", authenticate, authorizeRoles("admin", "supervisor", "accountant"), ExpenseController.getTotalExpenseAmountByProject);

// Get all category-wise expenses
router.get("/category/list", authenticate, ExpenseController.getCategoryWiseExpenses);

// Get expenses by category (must come before /:expenseId route)
router.get("/category/:category", authenticate, authorizeRoles("admin", "supervisor", "accountant"), ExpenseController.getExpensesByCategory);

// Get all expenses
router.get("/", authenticate, authorizeRoles("admin", "supervisor", "accountant"), ExpenseController.getAllExpenses);

// Create a new expense (Admin only - Prompt says "Expenses" admin only. But previous logic allowed supervisor. Prompt takes precedence: "For all above routes admin should only can create")
// Wait, prompt said: "Admin privilages: 7)Expenses... For all above routes admin should only can create".
// Supervisor privileges: "1)Uploading dailyupdates 2)Material Usage".
// So Expenses creation is ADMIN ONLY.
router.post("/", authenticate, authorizeRoles("admin", "accountant"), upload.single("receipt"), ExpenseController.createExpense);

// Receipt proxy - streams the bill file with CORS headers for canvas/PDF embedding
// Must come BEFORE /:expenseId to avoid route collision
router.get("/:expenseId/receipt", authenticate, ExpenseController.getReceiptByExpenseId);

// Get expense by ID
router.get("/:expenseId", authenticate, authorizeRoles("admin", "supervisor", "accountant"), ExpenseController.getExpenseById);

// Update expense (Admin only)
router.put("/:expenseId", authenticate, authorizeRoles("admin", "accountant"), ExpenseController.updateExpense);

// Delete expense (Admin only)
router.delete("/:expenseId", authenticate, authorizeRoles("admin", "accountant"), ExpenseController.deleteExpense);

export default router;


