import prisma from "../../config/prisma.client";
import * as bcrypt from "bcrypt";
import { SupervisorStatus, UserRole, Prisma, UserStatus } from "@prisma/client";
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

    // Check if phone number is already assigned to any user
    const existingUserByPhone = await prisma.user.findFirst({
        where: { contact: data.phoneNumber }
    });

    if (existingUserByPhone) {
        throw new Error("Mobile number already assigned to another user");
    }

    // Check if phone number is already assigned to any supervisor
    const existingSupervisorByPhone = await prisma.supervisor.findFirst({
        where: { phoneNumber: data.phoneNumber }
    });

    if (existingSupervisorByPhone) {
        throw new Error("Mobile number already assigned to another user");
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

    // Notify supervisor about assigned projects
    if (data.projectIds && data.projectIds.length > 0) {
        const projects = await prisma.project.findMany({
            where: { projectId: { in: data.projectIds } },
            select: { projectName: true }
        });

        for (const project of projects) {
            await notifyUser(
                savedUser.userId,
                `You have been assigned to a new project: ${project.projectName}`,
                "PROJECT_ASSIGNED"
            );
        }
    }

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

    const assignedProjects = await prisma.project.findMany({
        where: { supervisorId },
        include: {
            dailyUpdates: {
                where: { status: 'approved' as any },
                select: { constructionStage: true }
            }
        }
    });

    let activeProjectsCount = 0;
    let completedProjectsCount = 0;

    assignedProjects.forEach(project => {
        const uniqueStages = new Set(project.dailyUpdates.map(u => u.constructionStage));
        const progress = Math.min(Math.round((uniqueStages.size / 6) * 100), 100);

        // A project is completed if its status is marked as 'Completed' or progress reached 100
        if (project.initialStatus === 'Completed' as any || progress === 100) {
            completedProjectsCount++;
        } else {
            activeProjectsCount++;
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
    phone?: string;  // Allow 'phone' as alias for phoneNumber
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
        // Check in Supervisor table
        const existingSupervisor = await prisma.supervisor.findFirst({
            where: { email: updateData.email }
        });

        if (existingSupervisor) {
            throw new Error("Email already exists for another supervisor");
        }

        // Check in User table
        const existingUser = await prisma.user.findFirst({
            where: { email: updateData.email }
        });

        if (existingUser && existingUser.userId !== supervisor.userId) {
            throw new Error("Email already exists for another user");
        }
    }

    // Check if phone number is being updated and if it already exists
    const newPhone = updateData.phoneNumber || updateData.phone;
    if (newPhone && newPhone !== supervisor.phoneNumber) {
        // Check in User table
        const existingUserByPhone = await prisma.user.findFirst({
            where: { 
                contact: newPhone,
                NOT: { userId: supervisor.userId }
            }
        });

        if (existingUserByPhone) {
            throw new Error("Mobile number already assigned to another user");
        }

        // Check in Supervisor table
        const existingSupervisorByPhone = await prisma.supervisor.findFirst({
            where: { 
                phoneNumber: newPhone,
                NOT: { supervisorId: supervisorId }
            }
        });

        if (existingSupervisorByPhone) {
            throw new Error("Mobile number already assigned to another user");
        }
    }
    
    const dataToUpdate: Prisma.SupervisorUpdateInput = {
        updatedAt: new Date(),
    };

    const userDataToUpdate: Prisma.UserUpdateInput = {
        updatedAt: new Date(),
    };
    let hasUserUpdates = false;

    // Only update fields that are provided
    if (updateData.fullName !== undefined) {
        dataToUpdate.fullName = updateData.fullName;
        userDataToUpdate.userName = updateData.fullName;
        hasUserUpdates = true;
    }

    if (updateData.email !== undefined) {
        dataToUpdate.email = updateData.email;
        userDataToUpdate.email = updateData.email;
        hasUserUpdates = true;
    }

    // Handle Phone Number (support 'phone' or 'phoneNumber')
    if (newPhone !== undefined) {
        dataToUpdate.phoneNumber = newPhone;
        userDataToUpdate.contact = newPhone;
        hasUserUpdates = true;
    }

    // Handle Status
    if (updateData.status !== undefined) {
        // Validate status if needed, or assume it matches Enum
        // We'll trust the input or map it if it matches known values ignoring case
        const statusValues = Object.values(SupervisorStatus);
        const matchedStatus = statusValues.find(s => s.toLowerCase() === updateData.status?.toLowerCase());

        if (matchedStatus) {
            dataToUpdate.status = matchedStatus;
            userDataToUpdate.status = matchedStatus === 'Active' ? UserStatus.inprogress : UserStatus.completed;
            hasUserUpdates = true;
        } else {
            // If invalid status passed, maybe ignore or throw? 
            // Let's keep existing behavior: cast it (but safer to just use what we have if it matches)
            dataToUpdate.status = updateData.status as SupervisorStatus;
            userDataToUpdate.status = updateData.status === 'Active' ? UserStatus.inprogress : UserStatus.completed;
            hasUserUpdates = true;
        }
    }

    // Handle password update (hash if provided)
    if (updateData.password !== undefined) {
        if (updateData.password === null || updateData.password.trim() === "") {
            // If explicit null/empty passed, we might want to clear it? 
            // Or just ignore. The previous logic set it to null.
            dataToUpdate.password = null;
            // userDataToUpdate.password = null; // Optional: clear user password too? 
        } else {
            const hashedPassword = await bcrypt.hash(updateData.password, 10);
            dataToUpdate.password = hashedPassword;
            userDataToUpdate.password = hashedPassword;
            hasUserUpdates = true;
        }
    }

    // Handle project assignment
    if (updateData.projectIds && updateData.projectIds.length > 0) {
        // We add the projects to the supervisor's list
        (dataToUpdate as any).projects = {
            connect: updateData.projectIds.map((id) => ({ projectId: id }))
        };
    }

    // Update Supervisor
    const updatedSupervisor = await prisma.supervisor.update({
        where: { supervisorId },
        data: dataToUpdate,
    });

    // Sync updates to User table
    if (hasUserUpdates && supervisor.userId) {
        const userUpdateData: Prisma.UserUpdateInput = { ...userDataToUpdate };
        
        // If password was updated, also increment tokenVersion and delete refresh tokens
        if (updateData.password !== undefined) {
            userUpdateData.tokenVersion = { increment: 1 };
            
            await prisma.refreshToken.deleteMany({
                where: { userId: supervisor.userId }
            });
        }

        await prisma.user.update({
            where: { userId: supervisor.userId },
            data: userUpdateData
        });
    }

    // Notify supervisor about newly assigned projects
    if (updateData.projectIds && updateData.projectIds.length > 0) {
        const projects = await prisma.project.findMany({
            where: { projectId: { in: updateData.projectIds } },
            select: { projectName: true }
        });

        for (const project of projects) {
            await notifyUser(
                supervisor.userId,
                `You have been assigned to a new project: ${project.projectName}`,
                "PROJECT_ASSIGNED"
            );
        }
    }

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

    // First delete or disconnect related projects relationships if necessary?
    // Prisma usually handles simple disconnects if relations are optional.
    // However, we should check if we need to do anything with projects.
    // The relation in Project is `supervisor Supervisor?` (optional). 
    // So deleting supervisor should just set supervisorId to null in projects if explicitly handled or just fail if foreign key constraint exists.
    // BUT we saw in schema that explicit relations might be missing FK constraints or relying on Prisma defaults.
    // Let's attempt to delete Supervisor.

    // 1. Delete Supervisor
    // We are removing the transaction wrapper because if user.delete fails, 
    // it aborts the transaction in Postgres, preventing the fallback user.update from running.
    // Since we explicitly want to fall back to soft delete if hard delete fails, 
    // we run these as separate operations.
    const deletedSup = await prisma.supervisor.delete({
        where: { supervisorId }
    });

    // 2. Delete associated User if it exists
    if (supervisor.userId) {
        try {
            await prisma.user.delete({
                where: { userId: supervisor.userId }
            });
        } catch (error) {
            console.warn(`Could not delete associated user ${supervisor.userId} for supervisor ${supervisorId}. Falling back to soft delete. Error:`, error);
            try {
                await prisma.user.update({
                    where: { userId: supervisor.userId },
                    data: {
                        status: UserStatus.completed,
                        email: `deleted_${supervisor.userId}_${Date.now()}_${supervisor.email}`,
                        contact: `deleted_${supervisor.userId}_${Date.now()}_${supervisor.phoneNumber}`
                    }
                });
            } catch (updateError) {
                console.error(`Failed to soft delete user ${supervisor.userId}:`, updateError);
                // We don't throw here to allow the supervisor deletion to be reported as success
            }
        }
    }

    return deletedSup;
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
            },
            materials: {
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

/**
 * Change supervisor password
 * @param supervisorId - The supervisor ID
 * @param currentPassword - Current password
 * @param newPassword - New password
 * @returns Success message
 */
export const changeSupervisorPassword = async (
    supervisorId: string,
    currentPassword: string,
    newPassword: string
) => {
    if (!supervisorId) {
        throw new Error("Supervisor ID is required");
    }

    const supervisor = await prisma.supervisor.findUnique({
        where: { supervisorId }
    });

    if (!supervisor) {
        throw new Error("Supervisor not found");
    }

    // Verify current password
    if (!supervisor.password) {
        throw new Error("Supervisor does not have a password set");
    }

    const isMatch = await bcrypt.compare(currentPassword.trim(), supervisor.password);
    if (!isMatch) {
        throw new Error("Current password is incorrect");
    }

    // Update with new password
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    await prisma.supervisor.update({
        where: { supervisorId },
        data: {
            password: hashedPassword,
            updatedAt: new Date()
        }
    });

    // Also update the user table password and increment tokenVersion
    if (supervisor.userId) {
        await prisma.user.update({
            where: { userId: supervisor.userId },
            data: {
                password: hashedPassword,
                updatedAt: new Date(),
                tokenVersion: { increment: 1 }
            }
        });

        // Delete all refresh tokens to log out all sessions
        await prisma.refreshToken.deleteMany({
            where: { userId: supervisor.userId }
        });
    }

    return { success: true, message: "Supervisor password updated successfully" };
};


