import type { Request, Response } from "express";
import * as DailyUpdatesServices from "./daily-updates.services";
import * as supervisorService from "../supervisor/supervisor.services";

interface RequestWithUser extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    }
}

interface MulterRequest extends Omit<RequestWithUser, "file" | "files"> {
    file?: Express.Multer.File;
    files?: {
        [fieldname: string]: Express.Multer.File[];
    } | Express.Multer.File[];
}

/**
 * @swagger
 * /api/daily-updates:
 *   post:
 *     summary: Create a new daily update (Supervisor only)
 *     tags: [Daily Updates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: ["constructionStage"]
 *             properties:
 *               constructionStage:
 *                 type: string
 *                 enum: ["Foundation", "Framing", "Plumbing & Electrical", "Interior Walls", "Painting", "Finishing"]
 *                 example: "Foundation"
 *               description:
 *                 type: string
 *                 example: "Completed foundation work for building A"
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 example: "d1f8ac24-57c1-47aa-ae6a-092de6e55553"
 *                 description: Optional project ID to link daily update to a project
 *               rawMaterials:
 *                 type: string
 *                 format: json
 *                 example: '[{"materialName":"Cement","quantity":50,"notes":"High quality cement"},{"materialName":"Steel","quantity":100}]'
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional image file
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Optional video file
 *               status:
 *                 type: string
 *                 enum: ["pending", "approved", "rejected"]
 *                 example: "pending"
 *                 description: Optional status of the daily update (defaults to pending)
 *     responses:
 *       201:
 *         description: Daily update created successfully
 *       400:
 *         description: Bad request - Validation error
 */
