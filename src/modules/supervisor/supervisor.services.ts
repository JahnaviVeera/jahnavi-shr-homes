import prisma from "../../config/prisma.client";
import * as bcrypt from "bcrypt";
import { SupervisorStatus, UserRole, Prisma } from "@prisma/client";
import { notifyUser } from "../notifications/notifications.services";

// Create a new supervisor
export const createSupervisor = async (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
    status?: string;
    projectIds?: string[] | null; // Optional: Assign projects during creation
}) => {
    // Check if supervisor with same email already exists
    const existingSupervisor = await prisma.supervisor.findFirst({
        where: { email: data.email }
    });

    if (existingSupervisor) {
        throw new Error("Supervisor already exists with this email");
    }

    // Check if user with same email already exists
    const existingUser = await prisma.user.findFirst({
        where: { email: data.email }
    });

    if (existingUser) {
        throw new Error("User already exists with this email");
    }

    // Hash password
    if (!data.password || data.password.trim() === "") {
        throw new Error("Password is required for supervisor");
    }

    const hashedPassword = await bcrypt.hash(data.password.trim(), 10);

    // Create user account for authentication
    const savedUser = await prisma.user.create({
        data: {
            userName: data.fullName,
            role: UserRole.supervisor, // Enforce supervisor role
            email: data.email,
            password: hashedPassword,
            contact: data.phoneNumber,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    });

    // Explicitly determine status
    const supervisorStatus: SupervisorStatus = (data.status as SupervisorStatus) || SupervisorStatus.Active;

    // Explicitly determine projectId and projects connection
    let assignedProjectId: string | null = null;
    let projectsConnect: Prisma.SupervisorCreateInput['projects'] = undefined;

    if (data.projectIds && data.projectIds.length > 0) {
        assignedProjectId = data.projectIds[0]!;
        projectsConnect = {
            connect: data.projectIds.map((id) => ({ projectId: id }))
        };
    }

    // Create supervisor record
    const savedSupervisor = await prisma.supervisor.create({
        data: {
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber,
            password: hashedPassword,
            status: supervisorStatus,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: savedUser.userId,
            projectId: assignedProjectId,
            ...(projectsConnect ? { projects: projectsConnect } : {})
        }
    });

    // Remove password from response
    const { password: _, ...supervisorWithoutPassword } = savedSupervisor;

    // Return supervisor data with user info
    return {
        ...supervisorWithoutPassword,
        userId: savedUser.userId
    };
};

// Get supervisor by ID
export const getSupervisorById = async (supervisorId: string) => {
    if (!supervisorId) {
        throw new Error("Supervisor ID is required");
    }

    const supervisor = await prisma.supervisor.findUnique({
        where: { supervisorId }
    });

    if (!supervisor) {
        throw new Error("Supervisor not found");
    }

    // Get assigned project count
    const projects = await prisma.project.findMany({
        where: { supervisorId },
        include: { customer: true }
    });

    // Remove password from response and add projects count
    const { password: _, ...supervisorWithoutPassword } = supervisor;
    return {
        ...supervisorWithoutPassword,
        assignedProjectsCount: projects.length,
        projects: projects
    };
};

/**
 * Get supervisor by User ID
 * @param userId - The ID of the user record
 * @returns Supervisor record
 */
export const getSupervisorByUserId = async (userId: string) => {
    if (!userId) {
        throw new Error("User ID is required");
    }

    const supervisor = await prisma.supervisor.findUnique({
        where: { userId }
    });

    if (!supervisor) {
        throw new Error("Supervisor record not found for this user");
    }

    return supervisor;
};

export const getSupervisorProfile = async (supervisorId: string) => {
    if (!supervisorId) {
        throw new Error("Supervisor ID is required");
    }

    const supervisor = await prisma.supervisor.findUnique({
        where: { supervisorId }
    });

    if (!supervisor) {
        throw new Error("Supervisor not found");
    }

    // Active: Not Completed (Planning, Inprogress, OnHold)
    const activeProjectsCount = await prisma.project.count({
        where: {
            supervisorId,
            initialStatus: {
                not: 'Completed' as any
            }
        }
    });

    // Completed: Status is Completed
    const completedProjectsCount = await prisma.project.count({
        where: {
            supervisorId,
            initialStatus: 'Completed' as any
        }
    });

    const { password: _, ...supervisorWithoutPassword } = supervisor;

    return {
        ...supervisorWithoutPassword,
        assignedCount: activeProjectsCount,
        completedCount: completedProjectsCount
    };
};

// Get all supervisors
export const getAllSupervisors = async (search?: string) => {
    const whereClause: Prisma.SupervisorWhereInput = {};

    if (search) {
        whereClause.OR = [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } }
        ];
    }

    const supervisors = await prisma.supervisor.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" }
    });

    if (!supervisors) {
        return [];
    }

    // Get projects count for each supervisor
    const supervisorsWithCounts = await Promise.all(
        supervisors.map(async (supervisor: any) => {
            const projectsCount = await prisma.project.count({
                where: { supervisorId: supervisor.supervisorId }
            });

            const { password: _, ...supervisorWithoutPassword } = supervisor;
            return {
                ...supervisorWithoutPassword,
                assignedProjectsCount: projectsCount
            };
        })
    );

    return supervisorsWithCounts;
};

