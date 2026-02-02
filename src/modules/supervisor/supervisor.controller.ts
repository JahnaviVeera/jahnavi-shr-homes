import type { Request, Response } from "express";
const SupervisorServices = require("./supervisor.services");

interface AuthenticatedRequest extends Request {
    user?: {
        userId?: string;
        email: string;
        role: string;
    };
}

/**
 * @swagger
 * /api/supervisor/profile:
 *   get:
 *     summary: Get my profile (Supervisor)
 *     tags: [Supervisors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 */
exports.getProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || req.user.role !== 'supervisor') {
            return res.status(401).json({ success: false, message: "Unauthorized: Supervisor access required" });
        }

        // userId from commonAuthMiddleware is mapped to supervisorId for supervisors
        const supervisorId = req.user.userId;
        if (!supervisorId) {
            return res.status(404).json({ success: false, message: "Supervisor ID not found in token" });
        }

        const profile = await SupervisorServices.getSupervisorProfile(supervisorId);

        return res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            data: profile
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
 * /api/supervisor/profile:
 *   put:
 *     summary: Update my profile
 *     tags: [Supervisors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
exports.updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || req.user.role !== 'supervisor') {
            return res.status(401).json({ success: false, message: "Unauthorized: Supervisor access required" });
        }

        const supervisorId = req.user.userId;
        if (!supervisorId) {
            return res.status(404).json({ success: false, message: "Supervisor ID not found in token" });
        }

        const updatedProfile = await SupervisorServices.updateSupervisor(supervisorId, req.body);

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedProfile
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
 * /api/supervisor:
 *   post:
 *     summary: Create a new supervisor (Admin only)
 *     tags: [Supervisors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["fullName", "email", "phoneNumber", "password"]
 *             properties:
 *               fullName:
 *                 type: string
 *                 maxLength: 255
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 15
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SupervisorPassword123"
 *                 description: Password for supervisor login (will be hashed)
 *               status:
 *                 type: string
 *                 enum: ["Active", "Inactive"]
 *                 default: "Active"
 *                 example: "Active"
 *               projectIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Optional list of project IDs to assign during creation
 *                 example: ["123e4567-e89b-12d3-a456-426614174000", "567e4567-e89b-12d3-a456-426614174111"]
 *     responses:
 *       201:
 *         description: Supervisor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Supervisor'
 *       400:
 *         description: Bad request - Supervisor already exists or validation error
 *       401:
 *         description: Unauthorized - Admin authentication required
 */
exports.createSupervisor = async (req: Request, res: Response) => {
    try {
        const supervisorData = await SupervisorServices.createSupervisor(req.body);

        return res.status(201).json({
            success: true,
            message: "Supervisor created successfully",
            data: supervisorData,
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
 * /api/supervisor/{supervisorId}:
 *   get:
 *     summary: Get a supervisor by ID
 *     tags: [Supervisors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supervisorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The supervisor ID
 *     responses:
 *       200:
 *         description: Supervisor fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Supervisor'
 *       400:
 *         description: Bad request - Supervisor not found
 */
exports.getSupervisorById = async (req: Request, res: Response) => {
    try {
        const { supervisorId } = req.params;
        const supervisor = await SupervisorServices.getSupervisorById(supervisorId);

        return res.status(200).json({
            success: true,
            message: "Supervisor fetched successfully",
            data: supervisor
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
 * /api/supervisor:
 *   get:
 *     summary: Get all supervisors
 *     tags: [Supervisors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by fullName, email, or phoneNumber
 *     responses:
 *       200:
 *         description: Supervisors fetched successfully
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
 *                         $ref: '#/components/schemas/Supervisor'
 */
exports.getAllSupervisors = async (req: Request, res: Response) => {
    try {
        const { search } = req.query;
        const supervisors = await SupervisorServices.getAllSupervisors(search as string);
        return res.status(200).json({
            success: true,
            message: "Supervisors fetched successfully",
            data: supervisors
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
 * /api/supervisor/{supervisorId}:
 *   put:
 *     summary: Update a supervisor (Admin only)
 *     tags: [Supervisors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supervisorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The supervisor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 maxLength: 255
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 15
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "NewPassword123"
 *                 description: Password for supervisor (will be hashed if provided)
 *               status:
 *                 type: string
 *                 enum: ["Active", "Inactive"]
 *                 example: "Active"
 *               projectIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["123e4567-e89b-12d3-a456-426614174000"]
 *                 description: List of project IDs to assign (addively)
 *     responses:
 *       200:
 *         description: Supervisor updated successfully
 *       400:
 *         description: Bad request - Supervisor not found or validation error
 *       401:
 *         description: Unauthorized - Admin authentication required
 */
exports.updateSupervisor = async (req: Request, res: Response) => {
    try {
        const { supervisorId } = req.params;
        const updatedSupervisor = await SupervisorServices.updateSupervisor(supervisorId, req.body);

        return res.status(200).json({
            success: true,
            message: "Supervisor updated successfully",
            data: updatedSupervisor
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
 * /api/supervisor/{supervisorId}:
 *   delete:
 *     summary: Delete a supervisor (Admin only)
 *     tags: [Supervisors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supervisorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The supervisor ID
 *     responses:
 *       200:
 *         description: Supervisor deleted successfully
 *       400:
 *         description: Bad request - Supervisor not found
 *       401:
 *         description: Unauthorized - Admin authentication required
 */
exports.deleteSupervisor = async (req: Request, res: Response) => {
    try {
        const { supervisorId } = req.params;
        const deletedSupervisor = await SupervisorServices.deleteSupervisor(supervisorId);

        return res.status(200).json({
            success: true,
            message: "Supervisor deleted successfully",
            data: deletedSupervisor
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
 * /api/supervisor/{supervisorId}/assign-project:
 *   post:
 *     summary: Assign a project to a supervisor (Admin only)
 *     tags: [Supervisors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supervisorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The supervisor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["projectId"]
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                 description: The project ID to assign
 *     responses:
 *       200:
 *         description: Project assigned successfully
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
 *                         supervisorId:
 *                           type: string
 *                         fullName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         assignedProjectsCount:
 *                           type: integer
 *                         assignedProjects:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request - Supervisor or project not found
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       403:
 *         description: Forbidden - Admin privileges required
 */
exports.assignProjectToSupervisor = async (req: Request, res: Response) => {
    try {
        const { supervisorId } = req.params;
        const { projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required"
            });
        }

        const result = await SupervisorServices.assignProjectToSupervisor(supervisorId, projectId);

        return res.status(200).json({
            success: true,
            message: "Project assigned to supervisor successfully",
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
 * /api/supervisor/{supervisorId}/remove-project:
 *   delete:
 *     summary: Remove project assignment from a supervisor (Admin only)
 *     tags: [Supervisors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supervisorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The supervisor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["projectId"]
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                 description: The project ID to remove from supervisor
 *     responses:
 *       200:
 *         description: Project assignment removed successfully
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
 *                         supervisorId:
 *                           type: string
 *                         assignedProjectsCount:
 *                           type: integer
 *       400:
 *         description: Bad request - Supervisor or project not found
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       403:
 *         description: Forbidden - Admin privileges required
 */
exports.removeProjectFromSupervisor = async (req: Request, res: Response) => {
    try {
        const { supervisorId } = req.params;
        const { projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required"
            });
        }

        const result = await SupervisorServices.removeProjectFromSupervisor(supervisorId, projectId);

        return res.status(200).json({
            success: true,
            message: "Project assignment removed from supervisor successfully",
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
 * /api/supervisor/{supervisorId}/assigned-projects-count:
 *   get:
 *     summary: Get assigned projects count for a supervisor
 *     tags: [Supervisors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supervisorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The supervisor ID
 *     responses:
 *       200:
 *         description: Assigned projects count fetched successfully
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
 *                         supervisorId:
 *                           type: string
 *                         fullName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         assignedProjectsCount:
 *                           type: integer
 *                         projects:
 *                           type: array
 *                           items:
 *                             type: object
 *       400:
 *         description: Bad request - Supervisor not found
 */
exports.getAssignedProjectsCount = async (req: Request, res: Response) => {
    try {
        const { supervisorId } = req.params;
        const result = await SupervisorServices.getAssignedProjectsCount(supervisorId);

        return res.status(200).json({
            success: true,
            message: "Assigned projects count fetched successfully",
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

exports.getAssignedProjects = async (req: Request, res: Response) => {
    try {
        const { supervisorId } = req.params;
        const result = await SupervisorServices.getAssignedProjects(supervisorId);

        return res.status(200).json({
            success: true,
            message: "Assigned projects fetched successfully",
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

exports.getMyAssignedProjects = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || req.user.role !== 'supervisor') {
            return res.status(401).json({ success: false, message: "Unauthorized: Supervisor access required" });
        }

        const supervisorId = req.user.userId;
        if (!supervisorId) {
            return res.status(401).json({ success: false, message: "Supervisor ID not found in token" });
        }

        // Reuse the existing service but extract just the projects list for the response
        const result = await SupervisorServices.getAssignedProjects(supervisorId);

        return res.status(200).json({
            success: true,
            message: "Assigned projects fetched successfully",
            data: result.projects
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};






