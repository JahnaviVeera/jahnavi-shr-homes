import prisma from "../../config/prisma.client";
import { ProjectStatus, ProjectType, Prisma, DailyUpdateStatus, ConstructionStage, PaymentStatus } from "@prisma/client";
import { notifyUser } from "../notifications/notifications.services";

// Helper function to format date inputs as YYYY-MM-DD strings
const formatDateString = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return "";
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateInput}`);
    }
    return date.toISOString().split('T')[0] ?? "";
};

import SocketService from "../../services/socket.service";

// Create a new project
export const createProject = async (data:
    {
        projectName: string,
        projectType: string,
        location: string,
        initialStatus: string,
        startDate: string | Date,
        expectedCompletion: string | Date,
        totalBudget: number,
        materialName?: string,
        quantity?: number,
        notes?: string,
        customerId: string | null,
        supervisorId: string | null,
        // New fields
        projectManager?: string,
        area?: string,
        numberOfFloors?: number,
        priority?: string,
        currency?: string,

        description?: string,
        progress?: number,

        createdAt?: Date,
        updatedAt?: Date
    }) => {



    // Validate projectType
    const validProjectTypes = Object.values(ProjectType);
    if (!validProjectTypes.includes(data.projectType as ProjectType)) {
        throw new Error(`Invalid projectType: "${data.projectType}". Valid values are: ${validProjectTypes.join(', ')}`);
    }

    // Validate initialStatus
    const validStatuses = Object.values(ProjectStatus);
    if (!validStatuses.includes(data.initialStatus as ProjectStatus)) {
        throw new Error(`Invalid initialStatus: "${data.initialStatus}". Valid values are: ${validStatuses.join(', ')}`);
    }

    // Validate IDs
    if (!data.customerId) {
        throw new Error("customerId is required");
    }

    // Validate Customer
    const customer = await prisma.user.findUnique({
        where: { userId: data.customerId }
    });
    if (!customer) {
        throw new Error(`Customer with ID ${data.customerId} not found`);
    }

    // Validate Supervisor
    let supervisor = null;
    if (data.supervisorId) {
        supervisor = await prisma.supervisor.findUnique({
            where: { supervisorId: data.supervisorId }
        });
        if (!supervisor) {
            throw new Error(`Supervisor with ID ${data.supervisorId} not found`);
        }
    }

    // Check if project already exists for this customer with the same name and location
    const existingProject = await prisma.project.findFirst({
        where: {
            projectName: data.projectName,
            customerId: data.customerId as string,
            location: data.location
        }
    });

    if (existingProject) {
        throw new Error("Project with this name and location already exists for this customer");
    }

    const newProject = await prisma.project.create({
        data: {
            projectName: data.projectName,
            projectType: data.projectType as ProjectType,
            location: data.location,
            initialStatus: data.initialStatus as ProjectStatus,
            startDate: formatDateString(data.startDate),
            expectedCompletion: formatDateString(data.expectedCompletion),
            totalBudget: data.totalBudget,
            materialName: data.materialName || "",
            quantity: data.quantity || 0,
            notes: data.notes || "",
            customerId: data.customerId as string,
            supervisorId: data.supervisorId,

            projectManager: data.projectManager || null,
            area: data.area || null,
            numberOfFloors: data.numberOfFloors || null,
            priority: data.priority || "Medium",
            currency: data.currency || "INR",
            description: data.description || "",
            progress: data.progress || 0,

            createdAt: new Date(),
            updatedAt: new Date(),
        }
    });

    // Notify Admin
    SocketService.getInstance().emitToRole("admin", "project_created", newProject);

    // Notify Supervisor
    if (supervisor) {
        // Socket notification for real-time
        SocketService.getInstance().emitToUser(supervisor.userId, "notification", {
            type: "PROJECT_ASSIGNED",
            message: `You have been assigned to new project: ${newProject.projectName}`,
            projectId: newProject.projectId
        });

        // Persistent notification for dashboard
        await notifyUser(
            supervisor.userId,
            `You have been assigned to new project: ${newProject.projectName}`,
            "PROJECT_ASSIGNED"
        );
    }

    // Notify Customer
    SocketService.getInstance().emitToUser(customer.userId, "notification", {
        type: "PROJECT_CREATED",
        message: `Your project ${newProject.projectName} has been created`,
        projectId: newProject.projectId
    });

    return newProject;
}

/**
 * Get all projects with optional search
 * @param search - Search term for project name, location, material, or notes
 * @returns List of projects
 */
// Helper function to format Project ID (PR0001 format)
const formatProjectId = (projectId: string, index?: number): string => {
    // If index is provided, use it for sequential numbering
    if (index !== undefined) {
        return `PR${String(index + 1).padStart(4, '0')}`;
    }
    // Otherwise, extract number from UUID or use a hash
    const hash = projectId.split('-')[0] || projectId.substring(0, 8);
    // Use first 4 chars of hash as hex to generate number
    const num = parseInt(hash.substring(0, 4), 16) % 10000;
    return `PR${String(num).padStart(4, '0')}`;
};

/**
 * Get all projects with optional search and pagination
 * @param search - Search term for project name, location, material, or notes
 * @param page - Page number for pagination
 * @param limit - Number of items per page
 * @returns List of projects with pagination metadata
 */
export const getAllTheProjects = async (search?: string, page?: number, limit?: number) => {
    const whereClause: Prisma.ProjectWhereInput = {};

    if (search) {
        whereClause.OR = [
            { projectName: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
            { materialName: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } }
        ];
    }

    // Pagination logic
    const isPaginationEnabled = page !== undefined && limit !== undefined;

    const queryOptions: Prisma.ProjectFindManyArgs = {
        where: whereClause,
        include: {
            customer: true,
            supervisor: true,
            materials: true,
            dailyUpdates: {
                where: { status: DailyUpdateStatus.approved },
                select: { constructionStage: true }
            }
        },
        orderBy: { createdAt: 'desc' } // Order by creation time
    };

    if (isPaginationEnabled) {
        queryOptions.skip = (page! - 1) * limit!;
        queryOptions.take = limit!;
    }

    // Run queries in parallel if pagination is enabled to get total count
    const [projects, totalCount] = await Promise.all([
        prisma.project.findMany(queryOptions),
        isPaginationEnabled ? prisma.project.count({ where: whereClause }) : Promise.resolve(0)
    ]);

    const formattedProjects = projects.map((project, index) => {
        // Exclude the big dailyUpdates array from the final response to keep it clean.
        // We need to cast project to any or specific type because Prisma includes types are complex
        const p = project as any;
        const { dailyUpdates, ...rest } = p;

        // Format dates to DD-MM-YYYY
        const formatToDDMMYYYY = (date: Date | string | null): string => {
            if (!date) return '';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        };

        // Determine the correct index for ID generation
        const sequentialIndex = isPaginationEnabled ? ((page! - 1) * limit!) + index : index;

        // Calculate progress
        const uniqueStages = new Set(dailyUpdates.map((u: any) => u.constructionStage));
        const totalStages = 6;
        const calculatedProgress = Math.min(Math.round((uniqueStages.size / totalStages) * 100), 100);

        return {
            ...rest,
            progress: calculatedProgress,
            startDate: formatToDDMMYYYY(project.startDate),
            expectedCompletion: formatToDDMMYYYY(project.expectedCompletion),
            id: formatProjectId(project.projectId, sequentialIndex)
        };
    });

    if (isPaginationEnabled) {
        return {
            projects: formattedProjects,
            pagination: {
                total: totalCount,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalCount / Number(limit))
            }
        };
    }

    return formattedProjects;
};

// Update project
export const updateProject = async (projectId: string, updateData: {
    projectName?: string,
    projectType?: string,
    location?: string,
    initialStatus?: string,
    startDate?: string | Date,
    expectedCompletion?: string | Date,
    totalBudget?: number,
    materialName?: string,
    quantity?: number,
    notes?: string,
    customerId?: string,
    supervisorId?: string | null,

    // New fields
    projectManager?: string,
    area?: string,
    numberOfFloors?: number,
    priority?: string,
    currency?: string,

    description?: string,
    progress?: number,

    updatedAt?: Date
} | undefined | null) => {
    // Check if updateData is provided
    if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error("No update data provided. Please provide at least one field to update.");
    }

    const project = await prisma.project.findUnique({ where: { projectId } });

    if (!project) {
        throw new Error("Project not found");
    }

    const dataToUpdate: Prisma.ProjectUpdateInput = {
        updatedAt: new Date(),
    };

    if (updateData.projectName !== undefined) dataToUpdate.projectName = updateData.projectName;

    if (updateData.projectType !== undefined) {
        // Validate projectType
        const validProjectTypes = Object.values(ProjectType);
        if (!validProjectTypes.includes(updateData.projectType as ProjectType)) {
            throw new Error(`Invalid projectType: "${updateData.projectType}". Valid values are: ${validProjectTypes.join(', ')}`);
        }
        dataToUpdate.projectType = updateData.projectType as ProjectType;
    }

    if (updateData.location !== undefined) dataToUpdate.location = updateData.location;

    if (updateData.initialStatus !== undefined) {
        // Validate initialStatus
        const validStatuses = Object.values(ProjectStatus);
        if (!validStatuses.includes(updateData.initialStatus as ProjectStatus)) {
            throw new Error(`Invalid initialStatus: "${updateData.initialStatus}". Valid values are: ${validStatuses.join(', ')}`);
        }
        dataToUpdate.initialStatus = updateData.initialStatus as ProjectStatus;
    }

    if (updateData.startDate !== undefined) dataToUpdate.startDate = formatDateString(updateData.startDate);
    if (updateData.expectedCompletion !== undefined) dataToUpdate.expectedCompletion = formatDateString(updateData.expectedCompletion);
    if (updateData.totalBudget !== undefined) dataToUpdate.totalBudget = updateData.totalBudget;
    if (updateData.materialName !== undefined) dataToUpdate.materialName = updateData.materialName;
    if (updateData.quantity !== undefined) dataToUpdate.quantity = updateData.quantity;
    if (updateData.quantity !== undefined) dataToUpdate.quantity = updateData.quantity;
    if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;

    // New fields
    if (updateData.projectManager !== undefined) dataToUpdate.projectManager = updateData.projectManager;
    if (updateData.area !== undefined) dataToUpdate.area = updateData.area;
    if (updateData.numberOfFloors !== undefined) dataToUpdate.numberOfFloors = updateData.numberOfFloors;
    if (updateData.priority !== undefined) dataToUpdate.priority = updateData.priority;
    if (updateData.currency !== undefined) dataToUpdate.currency = updateData.currency;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.progress !== undefined) dataToUpdate.progress = updateData.progress;

    if (updateData.customerId !== undefined) {
        // Validate Customer
        const customer = await prisma.user.findUnique({
            where: { userId: updateData.customerId }
        });
        if (!customer) {
            throw new Error(`Customer with ID ${updateData.customerId} not found`);
        }
        dataToUpdate.customer = { connect: { userId: updateData.customerId } };
    }

    if (updateData.supervisorId !== undefined && updateData.supervisorId !== null) {
        // Validate Supervisor
        const supervisor = await prisma.supervisor.findUnique({
            where: { supervisorId: updateData.supervisorId }
        });
        if (!supervisor) {
            throw new Error(`Supervisor with ID ${updateData.supervisorId} not found`);
        }
        dataToUpdate.supervisor = { connect: { supervisorId: updateData.supervisorId } };
    } else if (updateData.supervisorId === null) {
        dataToUpdate.supervisor = { disconnect: true };
    }

    const updatedProject = await prisma.project.update({
        where: { projectId },
        data: dataToUpdate,
        include: { customer: true }
    });

    // Notify Admin
    SocketService.getInstance().emitToRole("admin", "project_updated", updatedProject);

    // Notify Supervisor
    if (updatedProject.supervisorId) {
        const supervisor = await prisma.supervisor.findUnique({
            where: { supervisorId: updatedProject.supervisorId }
        });
        if (supervisor) {
            // Socket notification for real-time
            SocketService.getInstance().emitToUser(supervisor.userId, "notification", {
                type: "PROJECT_UPDATED",
                message: `Project ${updatedProject.projectName} has been updated`,
                projectId: updatedProject.projectId
            });

            // Persistent notification for dashboard
            await notifyUser(
                supervisor.userId,
                `Project ${updatedProject.projectName} has been updated`,
                "PROJECT_UPDATED"
            );
        }
    }

    // Notify Customer
    if (updatedProject.customer) {
        SocketService.getInstance().emitToUser(updatedProject.customer.userId, "notification", {
            type: "PROJECT_UPDATED",
            message: `Project ${updatedProject.projectName} has been updated`,
            projectId: updatedProject.projectId
        });
    }

    return updatedProject;
};


// Delete project
export const deleteProject = async (projectId: string) => {
    const project = await prisma.project.findUnique({ where: { projectId } });

    if (!project) {
        throw new Error("Project not found");
    }

    await prisma.project.delete({
        where: { projectId },
    });

    return { success: true, message: "Project deleted successfully" };
};

/**
 * Get project by ID
 * @param projectId - The ID of the project
 * @returns Project record with details
 */
export const getProjectByProjectId = async (projectId: string) => {
    if (!projectId) throw new Error("Project ID is required");
    const project = await prisma.project.findUnique({
        where: { projectId },
        include: {
            customer: true,
            supervisor: true,
            quotations: true,
            payments: {
                select: {
                    amount: true,
                    paymentStatus: true
                }
            },
            dailyUpdates: {
                orderBy: { createdAt: 'desc' },
                select: {
                    constructionStage: true,
                    status: true,
                    updatedAt: true,
                    createdAt: true
                }
            }
        }
    });

    if (!project) throw new Error(`Project with ID ${projectId} not found`);

    // Calculate progress based on approved daily updates
    const dailyUpdates = (project as any).dailyUpdates || [];
    const uniqueApprovedStages = new Set(dailyUpdates
        .filter((u: any) => u.status === DailyUpdateStatus.approved)
        .map((u: any) => u.constructionStage));

    const totalStages = 6;
    const progress = Math.min(Math.round((uniqueApprovedStages.size / totalStages) * 100), 100);

    // Calculate Budget Summary
    const payments = (project as any).payments || [];
    const totalPaid = payments
        .filter((p: any) => p.paymentStatus === PaymentStatus.completed)
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    const totalBudget = Number(project.totalBudget);
    const remainingBalance = totalBudget - totalPaid;

    const budgetSummary = {
        totalBudget: project.totalBudget, // Return original format
        totalPaid,
        remainingBalance
    };

    // Build Construction Stages Timeline
    const definedStages = [
        "Foundation",
        "Framing",
        "Plumbing & Electrical",
        "Interior Walls",
        "Painting",
        "Finishing"
    ];

    const constructionStages = definedStages.map(stage => {
        let stageEnum: ConstructionStage;
        if (stage === "Plumbing & Electrical") {
            stageEnum = ConstructionStage.Plumbing___Electrical;
        } else if (stage === "Interior Walls") {
            stageEnum = ConstructionStage.Interior_Walls;
        } else {
            stageEnum = stage as ConstructionStage;
        }

        const stageUpdates = dailyUpdates.filter((u: any) => u.constructionStage === stageEnum);

        let status = "Pending";
        let date: Date | null = null;

        if (stageUpdates.length > 0) {
            const approved = stageUpdates.find((u: any) => u.status === DailyUpdateStatus.approved);
            if (approved) {
                status = "Completed";
                date = approved.updatedAt;
            } else {
                const latest = stageUpdates[0];
                status = "In Progress";
                date = latest.createdAt;
            }
        }

        return {
            stage,
            status,
            date: date ? new Date(date).toISOString().split('T')[0] : null
        };
    });


    // Format dates to DD-MM-YYYY
    const formatToDDMMYYYY = (date: Date | string | null): string => {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // Destructure to exclude dailyUpdates and payments from the response (payments are now summarized)
    const { dailyUpdates: _, payments: __, ...rest } = project as any;

    return {
        ...rest,
        progress, // Override stored progress
        budgetSummary, // Add budget summary
        constructionStages, // Add timeline data
        startDate: formatToDDMMYYYY(project.startDate),
        expectedCompletion: formatToDDMMYYYY(project.expectedCompletion)
    };
};

// Alias for backward compatibility
export const getProjectById = getProjectByProjectId;

// Helper function to format Quotation ID (Q0001 format)
const formatQuotationId = (quotationId: string): string => {
    const hash = quotationId.split('-')[0] || quotationId.substring(0, 8);
    const num = parseInt(hash.substring(0, 4), 16) % 10000;
    return `Q${String(num).padStart(4, '0')}`;
};

/**
 * Get projects by Customer ID
 * @param customerId - The user ID of the customer
 * @returns List of projects
 */
export const getProjectsByCustomerId = async (customerId: string) => {
    const projects = await prisma.project.findMany({
        where: { customerId },
        select: {
            projectId: true,
            projectName: true,
            location: true,
            progress: true,
            totalBudget: true,
            supervisorId: true,
            supervisor: {
                select: {
                    supervisorId: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true
                }
            },
            quotations: {
                select: {
                    quotationId: true,
                    totalAmount: true,
                    status: true,
                    date: true
                }
            },
            expenses: {
                select: {
                    amount: true
                }
            }
        }
    });

    return projects.map((project) => {
        const totalExpense = project.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
        const totalBudget = Number(project.totalBudget);
        const totalBudgetUsed = totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0;

        return {
            projectId: project.projectId,
            projectName: project.projectName,
            location: project.location,
            totalProgress: project.progress,
            totalBudget: project.totalBudget,
            totalExpense: totalExpense,
            totalBudgetUsed: totalBudgetUsed,
            supervisorId: project.supervisorId,
            supervisor: project.supervisor ? {
                supervisorId: project.supervisor.supervisorId,
                fullName: project.supervisor.fullName,
                email: project.supervisor.email,
                phoneNumber: project.supervisor.phoneNumber
            } : null,
            quotations: project.quotations.map(q => ({
                ...q,
                id: formatQuotationId(q.quotationId)
            }))
        };
    });
};

/**
 * Get projects by Supervisor ID
 * @param supervisorId - The ID of the supervisor
 * @returns List of projects
 */
export const getProjectsBySupervisorId = async (supervisorId: string) => {
    return prisma.project.findMany({
        where: { supervisorId },
        select: { projectId: true, projectName: true, location: true }
    });
};

/**
 * Get all projects with budget
 * @returns List of projects with IDs and budgets
 */
/**
 * Get all projects with budget, supports filtering by role
 * @returns List of projects with IDs and budgets
 */
export const getAllProjectsBudgets = async (supervisorId?: string, customerId?: string) => {
    const where: Prisma.ProjectWhereInput = {};
    if (supervisorId) where.supervisorId = supervisorId;
    if (customerId) where.customerId = customerId;

    return prisma.project.findMany({
        where,
        select: {
            projectId: true,
            totalBudget: true
        }
    });
};


/**
 * Assign multiple projects to a customer
 * @param customerId - The User ID of the customer
 * @param projectIds - Array of Project IDs
 */
export const assignProjectsToCustomer = async (customerId: string, projectIds: string[]) => {
    if (!projectIds || projectIds.length === 0) return;

    // Ensure all projects exist or handle errors?
    // prisma.project.updateMany allows batch update.
    const updateResult = await prisma.project.updateMany({
        where: { projectId: { in: projectIds } },
        data: { customerId: customerId }
    });

    // Check if distinct count matches? No, updateMany returns count.
    return updateResult;
};
/**
 * Get detailed project summary for a user (most recent project)
 * @param userId - The user ID (customer)
 * @returns Project details including supervisor name
 */
export const getProjectSummaryForUser = async (userId: string) => {
    // Fetch the most recent project for this customer
    const project = await prisma.project.findFirst({
        where: { customerId: userId },
        orderBy: { createdAt: 'desc' }, // Get the latest one
        include: {
            supervisor: {
                select: {
                    fullName: true,
                    phoneNumber: true,
                    email: true
                }
            }
        }
    });

    if (!project) return null;

    return {
        projectId: project.projectId,
        projectName: project.projectName,
        projectType: project.projectType,
        location: project.location,
        initialStatus: project.initialStatus,
        startDate: project.startDate,
        expectedCompletion: project.expectedCompletion,
        totalBudget: project.totalBudget,
        supervisorName: project.supervisor?.fullName || "Not Assigned",
        supervisorContact: project.supervisor?.phoneNumber || "",
        supervisorEmail: project.supervisor?.email || "",
        progress: project.progress || 0
    };
};

/**
 * Get 9 most recent active projects for admin dashboard
 * Active = Planning or Inprogress
 * @returns List of projects
 */
export const getRecentActiveProjects = async () => {
    const projects = await prisma.project.findMany({
        where: {
            initialStatus: {
                in: [ProjectStatus.Planning, ProjectStatus.Inprogress]
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 9,
        include: {
            customer: true,
            supervisor: true,
            materials: true
        }
    });

    return projects.map((project, index) => {
        // Format dates to DD-MM-YYYY
        const formatToDDMMYYYY = (date: Date | string | null): string => {
            if (!date) return '';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        };

        return {
            ...project,
            startDate: formatToDDMMYYYY(project.startDate),
            expectedCompletion: formatToDDMMYYYY(project.expectedCompletion),
            id: formatProjectId(project.projectId, index)
        };
    });
};