// Update supervisor
export const updateSupervisor = async (supervisorId: string, updateData: {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    password?: string | null;
    status?: string;
    projectIds?: string[] | null;
}) => {
    const supervisor = await prisma.supervisor.findUnique({
        where: { supervisorId }
    });

    if (!supervisor) {
        throw new Error("Supervisor not found");
    }

    // Check if email is being updated and if it already exists
    if (updateData.email && updateData.email !== supervisor.email) {
        const existingSupervisor = await prisma.supervisor.findFirst({
            where: { email: updateData.email }
        });

        if (existingSupervisor) {
            throw new Error("Email already exists for another supervisor");
        }
    }

    const dataToUpdate: Prisma.SupervisorUpdateInput = {
        updatedAt: new Date(),
    };

    // Only update fields that are provided
    if (updateData.fullName !== undefined) dataToUpdate.fullName = updateData.fullName;
    if (updateData.email !== undefined) dataToUpdate.email = updateData.email;
    if (updateData.phoneNumber !== undefined) dataToUpdate.phoneNumber = updateData.phoneNumber;
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status as SupervisorStatus;

    // Handle password update (hash if provided)
    if (updateData.password !== undefined) {
        if (updateData.password === null || updateData.password.trim() === "") {
            dataToUpdate.password = null;
        } else {
            dataToUpdate.password = await bcrypt.hash(updateData.password, 10);
        }
    }

    // Handle project assignment
    if (updateData.projectIds && updateData.projectIds.length > 0) {
        // We add the projects to the supervisor's list
        (dataToUpdate as any).projects = {
            connect: updateData.projectIds.map((id) => ({ projectId: id }))
        };
    }

    const updatedSupervisor = await prisma.supervisor.update({
        where: { supervisorId },
        data: dataToUpdate,
    });

    // Remove password from response
    const { password: _, ...supervisorWithoutPassword } = updatedSupervisor;
    return supervisorWithoutPassword;
};

// Delete supervisor
export const deleteSupervisor = async (supervisorId: string) => {
    const supervisor = await prisma.supervisor.findUnique({
        where: { supervisorId }
    });

    if (!supervisor) {
        throw new Error("Supervisor not found");
    }

    const deletedSupervisor = await prisma.supervisor.delete({
        where: { supervisorId }
    });
    return deletedSupervisor;
};

// Assign project to supervisor
export const assignProjectToSupervisor = async (supervisorId: string, projectId: string) => {
    // Check if supervisor exists
    const supervisor = await prisma.supervisor.findUnique({
        where: { supervisorId }
    });

    if (!supervisor) {
        throw new Error("Supervisor not found");
    }

    // Assign project to supervisor by connecting to projects relation
    const updatedSupervisor = await prisma.supervisor.update({
        where: { supervisorId },
        data: {
            projects: {
                connect: { projectId }
            },
            projectId: projectId,
            updatedAt: new Date(),
        },
        include: { projects: true }
    });

    const refreshedProjects = updatedSupervisor.projects;

    // Get projects count
    const projectsCount = await prisma.project.count({
        where: { supervisorId }
    });

    // Remove password from response
    const { password: _, ...supervisorWithoutPassword } = updatedSupervisor;

    // Notify the supervisor
    const project = await prisma.project.findUnique({
        where: { projectId },
        select: { projectName: true }
    });

    if (project) {
        await notifyUser(
            supervisor.userId,
            `You have been assigned to a new project: ${project.projectName}`,
            "PROJECT_ASSIGNED"
        );
    }

    return {
        ...supervisorWithoutPassword,
        assignedProjectsCount: projectsCount,
        assignedProjects: refreshedProjects
    };
};

