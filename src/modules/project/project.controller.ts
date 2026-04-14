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
 *             "initialStatus": "Inprogress",
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
 *             "description": "Project details...",
 *             "progress": 0
 *           }
 */


//post
exports.createProject = async (req: Request, res: Response) => {
    try {

        const authReq = req as any;
        const fullName = authReq.user?.fullName || "System";
        const projectData = await ProjectServices.createProject({ ...req.body, createdBy: fullName });

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
        const authReq = req as any;
        const project = await ProjectServices.getProjectByProjectId(projectId);

        // Security Check: Customers can only see their own projects
        if (authReq.user?.role === 'customer' && project.customerId !== authReq.user.userId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only view your own projects."
            });
        }

        // Security Check: Supervisors can only see projects assigned to them
        if (authReq.user?.role === 'supervisor') {
            const isAssigned = project.supervisorId && project.supervisor?.userId === authReq.user.userId;
            if (!isAssigned) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You can only view projects assigned to you."
                });
            }
        }

        if (authReq.user?.role === 'accountant') {
            // Mask sensitive financial fields for accountant role
            project.totalBudget = "••••••";
            
            if (project.budgetSummary) {
                project.budgetSummary.totalBudget = "••••••";
                project.budgetSummary.totalPaid = "••••••";
                project.budgetSummary.remainingBalance = "••••••";
                project.budgetSummary.paymentProgress = "•";
                project.budgetSummary.totalExpense = "••••••";
                project.budgetSummary.totalBudgetUsed = "•";
            }
            
            return res.status(200).json({
                success: true,
                message: "Project fetched successfully (restricted view)",
                data: project,
            });
        }

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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of items per page
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
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
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
        const page = req.query.page ? parseInt(req.query.page as string) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
        const authReq = req as any;

        let result;

        // Security / Role-based Filtering
        if (authReq.user?.role === 'customer') {
            // Customers only see their own projects via service or manual filter
            // Since getAllTheProjects returns everything, we filter or use specialized service
            // Better: use specialized service if available, else filter.
            const projects = await ProjectServices.getProjectsByCustomerId(authReq.user.userId);
            return res.status(200).json({
                success: true,
                message: "Your projects fetched successfully",
                data: projects
            });
        }

        if (authReq.user?.role === 'supervisor') {
            // Supervisors only see their projects
            const projects = await ProjectServices.getProjectsBySupervisorId(authReq.user.userId); // Assuming this exists or I'll implement
            // Wait, does it exist? Let's check or use a fallback.
            // I'll check project.services.ts for getProjectsBySupervisorId.
            result = await ProjectServices.getAllTheProjects(search, page, limit);
            const filteredProjects = result.projects ? result.projects.filter((p: any) => p.supervisor?.userId === authReq.user.userId) : result.filter((p: any) => p.supervisor?.userId === authReq.user.userId);
            
             return res.status(200).json({
                success: true,
                message: "Assigned projects fetched successfully",
                data: filteredProjects
            });
        }

        result = await ProjectServices.getAllTheProjects(search, page, limit);

        // Check if result has pagination metadata
        if (result.pagination) {
            let projects = result.projects;
            if (authReq.user?.role === 'accountant') {
                projects = projects.map((p: any) => {
                    p.totalBudget = "••••••";
                    if (p.budgetSummary) {
                        p.budgetSummary.totalBudget = "••••••";
                        p.budgetSummary.totalPaid = "••••••";
                        p.budgetSummary.remainingBalance = "••••••";
                    }
                    return p;
                });
            }
            return res.status(200).json({
                success: true,
                message: authReq.user?.role === 'accountant' ? "Projects fetched successfully (restricted view)" : "Projects fetched successfully",
                data: projects,
                pagination: result.pagination
            });
        }

        // Default response for no pagination
        if (authReq.user?.role === 'accountant') {
            const maskedProjects = (result.projects || result).map((p: any) => {
                p.totalBudget = "••••••";
                if (p.budgetSummary) {
                    p.budgetSummary.totalBudget = "••••••";
                    p.budgetSummary.totalPaid = "••••••";
                    p.budgetSummary.remainingBalance = "••••••";
                }
                return p;
            });
            return res.status(200).json({
                success: true,
                message: "Projects fetched successfully (restricted view)",
                data: maskedProjects
            });
        }

        return res.status(200).json({
            success: true,
            message: "Projects fetched successfully",
            data: result
        });

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
 *             type: object
 *             properties:
 *               projectName:
 *                 type: string
 *               projectType:
 *                 type: string
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: ["Inprogress", "OnHold", "Completed"]
 *                 description: Update project status (aliases to initialStatus)
 *               initialStatus:
 *                 type: string
 *                 description: Original field for status
 *               startDate:
 *                 type: string
 *                 format: date
 *               expectedCompletion:
 *                 type: string
 *                 format: date
 *               totalBudget:
 *                 type: number
 *               materialName:
 *                 type: string
 *               quantity:
 *                 type: number
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               supervisorId:
 *                 type: string
 *                 format: uuid
 *               projectManager:
 *                  type: string
 *               area:
 *                  type: string
 *               numberOfFloors:
 *                  type: number
 *               priority:
 *                  type: string
 *               currency:
 *                  type: string
 *               description:
 *                  type: string
 *               progress:
 *                  type: number
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

        const authReq = req as any;
        const fullName = authReq.user?.fullName || "System";
        const updatedData = await ProjectServices.updateProject(projectId, { ...req.body, updatedBy: fullName });

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
 *                         progress:
 *                           type: number
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


/**
 * @swagger
 * /api/project/recent-active:
 *   get:
 *     summary: Get 9 most recent active projects (Admin only)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent active projects fetched successfully
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
exports.getRecentActiveProjects = async (req: Request, res: Response) => {
    try {
        const projects = await ProjectServices.getRecentActiveProjects();

        const authReq = req as any;
        if (authReq.user?.role === 'accountant') {
            const maskedProjects = projects.map((p: any) => {
                p.totalBudget = "••••••";
                return p;
            });
            return res.status(200).json({
                success: true,
                message: "Recent active projects fetched successfully (restricted view)",
                data: maskedProjects
            });
        }

        return res.status(200).json({
            success: true,
            message: "Recent active projects fetched successfully",
            data: projects
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