export const createDailyUpdate = async (req: MulterRequest, res: Response) => {
    try {
        // Handle file upload
        let image: any = undefined;
        let video: any = undefined;

        if (req.files && !Array.isArray(req.files)) {
            image = req.files['image']?.[0];
            video = req.files['video']?.[0];
        } else if (req.file) {
            image = req.file;
        }

        // Parse rawMaterials if provided as JSON string
        let rawMaterials = null;
        if (req.body.rawMaterials) {
            try {
                rawMaterials = typeof req.body.rawMaterials === 'string'
                    ? JSON.parse(req.body.rawMaterials)
                    : req.body.rawMaterials;
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid rawMaterials JSON format"
                });
            }
        }

        // Get supervisor status to verify assignment
        let supervisorId: string | undefined = undefined;
        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        }

        const dailyUpdateData = await DailyUpdatesServices.createDailyUpdate(
            {
                constructionStage: req.body.constructionStage,
                description: req.body.description || null,
                projectId: req.body.projectId || null,
                rawMaterials: rawMaterials,
                status: req.body.status,
            },
            image,
            video,
            supervisorId
        );

        return res.status(201).json({
            success: true,
            message: "Daily update created successfully",
            data: dailyUpdateData,
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
 * /api/daily-updates/{dailyUpdateId}:
 *   get:
 *     summary: Get a daily update by ID
 *     tags: [Daily Updates]
 *     parameters:
 *       - in: path
 *         name: dailyUpdateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Daily update fetched successfully
 *       400:
 *         description: Bad request - Daily update not found
 */
export const getDailyUpdateById = async (req: Request, res: Response) => {
    try {
        const dailyUpdateId = req.params.dailyUpdateId as string;
        const dailyUpdate = await DailyUpdatesServices.getDailyUpdateById(dailyUpdateId);

        return res.status(200).json({
            success: true,
            message: "Daily update fetched successfully",
            data: dailyUpdate,
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
 * /api/daily-updates:
 *   get:
 *     summary: Get all daily updates
 *     tags: [Daily Updates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily updates fetched successfully
 */
export const getAllDailyUpdates = async (req: RequestWithUser, res: Response) => {
    try {
        let supervisorId: string | undefined = undefined;
        let customerId: string | undefined = undefined;

        // If user is a supervisor, get their linked supervisorId to filter visibility
        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        }
        // If user is a regular customer (role 'customer'), they only see their projects
        else if (req.user && req.user.role === 'customer') {
            customerId = req.user.userId;
        }

        const dailyUpdates = await DailyUpdatesServices.getAllDailyUpdates(supervisorId, customerId);

        return res.status(200).json({
            success: true,
            message: "Daily updates fetched successfully",
            data: dailyUpdates,
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
 * /api/daily-updates/supervisor/assigned-projects:
 *   get:
 *     summary: Get projects assigned to the logged-in supervisor with progress
 *     tags: [Daily Updates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assigned projects fetched successfully with progress
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
 *                         allOf:
 *                           - $ref: '#/components/schemas/Project'
 *                           - type: object
 *                             properties:
 *                               progress:
 *                                 type: integer
 *                                 description: Project completion percentage based on approved stages
 *                                 example: 50
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized - Supervisor access required
 */
export const getDailyUpdatesForSupervisor = async (req: RequestWithUser, res: Response) => {
    try {
        // Ensure user is a supervisor
        if (!req.user || req.user.role !== 'supervisor') {
            return res.status(401).json({ success: false, message: "Unauthorized: Supervisor access required" });
        }

        const user = await supervisorService.getSupervisorByUserId(req.user.userId);
        const supervisorId = user.supervisorId;

        const projects = await DailyUpdatesServices.getDailyUpdatesForSupervisor(supervisorId);

        return res.status(200).json({
            success: true,
            message: "Assigned projects fetched successfully",
            data: projects,
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
 * /api/daily-updates/{dailyUpdateId}:
 *   put:
 *     summary: Update a daily update (Supervisor only)
 *     tags: [Daily Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dailyUpdateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               constructionStage:
 *                 type: string
 *                 enum: ["Foundation", "Framing", "Plumbing & Electrical", "Interior Walls", "Painting", "Finishing"]
 *               description:
 *                 type: string
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               rawMaterials:
 *                 type: string
 *                 format: json
 *               image:
 *                 type: string
 *                 format: binary
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Daily update updated successfully
 *       400:
 *         description: Bad request - Validation error
 */
export const updateDailyUpdate = async (req: MulterRequest, res: Response) => {
    try {
        const dailyUpdateId = req.params.dailyUpdateId;

        // Prepare update data
        const updateData: any = {};

        if (req.body.constructionStage !== undefined && req.body.constructionStage !== null && req.body.constructionStage !== '') {
            updateData.constructionStage = req.body.constructionStage;
        }

        if (req.body.description !== undefined) {
            updateData.description = req.body.description || null;
        }

        if (req.body.projectId !== undefined) {
            updateData.projectId = req.body.projectId || null;
        }

        // Parse rawMaterials if provided
        if (req.body.rawMaterials !== undefined) {
            try {
                updateData.rawMaterials = typeof req.body.rawMaterials === 'string'
                    ? JSON.parse(req.body.rawMaterials)
                    : req.body.rawMaterials;
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid rawMaterials JSON format"
                });
            }
        }

        // Handle file upload
        let image: any = undefined;
        let video: any = undefined;

        if (req.files && !Array.isArray(req.files)) {
            image = req.files['image']?.[0];
            video = req.files['video']?.[0];
        } else if (req.file) {
            image = req.file;
        }

        // Check if there's anything to update
        const hasUpdates = Object.keys(updateData).length > 0 || image !== undefined || video !== undefined;

        if (!hasUpdates) {
            return res.status(400).json({
                success: false,
                message: "No fields provided to update"
            });
        }

        const updatedDailyUpdate = await DailyUpdatesServices.updateDailyUpdate(
            dailyUpdateId as string,
            updateData,
            image || undefined,
            video || undefined
        );

        return res.status(200).json({
            success: true,
            message: "Daily update updated successfully",
            data: updatedDailyUpdate,
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
 * /api/daily-updates/{dailyUpdateId}:
 *   delete:
 *     summary: Delete a daily update (Supervisor only)
 *     tags: [Daily Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dailyUpdateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Daily update deleted successfully
 *       400:
 *         description: Bad request - Daily update not found
 */
export const deleteDailyUpdate = async (req: Request, res: Response) => {
    try {
        const dailyUpdateId = req.params.dailyUpdateId as string;
        const deletedData = await DailyUpdatesServices.deleteDailyUpdate(dailyUpdateId);

        return res.status(200).json({
            success: true,
            message: "Daily update deleted successfully",
            data: deletedData,
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
 * /api/daily-updates/{dailyUpdateId}/image:
 *   get:
 *     summary: Download daily update image
 *     tags: [Daily Updates]
 *     parameters:
 *       - in: path
 *         name: dailyUpdateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Image downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request - Image not found
 */
export const downloadImage = async (req: Request, res: Response) => {
    try {
        const dailyUpdateId = req.params.dailyUpdateId as string;
        const imageFile = await DailyUpdatesServices.getDailyUpdateImage(dailyUpdateId);

        if (imageFile.imageUrl) {
            return res.redirect(imageFile.imageUrl);
        }

        return res.status(404).json({
            success: false,
            message: "No image URL found for this daily update"
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
 * /api/daily-updates/{dailyUpdateId}/video:
 *   get:
 *     summary: Download daily update video
 *     tags: [Daily Updates]
 *     parameters:
 *       - in: path
 *         name: dailyUpdateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Video downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request - Video not found
 */
export const downloadVideo = async (req: Request, res: Response) => {
    try {
        const dailyUpdateId = req.params.dailyUpdateId as string;
        const imageFile = await DailyUpdatesServices.getDailyUpdateImage(dailyUpdateId);

        if (imageFile.videoUrl) {
            return res.redirect(imageFile.videoUrl);
        }

        return res.status(404).json({
            success: false,
            message: "No video URL found for this daily update"
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
 * /api/daily-updates/user/status/{status}:
 *   get:
 *     summary: Get daily updates by status for the logged-in user
 *     tags: [Daily Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["pending", "approved", "rejected"]
 *     responses:
 *       200:
 *         description: Daily updates fetched successfully
 */
export const getDailyUpdatesByStatusForUser = async (req: RequestWithUser, res: Response) => {
    try {
        const userId = req.user?.userId;
        const status = req.params.status as string;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized: User ID not found" });
        }

        const dailyUpdates = await DailyUpdatesServices.getDailyUpdatesByStatusForUser(userId, status);

        return res.status(200).json({
            success: true,
            message: `Daily updates with status '${status}' fetched successfully`,
            data: dailyUpdates,
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
 * /api/daily-updates/user/updates:
 *   get:
 *     summary: Get all daily updates for projects owned by the logged-in user
 *     tags: [Daily Updates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's project updates fetched successfully
 */
export const getDailyUpdatesForUser = async (req: RequestWithUser, res: Response) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized: User ID not found" });
        }

        const dailyUpdates = await DailyUpdatesServices.getDailyUpdatesForUser(userId);

        return res.status(200).json({
            success: true,
            message: "User's project daily updates fetched successfully",
            data: dailyUpdates,
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
 * /api/daily-updates/pending:
 *   get:
 *     summary: Get all pending daily updates for the logged-in user
 *     tags: [Daily Updates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending daily updates fetched successfully
 */
export const getPendingDailyUpdates = async (req: RequestWithUser, res: Response) => {
    try {
        let supervisorId: string | undefined = undefined;
        let customerId: string | undefined = undefined;

        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        } else if (req.user && req.user.role === 'customer') {
            customerId = req.user.userId;
        }

        const data = await DailyUpdatesServices.getDailyUpdatesByStatus('pending', supervisorId, customerId);

        return res.status(200).json({
            success: true,
            status: 'pending',
            count: data.count,
            data: data.updates
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
 * /api/daily-updates/approved:
 *   get:
 *     summary: Get all approved daily updates for the logged-in user
 *     tags: [Daily Updates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Approved daily updates fetched successfully
 */
export const getApprovedDailyUpdates = async (req: RequestWithUser, res: Response) => {
    try {
        let supervisorId: string | undefined = undefined;
        let customerId: string | undefined = undefined;

        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        } else if (req.user && req.user.role === 'customer') {
            customerId = req.user.userId;
        }

        const data = await DailyUpdatesServices.getDailyUpdatesByStatus('approved', supervisorId, customerId);

        return res.status(200).json({
            success: true,
            status: 'approved',
            count: data.count,
            data: data.updates
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
 * /api/daily-updates/rejected:
 *   get:
 *     summary: Get all rejected daily updates for the logged-in user
 *     tags: [Daily Updates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rejected daily updates fetched successfully
 */
export const getRejectedDailyUpdates = async (req: RequestWithUser, res: Response) => {
    try {
        let supervisorId: string | undefined = undefined;
        let customerId: string | undefined = undefined;

        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        } else if (req.user && req.user.role === 'customer') {
            customerId = req.user.userId;
        }

        const data = await DailyUpdatesServices.getDailyUpdatesByStatus('rejected', supervisorId, customerId);

        return res.status(200).json({
            success: true,
            status: 'rejected',
            count: data.count,
            data: data.updates
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
 * /api/daily-updates/{dailyUpdateId}/approve:
 *   put:
 *     summary: Approve a daily update (Customer)
 *     tags: [Daily Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dailyUpdateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Daily update approved successfully
 */
export const approveDailyUpdate = async (req: RequestWithUser, res: Response) => {
    try {
        const dailyUpdateId = req.params.dailyUpdateId as string;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized: User ID not found" });
        }

        const approvedUpdate = await DailyUpdatesServices.approveDailyUpdate(dailyUpdateId, userId);

        return res.status(200).json({
            success: true,
            message: "Daily update approved successfully",
            data: approvedUpdate,
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
 * /api/daily-updates/{dailyUpdateId}/reject:
 *   put:
 *     summary: Reject a daily update (Customer)
 *     tags: [Daily Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dailyUpdateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Daily update rejected successfully
 */
export const rejectDailyUpdate = async (req: RequestWithUser, res: Response) => {
    try {
        const dailyUpdateId = req.params.dailyUpdateId as string;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized: User ID not found" });
        }

        const rejectedUpdate = await DailyUpdatesServices.rejectDailyUpdate(dailyUpdateId, userId);

        return res.status(200).json({
            success: true,
            message: "Daily update rejected successfully",
            data: rejectedUpdate,
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
 * /api/daily-updates/project/{projectId}/timeline:
 *   get:
 *     summary: Get construction timeline for a project (Admin or Supervisor)
 *     tags: [Daily Updates]
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
 *         description: Timeline fetched successfully
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
 *                           stage:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [Pending, In Progress, Completed]
 *                           date:
 *                             type: string
 *                             format: date
 *                             nullable: true
 *       400:
 *         description: Bad request - Project not found
 *       401:
 *         description: Unauthorized - Admin or Supervisor access required
 *       403:
 *         description: Forbidden - Supervisor not assigned to this project
 */
export const getConstructionTimeline = async (req: RequestWithUser, res: Response) => {
    try {
        const projectId = req.params.projectId as string;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        let supervisorId: string | undefined = undefined;

        // If user is supervisor, pass supervisorId to service for verification
        if (user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(user.userId);
            supervisorId = supervisor.supervisorId;
        }

        const timeline = await DailyUpdatesServices.getConstructionTimeline(projectId, supervisorId);

        return res.status(200).json({
            success: true,
            message: "Construction timeline fetched successfully",
            data: timeline,
        });
    } catch (error) {
        // Return 403 if unauthorized access error from service
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/daily-updates/supervisor/stats:
 *   get:
 *     summary: Get supervisor statistics (pending and rejected counts)
 *     tags: [Daily Updates]
 *     parameters:
 *       - in: query
 *         name: supervisorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the supervisor
 *     responses:
 *       200:
 *         description: Statistics fetched successfully
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
 *                     pending:
 *                       type: integer
 *                       example: 5
 *                     rejected:
 *                       type: integer
 *                       example: 2
 *                     approved:
 *                       type: integer
 *                       example: 10
 *       400:
 *         description: Bad request - Supervisor ID missing
 */
export const getSupervisorStats = async (req: RequestWithUser, res: Response) => {
    try {
        const supervisorIdFromQuery = req.query.supervisorId as string;
        let finalSupervisorId = supervisorIdFromQuery;

        // If supervisorId was not in query but user is a supervisor, get their supervisorId
        if (!finalSupervisorId && req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            finalSupervisorId = supervisor.supervisorId;
        }

        if (!finalSupervisorId) {
            return res.status(400).json({ success: false, message: "Supervisor ID is required" });
        }

        const stats = await DailyUpdatesServices.getSupervisorStats(finalSupervisorId);

        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

