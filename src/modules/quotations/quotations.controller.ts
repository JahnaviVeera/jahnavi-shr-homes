import type { Request, Response } from "express";

const QuotationServices = require("./quotations.services");
const supervisorService = require("../supervisor/supervisor.services");

interface RequestWithUser extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    }
}

interface MulterRequest extends Request {
    file?: Express.Multer.File;
    files?: {
        [fieldname: string]: Express.Multer.File[];
    } | Express.Multer.File[];
}

/**
 * @swagger
 * /api/quotations/user/{userId}:
 *   get:
 *     summary: Get quotations by User ID
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The user ID to filter by
 *     responses:
 *       200:
 *         description: Quotations fetched successfully
 *       400:
 *         description: Bad request - Invalid User ID
 *       401:
 *         description: Unauthorized - User authentication required
 */
exports.getQuotationsByUserId = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const quotations = await QuotationServices.getQuotationsByUserId(userId);

        return res.status(200).json({
            success: true,
            message: "Quotations fetched successfully",
            data: quotations
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/quotations:
 *   post:
 *     summary: Create a new quotation (Admin only)
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: ["status", "projectId", "lineItems"]
 *             properties:
 *               totalAmount:
 *                 type: number
 *                 format: decimal
 *                 example: 50000.00
 *                 description: Total amount (will be calculated from lineItems if not provided)
 *               status:
 *                 type: string
 *                 enum: ["pending", "approved", "rejected", "locked"]
 *                 example: "pending"
 *               lineItems:
 *                 type: string
 *                 format: json
 *                 description: JSON array of line items with description and amount
 *                 example: '[{"description":"Foundation Work","amount":25000},{"description":"Roofing","amount":25000}]'
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 example: "d1f8ac24-57c1-47aa-ae6a-092de6e55553"
 *               customerName:
 *                 type: string
 *                 example: "John Doe"
 *                 description: Name of the customer
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional file attachment for the quotation
 *     responses:
 *       201:
 *         description: Quotation created successfully
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
 *                         quotationId:
 *                           type: string
 *                           format: uuid
 *                         totalAmount:
 *                           type: number
 *                         status:
 *                           type: string
 *                         description:
 *                           type: string
 *                         date:
 *                           type: string
 *                           format: date
 *                         projectId:
 *                           type: string
 *                           format: uuid
 *                         customerName:
 *                           type: string
 *                         fileName:
 *                           type: string
 *                         fileType:
 *                           type: string
 *       400:
 *         description: Bad request - Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
//POST
exports.createQuotation = async (req: MulterRequest, res: Response) => {
    try {
        // Handle files from upload.fields() - check for 'file' or 'fileData' field names
        let file: any = undefined;
        if (req.file) {
            file = req.file;
        } else if (req.files) {
            // Handle upload.fields() format (object with field names as keys)
            if (Array.isArray(req.files)) {
                file = req.files.length > 0 ? req.files[0] : undefined;
            } else {
                // Check for 'file' first, then 'fileData'
                file = (req.files['file'] && req.files['file'][0]) ||
                    (req.files['fileData'] && req.files['fileData'][0]) ||
                    undefined;
            }
        }

        // Parse lineItems from JSON string if provided
        let lineItems: any[] | null = null;
        if (req.body.lineItems) {
            try {
                lineItems = typeof req.body.lineItems === 'string'
                    ? JSON.parse(req.body.lineItems)
                    : req.body.lineItems;

                // If parsed/original lineItems is not an array but is an object (and not null), wrap it
                if (!Array.isArray(lineItems) && typeof lineItems === 'object' && lineItems !== null) {
                    lineItems = [lineItems];
                }

                // Validate lineItems structure
                if (!Array.isArray(lineItems)) {
                    throw new Error("lineItems must be an array");
                }

                // Validate each item has description and amount
                for (let i = 0; i < lineItems.length; i++) {
                    let item = lineItems[i];

                    // Parse item if it's a string
                    if (typeof item === 'string') {
                        try {
                            item = JSON.parse(item);
                            lineItems[i] = item; // Update array with parsed object
                        } catch (e) {
                            throw new Error(`Invalid JSON in lineItem at index ${i}`);
                        }
                    }

                    // Handle amount as number or string (from frontend form data)
                    const amount = typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount;

                    if (!item || typeof item !== 'object' || !item.description || typeof amount !== 'number' || isNaN(amount)) {
                        throw new Error("Each line item must have 'description' (string) and 'amount' (number)");
                    }

                    // Ensure amount is stored as a number
                    item.amount = amount;
                }
            } catch (parseError) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid lineItems format: ${parseError instanceof Error ? parseError.message : String(parseError)}`
                });
            }
        }

        // Parse date if provided
        let dateVal: Date | undefined | null = undefined;
        if (req.body.date) {
            const parsedDate = new Date(req.body.date);
            if (!isNaN(parsedDate.getTime())) {
                dateVal = parsedDate;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date format"
                });
            }
        }

        // Prepare quotation data
        const quotationData = {
            ...req.body,
            date: dateVal,
            lineItems: lineItems,
            totalAmount: req.body.totalAmount ? parseFloat(String(req.body.totalAmount)) : 0,
            customerName: req.body.customerName || null
        };

        const createdQuotation = await QuotationServices.createQuotation(quotationData, file || undefined);

        return res.status(201).json({
            success: true,
            message: "Quotation created successfully",
            data: createdQuotation,
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
 * /api/quotations/{quotationId}:
 *   get:
 *     summary: Get a quotation by ID
 *     tags: [Quotations]
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The quotation ID
 *     responses:
 *       200:
 *         description: Quotation fetched successfully
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
 *                         quotationId:
 *                           type: string
 *                           format: uuid
 *                         totalAmount:
 *                           type: number
 *                         status:
 *                           type: string
 *                         description:
 *                           type: string
 *                         date:
 *                           type: string
 *                           format: date
 *                         projectId:
 *                           type: string
 *                           format: uuid
 *                         customerName:
 *                           type: string
 *       400:
 *         description: Bad request - Quotation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
//GETBYID
exports.getQuotationById = async (req: Request, res: Response) => {
    try {
        const quotationId = req.params.quotationId as string;
        const quotation = await QuotationServices.getQuotationByQuotationId(quotationId);

        return res.status(200).json({
            success: true,
            message: "Quotation fetched successfully",
            data: quotation
        })

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        })
    }

}

/**
 * @swagger
 * /api/quotations:
 *   get:
 *     summary: Get all quotations
 *     tags: [Quotations]
 *     responses:
 *       200:
 *         description: Quotations fetched successfully
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
 *                           id:
 *                             type: string
 *                             example: "QU0001"
 *                           quotationId:
 *                             type: string
 *                             format: uuid
 *                           projectName:
 *                             type: string
 *                           customerName:
 *                             type: string
 *                           customerEmail:
 *                           status:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date
 *                           lineItems:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 description:
 *                                   type: string
 *                                 amount:
 *                                   type: number
 *                           totalAmount:
 *                             type: number
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GETALL
exports.getAllQuotations = async (req: RequestWithUser, res: Response) => {
    try {
        let supervisorId: string | undefined = undefined;
        let customerId: string | undefined = undefined;

        // 1. Identify User Role and related filters
        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        }
        else if (req.user && req.user.role === 'customer') {
            customerId = req.user.userId;
        }

        const quotations = await QuotationServices.getAllTheQuotations(supervisorId, customerId);
        return res.status(200).json({
            success: true,
            message: "Quotations fetched successfully",
            data: quotations
        })

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        })
    }
}

/**
 * @swagger
 * /api/quotations/{quotationId}:
 *   put:
 *     summary: Update a quotation (partial update)
 *     description: Update one or more fields of an existing quotation. All fields are optional - only include the fields you want to update.
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The quotation ID
 *     requestBody:
 *       required: false
 *       description: All fields are optional. Only include the fields you want to update. The quotation will be updated with the provided fields, leaving other fields unchanged.
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               totalAmount:
 *                 type: number
 *                 format: decimal
 *                 description: The total amount for the quotation. Will be automatically converted from string to number.
 *                 example: 60000.00
 *               status:
 *                 type: string
 *                 enum: ["pending", "approved", "rejected", "locked"]
 *                 description: The status of the quotation
 *                 example: "approved"
 *               lineItems:
 *                 type: string
 *                 format: json
 *                 nullable: true
 *                 description: JSON array of line items with description and amount
 *                 example: '[{"description":"Foundation Work","amount":25000},{"description":"Roofing","amount":25000}]'
 *               date:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 description: Date for the quotation
 *                 example: "2024-01-15"
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: The project ID associated with the quotation
 *                 example: "d1f8ac24-57c1-47aa-ae6a-092de6e55553"
 *               customerName:
 *                 type: string
 *                 example: "John Doe"
 *                 description: Name of the customer (optional update)
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional file attachment for the quotation. If provided, will replace the existing file.
 *     responses:
 *       200:
 *         description: Quotation updated successfully
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
 *                         quotationId:
 *                           type: string
 *                           format: uuid
 *                           description: Unique identifier for the quotation
 *                         totalAmount:
 *                           type: number
 *                           format: decimal
 *                           description: The total amount of the quotation
 *                         status:
 *                           type: string
 *                           enum: ["pending", "approved", "rejected", "locked"]
 *                           description: Current status of the quotation
 *                         lineItems:
 *                           type: array
 *                           nullable: true
 *                           description: Array of line items with description and amount
 *                           items:
 *                             type: object
 *                             properties:
 *                               description:
 *                                 type: string
 *                               amount:
 *                                 type: number
 *                         date:
 *                           type: string
 *                           format: date
 *                           nullable: true
 *                           description: Date for the quotation
 *                         projectId:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                           description: Associated project ID
 *                         customerName:
 *                           type: string
 *                           nullable: true
 *                           description: Associated customer name
 *                         fileName:
 *                           type: string
 *                           nullable: true
 *                           description: Name of the attached file, if any
 *                         fileType:
 *                           type: string
 *                           nullable: true
 *                           description: MIME type of the attached file, if any
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: Creation timestamp
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           description: Last update timestamp (automatically updated on each update)
 *       400:
 *         description: Bad request - Quotation not found or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
//PUT
exports.updateQuotation = async (req: MulterRequest, res: Response) => {
    try {
        const quotationId = req.params.quotationId as string;

        // Validate quotationId
        if (!quotationId || quotationId.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Quotation ID is required"
            });
        }

        // Prepare update data - only include fields that have actual values
        const updateData: any = {};

        // Only add fields that are provided and not empty
        // Convert totalAmount to number since multipart/form-data sends it as string
        if (req.body.totalAmount !== undefined && req.body.totalAmount !== null && req.body.totalAmount !== '') {
            const parsedAmount = parseFloat(String(req.body.totalAmount));
            if (!isNaN(parsedAmount) && isFinite(parsedAmount)) {
                updateData.totalAmount = parsedAmount;
            }
        }

        if (req.body.status !== undefined && req.body.status !== null && req.body.status !== '') {
            const validStatuses = ['pending', 'approved', 'rejected', 'locked'];
            if (validStatuses.includes(req.body.status)) {
                updateData.status = req.body.status;
            }
        }

        if (req.body.customerName !== undefined && req.body.customerName !== null && req.body.customerName !== '') {
            updateData.customerName = req.body.customerName;
        }

        // Parse lineItems from JSON string if provided
        if (req.body.lineItems !== undefined) {
            try {
                let lineItems: Array<{ description: string; amount: number }> | null = null;

                if (req.body.lineItems !== '' && req.body.lineItems !== null) {
                    lineItems = typeof req.body.lineItems === 'string'
                        ? JSON.parse(req.body.lineItems)
                        : req.body.lineItems;

                    // Validate lineItems structure
                    if (!Array.isArray(lineItems)) {
                        throw new Error("lineItems must be an array");
                    }

                    // Validate each item has description and amount
                    for (const item of lineItems) {
                        const amount = typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount;

                        if (!item.description || typeof amount !== 'number' || isNaN(amount)) {
                            throw new Error("Each line item must have 'description' (string) and 'amount' (number)");
                        }

                        // Ensure amount is stored as a number
                        item.amount = amount;
                    }
                }

                updateData.lineItems = lineItems;
            } catch (parseError) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid lineItems format: ${parseError instanceof Error ? parseError.message : String(parseError)}`
                });
            }
        }

        if (req.body.date !== undefined && req.body.date !== null && req.body.date !== '') {
            updateData.date = new Date(req.body.date);
        } else if (req.body.date === '' || req.body.date === null) {
            updateData.date = null;
        }

        if (req.body.projectId !== undefined && req.body.projectId !== null && req.body.projectId !== '') {
            updateData.projectId = req.body.projectId;
        }

        // Handle files from upload.fields() - check for 'file' or 'fileData' field names
        let file: any = undefined;
        if (req.file) {
            file = req.file;
        } else if (req.files) {
            // Handle upload.fields() format (object with field names as keys)
            if (Array.isArray(req.files)) {
                file = req.files.length > 0 ? req.files[0] : undefined;
            } else {
                // Check for 'file' first, then 'fileData'
                file = (req.files['file'] && req.files['file'][0]) ||
                    (req.files['fileData'] && req.files['fileData'][0]) ||
                    undefined;
            }
        }

        // Check if there's anything to update
        const hasUpdates = Object.keys(updateData).length > 0 || file !== undefined;

        if (!hasUpdates) {
            return res.status(400).json({
                success: false,
                message: "No fields provided to update"
            });
        }

        const updatedQuotationData = await QuotationServices.updateQuotation(quotationId, updateData, file || undefined);

        return res.status(200).json({
            success: true,
            message: "Quotation updated successfully",
            data: updatedQuotationData
        })

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        })
    }
}

