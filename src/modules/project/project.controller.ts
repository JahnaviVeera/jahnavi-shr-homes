import type { Request, Response } from "express";
const ProjectServices = require("./project.services");

/**
 * @swagger
 * /api/project/createproject:
 *   post:
 *     summary: Create a new project (Admin only)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectRequest'
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request - Project already exists or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     x-codeSamples:
 *       - lang: JSON
 *         label: Payload
 *         source: |
 *           {
 *             "projectName": "Sunrise Villa",
 *             "projectType": "villa",
 *             "location": "City, State",
 *             "initialStatus": "Planning",
 *             "startDate": "2024-01-01",
 *             "expectedCompletion": "2024-12-31",
 *             "totalBudget": 5000000,
 *             "materialName": "Concrete",
 *             "quantity": 100,
 *             "customerId": "uuid",
 *             "supervisorId": "uuid",
 *             "projectManager": "John Doe",
 *             "area": "1500 Sqft",
 *             "numberOfFloors": 2,
 *             "priority": "Medium",
 *             "currency": "INR",
 *             "description": "Project details..."
 *           }
 */


//post
exports.createProject = async (req: Request, res: Response) => {
    try {

        const projectData = await ProjectServices.createProject(req.body);

        return res.status(201).json({
            success: true,
            message: "Project created successfully",
            data: projectData,
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),

        });
    }

}

/**
 * @swagger
 * /api/project/getproject/{projectId}:
 *   get:
 *     summary: Get a project by ID
 *     tags: [Projects]
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
 *         description: Project fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request - Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
//getId
exports.getProjectById = async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId;
        const project = await ProjectServices.getProjectByProjectId(projectId);

        return res.status(200).json({
            success: true,
            message: "Project fetched successfully",
            data: project,
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
 * /api/project/getallprojects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by project name, location, material, or notes
 *     responses:
 *       200:
 *         description: Projects fetched successfully
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
 *                         $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
//get
exports.getAllProjects = async (req: Request, res: Response) => {
    try {
        const search = req.query.search as string;
        const projects = await ProjectServices.getAllTheProjects(search);

        return res.status(200).json({
            success: true,
            message: "Projects fetched successfully",
            data: projects
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
 * /api/project/updateproject/{projectId}:
 *   put:
 *     summary: Update a project (Admin only)
 *     tags: [Projects]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProjectRequest'
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request - Project not found or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
//put
exports.updateProject = async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId;

        const updatedData = await ProjectServices.updateProject(projectId, req.body);

        return res.status(200).json({
            success: true,
            message: "Project updated successfully",
            data: updatedData,
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
 * /api/project/deleteproject/{projectId}:
 *   delete:
 *     summary: Delete a project (Admin only)
 *     tags: [Projects]
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
 *         description: Project deleted successfully
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
 *       400:
 *         description: Bad request - Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
//delete
exports.deleteProject = async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId;
        const deletedData = await ProjectServices.deleteProject(projectId)
        return res.status(200).json({
            success: true,
            message: "Project deleted successfully",
            data: deletedData,
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
 * /api/project/project-summary:
 *   get:
 *     summary: Get project summary for the logged-in user
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Project summary fetched successfully
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
 *                         projectType:
 *                           type: string
 *                         location:
 *                           type: string
 *                         initialStatus:
 *                           type: string
 *                         startDate:
 *                           type: string
 *                         expectedCompletion:
 *                           type: string
 *                         totalBudget:
 *                           type: number
 *                         supervisorName:
 *                           type: string
 *       404:
 *         description: No project found for this user
 */
exports.getProjectSummary = async (req: Request, res: Response) => {
    try {
        const authReq = req as any;
        const userId = authReq.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const projectSummary = await ProjectServices.getProjectSummaryForUser(userId);

        if (!projectSummary) {
            return res.status(404).json({
                success: false,
                message: "No project found for this user"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Project summary fetched successfully",
            data: projectSummary
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};
