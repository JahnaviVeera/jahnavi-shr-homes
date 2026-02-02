import type { Request, Response } from "express";
const MaterialServices = require("./material.services");
const supervisorService = require("../supervisor/supervisor.services");

interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}

/**
 * @swagger
 * /api/material:
 *   post:
 *     summary: Create a new material (Admin and Supervisor only)
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["projectId", "materialName", "quantity", "date"]
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               materialName:
 *                 type: string
 *                 example: "Electrical Wire (14 AWG)"
 *               quantity:
 *                 type: integer
 *                 example: 500
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-16"
 *               notes:
 *                 type: string
 *                 example: "For first floor wiring"
 *               vendor:
 *                 type: string
 *                 example: "ABC Supplies"
 *     responses:
 *       201:
 *         description: Material created successfully
 *       400:
 *         description: Bad request - Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or supervisor privileges required. Customers cannot create materials.
 */
exports.createMaterial = async (req: AuthenticatedRequest, res: Response) => {
    try {
        let supervisorId: string | undefined = undefined;

        // If user is a supervisor, get their linked supervisorId to verify assignment
        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        }

        const materialData = await MaterialServices.createMaterial(req.body, supervisorId);

        return res.status(201).json({
            success: true,
            message: "Material created successfully",
            data: materialData,
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
 * /api/material/{materialId}:
 *   get:
 *     summary: Get a material by ID
 *     tags: [Materials]
 *     parameters:
 *       - in: path
 *         name: materialId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Material fetched successfully
 *       400:
 *         description: Bad request - Material not found
 */
exports.getMaterialById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { materialId } = req.params;
        let supervisorId: string | undefined = undefined;

        // If user is a supervisor, get their linked supervisorId to verify assignment
        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        }

        const material = await MaterialServices.getMaterialById(materialId, supervisorId);

        return res.status(200).json({
            success: true,
            message: "Material fetched successfully",
            data: material
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
 * /api/material:
 *   get:
 *     summary: Get all materials
 *     tags: [Materials]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by material name, notes, vendor, or project name
 *     responses:
 *       200:
 *         description: Materials fetched successfully
 */
exports.getAllMaterials = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { search } = req.query;
        let supervisorId: string | undefined = undefined;

        // If user is a supervisor, get their linked supervisorId to filter visibility
        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        }

        const materials = await MaterialServices.getAllMaterials(search as string, supervisorId);

        return res.status(200).json({
            success: true,
            message: "Materials fetched successfully",
            data: materials
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
 * /api/material/project/{projectId}:
 *   get:
 *     summary: Get materials by project ID
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Materials fetched successfully
 */
exports.getMaterialsByProject = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        let supervisorId: string | undefined = undefined;

        // If user is a supervisor, get their linked supervisorId to verify assignment
        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        }

        const materials = await MaterialServices.getMaterialsByProject(projectId, supervisorId);

        return res.status(200).json({
            success: true,
            message: "Materials fetched successfully",
            data: materials
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
 * /api/material/project/{projectId}/total-count:
 *   get:
 *     summary: Get total material count by project
 *     tags: [Materials]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Total material count by project fetched successfully
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
 *                     totalCount:
 *                       type: integer
 */
exports.getTotalMaterialCountByProject = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        let supervisorId: string | undefined = undefined;

        // If user is a supervisor, get their linked supervisorId to verify assignment
        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        }

        const result = await MaterialServices.getTotalMaterialCountByProject(projectId, supervisorId);

        return res.status(200).json({
            success: true,
            message: "Total material count by project fetched successfully",
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
 * /api/material/{materialId}:
 *   put:
 *     summary: Update a material (Admin and Supervisor only)
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: materialId
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
 *               materialName:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               projectId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Material updated successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or supervisor privileges required. Customers cannot update materials.
 */
exports.updateMaterial = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { materialId } = req.params;
        let supervisorId: string | undefined = undefined;

        // If user is a supervisor, get their linked supervisorId to verify assignment
        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        }

        const updatedMaterial = await MaterialServices.updateMaterial(materialId, req.body, supervisorId);

        return res.status(200).json({
            success: true,
            message: "Material updated successfully",
            data: updatedMaterial
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
 * /api/material/{materialId}:
 *   delete:
 *     summary: Delete a material (Admin and Supervisor only)
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: materialId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Material deleted successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or supervisor privileges required. Customers cannot delete materials.
 */
exports.deleteMaterial = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { materialId } = req.params;
        let supervisorId: string | undefined = undefined;

        // If user is a supervisor, get their linked supervisorId to verify assignment
        if (req.user && req.user.role === 'supervisor') {
            const supervisor = await supervisorService.getSupervisorByUserId(req.user.userId);
            supervisorId = supervisor.supervisorId;
        }

        const result = await MaterialServices.deleteMaterial(materialId, supervisorId);

        return res.status(200).json({
            success: true,
            message: "Material deleted successfully",
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};