// Remove project from supervisor
export const removeProjectFromSupervisor = async (supervisorId: string, projectId: string) => {
    // Check if supervisor exists
    const supervisor = await prisma.supervisor.findUnique({
        where: { supervisorId }
    });

    if (!supervisor) {
        throw new Error("Supervisor not found");
    }

    // Remove project assignment by disconnecting from projects relation
    const updatedSupervisor = await prisma.supervisor.update({
        where: { supervisorId },
        data: {
            projects: {
                disconnect: { projectId }
            },
            projectId: null,
            updatedAt: new Date(),
        }
    });


    // Get supervisor (fresh fetch)
    const freshSupervisor = await prisma.supervisor.findUnique({
        where: { supervisorId }
    });

    if (!freshSupervisor) {
        throw new Error("Supervisor not found after update");
    }

    // Get projects count
    const projectsCount = await prisma.project.count({
        where: { supervisorId }
    });

    // Remove password from response
    const { password: _, ...supervisorWithoutPassword } = freshSupervisor;

    // Notify the supervisor
    const project = await prisma.project.findUnique({
        where: { projectId },
        select: { projectName: true }
    });

    if (project) {
        await notifyUser(
            supervisor.userId,
            `You have been removed from project: ${project.projectName}`,
            "PROJECT_REMOVED"
        );
    }

    return {
        ...supervisorWithoutPassword,
        assignedProjectsCount: projectsCount
    };
};

// Get assigned projects count for a supervisor
export const getAssignedProjectsCount = async (supervisorId: string) => {
    if (!supervisorId) {
        throw new Error("Supervisor ID is required");
    }

    const supervisor = await prisma.supervisor.findUnique({
        where: { supervisorId }
    });

    if (!supervisor) {
        throw new Error("Supervisor not found");
    }

    // Get assigned projects
    const projects = await prisma.project.findMany({
        where: { supervisorId },
        include: { customer: true }
    });

    return {
        supervisorId: supervisor.supervisorId,
        fullName: supervisor.fullName,
        email: supervisor.email,
        assignedProjectsCount: projects.length,
        projects: projects
    };
};

// Get all assigned projects for a supervisor
export const getAssignedProjects = async (supervisorId: string) => {
    if (!supervisorId) {
        throw new Error("Supervisor ID is required");
    }

    const supervisor = await prisma.supervisor.findUnique({
        where: { supervisorId }
    });

    if (!supervisor) {
        throw new Error("Supervisor not found");
    }

    // Get all assigned projects with relations
    const projects = await prisma.project.findMany({
        where: { supervisorId },
        include: {
            customer: true,
            dailyUpdates: {
                orderBy: { createdAt: 'desc' }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    // Helper to format date
    const formatDate = (date: Date | string | null): string | null => {
        if (!date) return null;
        const d = new Date(date);
        if (isNaN(d.getTime())) return typeof date === 'string' ? date : null;

        const day = d.getDate().toString().padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();

        return `${day} ${month} ${year}`;
    };

    // Calculate progress for each project and format dates
    const projectsWithProgress = projects.map(project => {
        // Filter updates for this project that are APPROVED
        const approvedUpdates = project.dailyUpdates.filter(u => u.status === 'approved'); // Status is Enum in DB but string in JS after Prisma fetch

        // Count unique approved stages
        const uniqueStages = new Set(approvedUpdates.map(u => u.constructionStage));
        const totalStages = 6; // Total number of construction stages defined in enum

        // Calculate percentage (capped at 100)
        const progress = Math.min(Math.round((uniqueStages.size / totalStages) * 100), 100);

        // Format Daily Updates dates
        const formattedDailyUpdates = project.dailyUpdates.map(update => ({
            ...update,
            createdAt: formatDate(update.createdAt),
            updatedAt: formatDate(update.updatedAt)
        }));

        return {
            ...project,
            startDate: formatDate(project.startDate),
            expectedCompletion: formatDate(project.expectedCompletion),
            createdAt: formatDate(project.createdAt),
            updatedAt: formatDate(project.updatedAt),
            progress,
            dailyUpdates: formattedDailyUpdates
        };
    });

    return {
        supervisorId: supervisor.supervisorId,
        supervisorName: supervisor.fullName,
        supervisorEmail: supervisor.email,
        assignedProjectsCount: projects.length,
        projects: projectsWithProgress
    }
};