/**
 * @swagger
 * /api/quotations/{quotationId}/total-amount:
 *   get:
 *     summary: Get the total amount of a specific quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The quotation ID
 *     responses:
 *       200:
 *         description: Total amount fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAmount:
 *                       type: number
 *                       example: 50000.00
 *       400:
 *         description: Bad request - Quotation not found
 */
exports.getQuotationTotalAmount = async (req: Request, res: Response) => {
    try {
        const quotationId = req.params.quotationId as string;
        const totalAmount = await QuotationServices.getQuotationTotalAmount(quotationId);

        return res.status(200).json({
            success: true,
            data: {
                totalAmount: parseFloat(String(totalAmount || 0))
            }
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/quotations/{quotationId}:
 *   delete:
 *     summary: Delete a quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The quotation ID
 *     responses:
 *       200:
 *         description: Quotation deleted successfully
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
 *                         success:
 *                           type: boolean
 *                         message:
 *                           type: string
 *       404:
 *         description: Quotation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
//DELETE
exports.deleteQuotation = async (req: Request, res: Response) => {
    try {
        const quotationId = req.params.quotationId as string;

        const deletedQuotationData = await QuotationServices.deleteQuotation(quotationId);

        return res.status(200).json({
            success: true,
            message: "Quotation deleted successfully",
            data: deletedQuotationData
        })
    } catch (error) {
        return res.status(404).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        })
    }
}

/**
 * @swagger
 * /api/quotations/pending:
 *   get:
 *     summary: Get all pending quotations (User/Supervisor only)
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending quotations fetched successfully
 *       401:
 *         description: Unauthorized - User authentication required
 */
exports.getPendingQuotations = async (req: Request, res: Response) => {
    try {
        const quotations = await QuotationServices.getPendingQuotations();

        return res.status(200).json({
            success: true,
            message: "Pending quotations fetched successfully",
            data: quotations
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/quotations/status/{status}: 
 *   get:
 *     summary: Get quotations by status (User/Supervisor only)
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, locked]
 *         description: The status to filter by
 *     responses:
 *       200:
 *         description: Quotations fetched successfully
 *       400:
 *         description: Bad request - Invalid status
 *       401:
 *         description: Unauthorized - User authentication required
 */
exports.getQuotationsByStatus = async (req: Request, res: Response) => {
    try {
        const status = req.params.status as string;

        const quotations = await QuotationServices.getQuotationsByStatus(status);

        return res.status(200).json({
            success: true,
            message: `Quotations with status '${status}' fetched successfully`,
            data: quotations
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/quotations/project/{projectId}:
 *   get:
 *     summary: Get quotations by project ID (User/Supervisor only)
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The project ID
 *     responses:
 *       200:
 *         description: Quotations fetched successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized - User authentication required
 */
exports.getQuotationsByProject = async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId as string;

        const quotations = await QuotationServices.getQuotationsByProject(projectId);

        return res.status(200).json({
            success: true,
            message: "Quotations fetched successfully",
            data: quotations
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/quotations/{quotationId}/approve:
 *   post:
 *     summary: Approve a quotation (User/Supervisor only)
 *     description: Approves a pending quotation and locks it. Once approved, the quotation cannot be changed.
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The quotation ID to approve
 *     responses:
 *       200:
 *         description: Quotation approved and locked successfully
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
 *                         quotationId:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: "approved"
 *       400:
 *         description: Bad request - Quotation not found or already approved/rejected
 *       401:
 *         description: Unauthorized - User authentication required
 */
exports.approveQuotation = async (req: Request, res: Response) => {
    try {
        const quotationId = req.params.quotationId as string;

        // Get user ID from authentication middleware
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required"
            });
        }

        const updatedQuotation = await QuotationServices.approveQuotation(quotationId, userId);

        return res.status(200).json({
            success: true,
            message: "Quotation approved and locked successfully",
            data: updatedQuotation
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/quotations/{quotationId}/reject:
 *   post:
 *     summary: Reject a quotation (User/Supervisor only)
 *     description: Rejects a pending quotation. Rejected quotations are NOT locked, allowing admin to resubmit them later by changing status back to "pending".
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The quotation ID to reject
 *     responses:
 *       200:
 *         description: Quotation rejected successfully. Admin can resubmit by changing status to "pending".
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
 *                         quotationId:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: "rejected"
 *       400:
 *         description: Bad request - Quotation not found or already approved/rejected
 *       401:
 *         description: Unauthorized - User authentication required
 */
exports.rejectQuotation = async (req: Request, res: Response) => {
    try {
        const quotationId = req.params.quotationId as string;

        // Get user ID from authentication middleware
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required"
            });
        }

        const updatedQuotation = await QuotationServices.rejectQuotation(quotationId, userId);

        return res.status(200).json({
            success: true,
            message: "Quotation rejected successfully",
            data: updatedQuotation
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};



/**
 * @swagger
 * /api/quotations/{quotationId}/download:
 *   get:
 *     summary: Download a quotation file
 *     tags: [Quotations]
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The quotation ID
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request - Quotation not found
 */
exports.downloadQuotation = async (req: Request, res: Response) => {
    try {
        const quotationId = req.params.quotationId as string;
        const quotationFile = await QuotationServices.getQuotationFile(quotationId);

        // If we have a fileUrl (Supabase), redirect to it
        if (quotationFile.fileUrl) {
            return res.redirect(quotationFile.fileUrl);
        }

        // Fallback for files stored in DB (buffer)
        if (quotationFile.fileData && quotationFile.fileData.length > 0) {
            res.setHeader('Content-Type', quotationFile.fileType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${quotationFile.fileName || 'quotation'}"`);
            return res.status(200).send(quotationFile.fileData);
        }

        return res.status(404).json({
            success: false,
            message: "File content not found"
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
 * /api/quotations/{quotationId}/resend:
 *   post:
 *     summary: Resend a quotation notification to the customer (Admin only)
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The quotation ID to resend
 *     responses:
 *       200:
 *         description: Quotation resent successfully
 *       400:
 *         description: Bad request - Quotation not found or customer not found
 *       401:
 *         description: Unauthorized
 */
exports.resendQuotation = async (req: Request, res: Response) => {
    try {
        const quotationId = req.params.quotationId as string;
        const result = await QuotationServices.resendQuotation(quotationId);

        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};
