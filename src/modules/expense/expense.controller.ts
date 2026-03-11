import type { Request, Response } from "express";
const ExpenseServices = require("./expense.services");
import { fileUploadService } from "../../services/fileUpload.service";

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

/**
 * @swagger
 * /api/expense:
 *   post:
 *     summary: Create a new expense (Admin and Supervisor only)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["projectId", "category", "amount", "date"]
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               category:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: string
 *                       example: "Labour"
 *                     workerName:
 *                       type: string
 *                       example: "Ramesh Kumar"
 *                     amount:
 *                       type: number
 *                     paymentMode:
 *                       type: string
 *                       example: "Cash"
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 example: 5000.00
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-16"
 *               description:
 *                 type: string
 *                 example: "Payment for construction workers"
 *     responses:
 *       201:
 *         description: Expense created successfully
 *       400:
 *         description: Bad request - Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or supervisor privileges required
 */
exports.createExpense = async (req: MulterRequest, res: Response) => {
    try {
        let { category, ...rest } = req.body;

        // Form data sends complex objects as strings, so we must parse it
        if (typeof category === 'string') {
            try {
                category = JSON.parse(category);
            } catch (error) {
                return res.status(400).json({ success: false, message: "Invalid category format layout in FormData" });
            }
        }

        const expenseDataInput = { ...rest, category };

        // Handle File Upload if provided
        if (req.file) {
            try {
                const uploadResult = await fileUploadService.uploadFile({
                    file: req.file,
                    bucket: 'documents', // Storing in existing documents bucket, categorized by folder
                    folder: 'expenses'
                });
                expenseDataInput.receiptUrl = uploadResult.publicUrl;
            } catch (uploadError) {
                return res.status(500).json({ success: false, message: "Failed to upload receipt file" });
            }
        }

        const expenseData = await ExpenseServices.createExpense(expenseDataInput);

        return res.status(201).json({
            success: true,
            message: "Expense created successfully",
            data: expenseData,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/expense/{expenseId}:
 *   get:
 *     summary: Get an expense by ID
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Expense fetched successfully
 *       400:
 *         description: Bad request - Expense not found
 */
exports.getExpenseById = async (req: Request, res: Response) => {
    try {
        const { expenseId } = req.params;
        const expense = await ExpenseServices.getExpenseById(expenseId);

        return res.status(200).json({
            success: true,
            message: "Expense fetched successfully",
            data: expense
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * Proxy endpoint to stream the receipt file with CORS headers.
 * This is needed for client-side PDF/canvas generation where
 * the browser enforces CORS on cross-origin image access.
 * 
 * GET /api/expense/:expenseId/receipt
 */
exports.getReceiptByExpenseId = async (req: Request, res: Response) => {
    try {
        const { expenseId } = req.params;
        const expense = await ExpenseServices.getExpenseById(expenseId);

        if (!expense || !expense.receiptUrl) {
            return res.status(404).json({
                success: false,
                message: "No receipt found for this expense"
            });
        }

        // Fetch the file from Supabase public URL
        const fetchResponse = await fetch(expense.receiptUrl);
        if (!fetchResponse.ok) {
            return res.status(502).json({
                success: false,
                message: `Failed to fetch receipt from storage: ${fetchResponse.statusText}`
            });
        }

        const contentType = fetchResponse.headers.get("content-type") || "application/octet-stream";
        const buffer = await fetchResponse.arrayBuffer();

        // Set CORS headers explicitly to allow canvas/PDF embedding on any frontend origin
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Length", buffer.byteLength.toString());
        res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours

        return res.status(200).send(Buffer.from(buffer));
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/expense:
 *   get:
 *     summary: Get all expenses
 *     tags: [Expenses]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by description, category, or project name
 *     responses:
 *       200:
 *         description: Expenses fetched successfully
 */
exports.getAllExpenses = async (req: Request, res: Response) => {
    try {
        const { search } = req.query;
        const expenses = await ExpenseServices.getAllExpenses(search as string);

        return res.status(200).json({
            success: true,
            message: "Expenses fetched successfully",
            data: expenses
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/expense/category/list:
 *   get:
 *     summary: Get expenses by categorized lists
 *     tags: [Expenses]
 *     responses:
 *       200:
 *         description: Categorized Expenses fetched successfully
 */
exports.getCategoryWiseExpenses = async (req: Request, res: Response) => {
    try {
        const expenses = await ExpenseServices.getCategoryWiseExpenses();

        return res.status(200).json({
            success: true,
            message: "Category-wise expenses fetched successfully",
            data: expenses
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/expense/project/{projectId}:
 *   get:
 *     summary: Get expenses by project ID
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Expenses fetched successfully
 */
exports.getExpensesByProject = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const expenses = await ExpenseServices.getExpensesByProject(projectId);

        return res.status(200).json({
            success: true,
            message: "Expenses fetched successfully",
            data: expenses
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/expense/category:
 *   get:
 *     summary: Get expenses by category (deprecated for array categories)
 */
exports.getExpensesByCategory = async (req: Request, res: Response) => {
    try {
        const { category } = req.params;
        const expenses = await ExpenseServices.getExpensesByCategory(category);

        return res.status(200).json({
            success: true,
            message: "Expenses fetched successfully",
            data: expenses
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/expense/total-count:
 *   get:
 *     summary: Get total expense count
 *     tags: [Expenses]
 *     responses:
 *       200:
 *         description: Total expense count fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCount:
 *                       type: integer
 */
exports.getTotalExpenseCount = async (req: Request, res: Response) => {
    try {
        const result = await ExpenseServices.getTotalExpenseCount();

        return res.status(200).json({
            success: true,
            message: "Total expense count fetched successfully",
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/expense/project/{projectId}/total-count:
 *   get:
 *     summary: Get total expense count by project
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Total expense count by project fetched successfully
 */
exports.getTotalExpenseCountByProject = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const result = await ExpenseServices.getTotalExpenseCountByProject(projectId);

        return res.status(200).json({
            success: true,
            message: "Total expense count by project fetched successfully",
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/expense/project/{projectId}/total-amount:
 *   get:
 *     summary: Get total expense amount by project
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Total expense amount by project fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     projectId:
 *                       type: string
 *                     totalAmount:
 *                       type: number
 *                     count:
 *                       type: integer
 */
exports.getTotalExpenseAmountByProject = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const result = await ExpenseServices.getTotalExpenseAmountByProject(projectId);

        return res.status(200).json({
            success: true,
            message: "Total expense amount by project fetched successfully",
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/expense/{expenseId}:
 *   put:
 *     summary: Update an expense (Admin and Supervisor only)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: string
 *                     workerName:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     paymentMode:
 *                       type: string
 *               amount:
 *                 type: number
 *                 format: decimal
 *               date:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *               projectId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Expense updated successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or supervisor privileges required
 */
exports.updateExpense = async (req: Request, res: Response) => {
    try {
        const { expenseId } = req.params;
        const updatedExpense = await ExpenseServices.updateExpense(expenseId, req.body);

        return res.status(200).json({
            success: true,
            message: "Expense updated successfully",
            data: updatedExpense
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/expense/{expenseId}:
 *   delete:
 *     summary: Delete an expense (Admin and Supervisor only)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Expense deleted successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or supervisor privileges required
 */
exports.deleteExpense = async (req: Request, res: Response) => {
    try {
        const { expenseId } = req.params;
        const result = await ExpenseServices.deleteExpense(expenseId);

        return res.status(200).json({
            success: true,
            message: "Expense deleted successfully",
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/expense/summary/all-projects:
 *   get:
 *     summary: Get expense summary for all projects
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     description: Returns expense details for all projects including project name, total expense, and expenses per month
 *     responses:
 *       200:
 *         description: Expense summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           projectId:
 *                             type: string
 *                             format: uuid
 *                             example: "d1f8ac24-57c1-47aa-ae6a-092de6e55553"
 *                           projectName:
 *                             type: string
 *                             example: "Luxury Villa Project"
 *                           totalExpense:
 *                             type: number
 *                             format: decimal
 *                             example: 150000.50
 *                             description: Total expense for the project
 *                           expensesPerMonth:
 *                             type: array
 *                             description: Array of monthly expenses
 *                             items:
 *                               type: object
 *                               properties:
 *                                 month:
 *                                   type: string
 *                                   example: "2024-12"
 *                                   description: Month in YYYY-MM format
 *                                 totalExpense:
 *                                   type: number
 *                                   format: decimal
 *                                   example: 50000.25
 *                                   description: Total expense for that month
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
exports.getExpenseSummaryAllProjects = async (req: Request, res: Response) => {
    try {
        const summary = await ExpenseServices.getExpenseSummaryAllProjects();

        return res.status(200).json({
            success: true,
            message: "Expense summary for all projects fetched successfully",
            data: summary
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/expense/summary/{projectId}:
 *   get:
 *     summary: Get expense summary for a specific project
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     description: Returns project details along with total expenses and expenses per month for the specified project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The project ID to get expense summary for
 *     responses:
 *       200:
 *         description: Expense summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         projectId:
 *                           type: string
 *                           format: uuid
 *                         projectName:
 *                           type: string
 *                           example: "Luxury Villa Project"
 *                         projectType:
 *                           type: string
 *                           example: "villa"
 *                         location:
 *                           type: string
 *                           example: "Downtown"
 *                         totalBudget:
 *                           type: number
 *                           format: decimal
 *                           example: 1000000
 *                         startDate:
 *                           type: string
 *                           format: date
 *                         expectedCompletion:
 *                           type: string
 *                           format: date
 *                         totalExpense:
 *                           type: number
 *                           format: decimal
 *                           example: 150000.50
 *                           description: Total expense for the project
 *                         expensesPerMonth:
 *                           type: array
 *                           description: Array of monthly expenses
 *                           items:
 *                             type: object
 *                             properties:
 *                               month:
 *                                 type: string
 *                                 example: "2024-12"
 *                                 description: Month in YYYY-MM format
 *                               totalExpense:
 *                                 type: number
 *                                 format: decimal
 *                                 example: 50000.25
 *                                 description: Total expense for that month
 *       400:
 *         description: Bad request - Project not found or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
exports.getExpenseSummaryByProject = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const summary = await ExpenseServices.getExpenseSummaryByProject(projectId);

        return res.status(200).json({
            success: true,
            message: "Expense summary fetched successfully",
            data: summary
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};


