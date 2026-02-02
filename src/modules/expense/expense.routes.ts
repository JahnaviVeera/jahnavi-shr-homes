const express = require("express");
const router = express.Router();
const ExpenseController = require("./expense.controller");
const { authenticate, authorizeRoles } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Expenses
 *     description: Expense management endpoints for tracking project expenses
 */

// Get total expense count (must come before /:expenseId route)
router.get("/total-count", authenticate, authorizeRoles("admin", "supervisor"), ExpenseController.getTotalExpenseCount);

// Get expense summary for all projects (must come before /:expenseId route)
router.get("/summary/all-projects", authenticate, authorizeRoles("admin"), ExpenseController.getExpenseSummaryAllProjects);

// Get expense summary by project (must come before /:expenseId route)
router.get("/summary/:projectId", authenticate, authorizeRoles("admin", "supervisor"), ExpenseController.getExpenseSummaryByProject);

// Get expenses by project (must come before /:expenseId route)
router.get("/project/:projectId", authenticate, authorizeRoles("admin", "supervisor"), ExpenseController.getExpensesByProject);

// Get total expense count by project (must come before /:expenseId route)
router.get("/project/:projectId/total-count", authenticate, authorizeRoles("admin", "supervisor"), ExpenseController.getTotalExpenseCountByProject);

// Get total expense amount by project (must come before /:expenseId route)
router.get("/project/:projectId/total-amount", authenticate, authorizeRoles("admin", "supervisor"), ExpenseController.getTotalExpenseAmountByProject);

// Get expenses by category (must come before /:expenseId route)
router.get("/category/:category", authenticate, authorizeRoles("admin", "supervisor"), ExpenseController.getExpensesByCategory);

// Get all expenses
router.get("/", ExpenseController.getAllExpenses);

// Create a new expense (Admin only - Prompt says "Expenses" admin only. But previous logic allowed supervisor. Prompt takes precedence: "For all above routes admin should only can create")
// Wait, prompt said: "Admin privilages: 7)Expenses... For all above routes admin should only can create".
// Supervisor privileges: "1)Uploading dailyupdates 2)Material Usage".
// So Expenses creation is ADMIN ONLY.
router.post("/", authenticate, authorizeRoles("admin"), ExpenseController.createExpense);

// Get expense by ID
router.get("/:expenseId", authenticate, authorizeRoles("admin", "supervisor"), ExpenseController.getExpenseById);

// Update expense (Admin only)
router.put("/:expenseId", authenticate, authorizeRoles("admin"), ExpenseController.updateExpense);

// Delete expense (Admin only)
router.delete("/:expenseId", authenticate, authorizeRoles("admin"), ExpenseController.deleteExpense);

export default router;


