import prisma from "../../config/prisma.client";
import { ProjectStatus, ProjectType, Prisma } from "@prisma/client";

// Helper function to parse date strings to Date objects
const parseDate = (dateInput: string | Date): Date => {
    if (dateInput instanceof Date) {
        return dateInput;
    }
    // If it's a date string like "2024-01-15", convert to full ISO date
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateInput}`);
    }
    return date;
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
        customerId: string,
        supervisorId: string,
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

    // Validate Customer
    const customer = await prisma.user.findUnique({
        where: { userId: data.customerId }
    });
    if (!customer) {
        throw new Error(`Customer with ID ${data.customerId} not found`);
    }

    // Validate Supervisor
    const supervisor = await prisma.supervisor.findUnique({
        where: { supervisorId: data.supervisorId }
    });
    if (!supervisor) {
        throw new Error(`Supervisor with ID ${data.supervisorId} not found`);
    }

    const newProject = await prisma.project.create({
        data: {
            projectName: data.projectName,
            projectType: data.projectType as ProjectType,
            location: data.location,
            initialStatus: data.initialStatus as ProjectStatus,
            startDate: parseDate(data.startDate),
            expectedCompletion: parseDate(data.expectedCompletion),
            totalBudget: data.totalBudget,
            materialName: data.materialName || "",
            quantity: data.quantity || 0,
            notes: data.notes || "",
            customerId: data.customerId,
            supervisorId: data.supervisorId,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    });

    // Notify Admin
    SocketService.getInstance().emitToRole("admin", "project_created", newProject);

    // Notify Supervisor
    SocketService.getInstance().emitToUser(supervisor.userId, "notification", {
        type: "PROJECT_ASSIGNED",
        message: `You have been assigned to new project: ${newProject.projectName}`,
        projectId: newProject.projectId
    });

    // Notify Customer
    SocketService.getInstance().emitToUser(customer.userId, "notification", {
        type: "PROJECT_CREATED",
        message: `Your project ${newProject.projectName} has been created`,
        projectId: newProject.projectId
    });

    return newProject;
}

// ... existing code ...

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
    supervisorId?: string,
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

    if (updateData.startDate !== undefined) dataToUpdate.startDate = parseDate(updateData.startDate);
    if (updateData.expectedCompletion !== undefined) dataToUpdate.expectedCompletion = parseDate(updateData.expectedCompletion);
    if (updateData.totalBudget !== undefined) dataToUpdate.totalBudget = updateData.totalBudget;
    if (updateData.materialName !== undefined) dataToUpdate.materialName = updateData.materialName;
    if (updateData.quantity !== undefined) dataToUpdate.quantity = updateData.quantity;
    if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;

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

    if (updateData.supervisorId !== undefined) {
        // Validate Supervisor
        const supervisor = await prisma.supervisor.findUnique({
            where: { supervisorId: updateData.supervisorId }
        });
        if (!supervisor) {
            throw new Error(`Supervisor with ID ${updateData.supervisorId} not found`);
        }
        dataToUpdate.supervisor = { connect: { supervisorId: updateData.supervisorId } };
    }

    const updatedProject = await prisma.project.update({
        where: { projectId },
        data: dataToUpdate,
        include: { supervisor: true, customer: true } // Include relations for notification
    });

    // Notify Admin
    SocketService.getInstance().emitToRole("admin", "project_updated", updatedProject);

    // Notify Supervisor
    if (updatedProject.supervisor) {
        SocketService.getInstance().emitToUser(updatedProject.supervisor.userId, "notification", {
            type: "PROJECT_UPDATED",
            message: `Project ${updatedProject.projectName} has been updated`,
            projectId: updatedProject.projectId
        });
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
export const getProjectById = async (projectId: string) => {
    if (!projectId) throw new Error("Project ID is required");
    const project = await prisma.project.findUnique({
        where: { projectId },
        include: { customer: true, supervisor: true }
    });
    if (!project) throw new Error(`Project with ID ${projectId} not found`);
    return project;
};

/**
 * Get projects by Customer ID
 * @param customerId - The user ID of the customer
 * @returns List of projects
 */
export const getProjectsByCustomerId = async (customerId: string) => {
    return prisma.project.findMany({
        where: { customerId },
        select: { projectId: true, projectName: true, location: true }
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
export const getAllProjectsBudgets = async () => {
    return prisma.project.findMany({
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
