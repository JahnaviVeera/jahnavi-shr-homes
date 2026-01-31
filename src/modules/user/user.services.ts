import prisma from "../../config/prisma.client";
import * as bcrypt from "bcrypt";
import { UserRole, SupervisorStatus, Prisma } from "@prisma/client";

// Create a new user
export const createUser = async (data: {
    userName: string;
    role: string;
    email: string;
    password?: string | null;
    contact: string;
    estimatedInvestment?: number | null;
    notes?: string | null;
    companyName?: string | null;


    timezone?: string | null;
    currency?: string | null;
    language?: string | null;
    projectIds?: string[];
    createdAt: Date;
    updatedAt: Date;
}) => {
    const existingUser = await prisma.user.findFirst({
        where: { email: data.email } // or data.userName, adjust as needed
    });

    if (existingUser) {
        throw new Error("User already exists with this email");
    }

    // Hash password if provided
    let hashedPassword = null;
    if (data.password && data.password.trim() !== "") {
        hashedPassword = await bcrypt.hash(data.password.trim(), 10);
    }

    // Check if any of the projects are already assigned to another user
    if (data.projectIds && data.projectIds.length > 0) {
        // Since customerId is required on Project, any existing project is assigned.
        // We check if any of these projects simply exist.
        const assignedProjects = await prisma.project.findMany({
            where: {
                projectId: { in: data.projectIds }
            },
            select: { projectName: true }
        });

        if (assignedProjects.length > 0) {
            throw new Error(`Project(s) already exist and are assigned to another user: ${assignedProjects.map(p => p.projectName).join(", ")}`);
        }
    }

    const userData: Prisma.UserCreateInput = {
        userName: data.userName,
        role: data.role as UserRole,
        email: data.email,
        password: hashedPassword,
        contact: data.contact,
        estimatedInvestment: data.estimatedInvestment || null,
        notes: data.notes || null,
        companyName: data.companyName || null,

        timezone: data.timezone || "UTC",
        currency: data.currency || "USD",
        language: data.language || "English",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    if (data.projectIds && data.projectIds.length > 0) {
        userData.projects = {
            connect: data.projectIds.map(projectId => ({ projectId }))
        };
    }

    const newUser = await prisma.user.create({
        data: userData
    });

    // Return user with password included
    return newUser;
};

export const getUserById = async (userId: string) => {

    if (!userId) {
        throw new Error("User not exists");
    }

    const user = await prisma.user.findUnique({
        where: { userId },
        select: {
            userId: true,
            userName: true,
            email: true,
            password: true,
            role: true,
            contact: true,
            estimatedInvestment: true,
            notes: true,
            companyName: true,
            timezone: true,
            currency: true,
            language: true,
            createdAt: true,
            updatedAt: true,
            projects: {
                select: {
                    projectId: true,
                    projectName: true
                }
            }
        }
    });

    if (!user) {
        throw new Error("User not found");
    }

    return user;
}

export const getAllUsers = async (search?: string) => {
    const whereClause: Prisma.UserWhereInput = {};

    if (search) {
        whereClause.OR = [
            { userName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { contact: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } }
        ];
    }

    const users = await prisma.user.findMany({
        where: whereClause,
        select: {
            userId: true,
            userName: true,
            email: true,
            role: true,
            contact: true,
            companyName: true,
            projects: {
                select: {
                    projectId: true,
                    projectName: true
                }
            }
        }
    });
    if (!users) {
        return []
    }
    return users
}

export const updateUser = async (userId: string, updatedUserData: {
    userName?: string;
    role?: string;
    email?: string;
    password?: string | null;
    contact?: string;
    estimatedInvestment?: number | null;
    notes?: string | null;
    companyName?: string | null;


    timezone?: string | null;
    currency?: string | null;
    language?: string | null;
    projectIds?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}) => {
    const user = await prisma.user.findUnique({ where: { userId } })

    if (!user) {
        throw new Error("User not found")
    }

    const dataToUpdate: Prisma.UserUpdateInput = {
        updatedAt: new Date(),
    };

    // Only update fields that are provided
    if (updatedUserData.userName !== undefined) dataToUpdate.userName = updatedUserData.userName;
    if (updatedUserData.role !== undefined) dataToUpdate.role = updatedUserData.role as UserRole;
    if (updatedUserData.email !== undefined) dataToUpdate.email = updatedUserData.email;
    if (updatedUserData.contact !== undefined) dataToUpdate.contact = updatedUserData.contact;
    if (updatedUserData.estimatedInvestment !== undefined) dataToUpdate.estimatedInvestment = updatedUserData.estimatedInvestment;
    if (updatedUserData.notes !== undefined) dataToUpdate.notes = updatedUserData.notes;
    if (updatedUserData.companyName !== undefined) dataToUpdate.companyName = updatedUserData.companyName;


    // General Settings
    if (updatedUserData.timezone !== undefined) dataToUpdate.timezone = updatedUserData.timezone;
    if (updatedUserData.currency !== undefined) dataToUpdate.currency = updatedUserData.currency;
    if (updatedUserData.language !== undefined) dataToUpdate.language = updatedUserData.language;

    // Project Associations
    if (updatedUserData.projectIds !== undefined) {
        dataToUpdate.projects = {
            set: updatedUserData.projectIds.map(projectId => ({ projectId }))
        };
    }

    // Handle password update (hash if provided)
    if (updatedUserData.password !== undefined) {
        if (updatedUserData.password === null || updatedUserData.password.trim() === "") {
            dataToUpdate.password = null;
        } else {
            dataToUpdate.password = await bcrypt.hash(updatedUserData.password, 10);
        }
    }

    const updatedUser = await prisma.user.update({
        where: { userId },
        data: dataToUpdate,
    });

    // Return user with password included
    return updatedUser;
}

export const deleteUser = async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { userId } })

    if (!user) {
        throw new Error("User not found")
    }

    const deletedUser = await prisma.user.delete({ where: { userId } });
    return deletedUser;
}

/**
 * Approve supervisor for a user
 * Updates the supervisor's approve field to "approve"
 * @param userId - The user ID
 */


// Change password
export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await prisma.user.findUnique({ where: { userId } });

    if (!user) {
        throw new Error("User not found");
    }

    // Verify current password
    if (!user.password && currentPassword) {
        throw new Error("User does not have a password set");
    }

    if (user.password) {
        const isMatch = await bcrypt.compare(currentPassword.trim(), user.password);
        if (!isMatch) {
            throw new Error("Current password is incorrect");
        }
    }

    // Update with new password
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    await prisma.user.update({
        where: { userId },
        data: {
            password: hashedPassword,
            updatedAt: new Date()
        }
    });

    return { success: true, message: "Password updated successfully" };
};

// Get Customer Leads Stats
export const getCustomerLeadsStats = async () => {
    // New Leads: Users with at least one Inprogress project
    const newLeadsCount = await prisma.user.count({
        where: {
            projects: {
                some: {
                    initialStatus: 'Inprogress'
                }
            }
        }
    });

    // Closed Customers: Users with at least one complete or Completed project
    const closedCustomersCount = await prisma.user.count({
        where: {
            projects: {
                some: {
                    initialStatus: { in: ['complete', 'Completed'] }
                }
            }
        }
    });

    return {
        newLeads: newLeadsCount,
        closedCustomers: closedCustomersCount,
        total: newLeadsCount + closedCustomersCount
    };
};

// Get New Leads List (Users with Inprogress projects)
export const getNewLeadsList = async () => {
    const projects = await prisma.project.findMany({
        where: {
            initialStatus: 'Inprogress'
        },
        include: {
            customer: {
                select: {
                    userId: true,
                    userName: true,
                    contact: true
                }
            }
        },
        orderBy: {
            startDate: 'desc'
        }
    });

    // Flatten the results to match the required table format
    const flatLeads: any[] = [];
    projects.forEach(project => {
        if (project.customer) {
            flatLeads.push({
                userId: project.customer.userId,
                projectId: project.projectId,
                customerName: project.customer.userName,
                projectName: project.projectName,
                mobileNumber: project.customer.contact,
                projectValue: project.totalBudget,
                date: project.startDate
            });
        }
    });

    return flatLeads;
};

// Get Closed Customers List (Users with complete/Completed projects)
export const getClosedCustomersList = async () => {
    const projects = await prisma.project.findMany({
        where: {
            initialStatus: { in: ['complete', 'Completed'] }
        },
        include: {
            customer: {
                select: {
                    userId: true,
                    userName: true,
                    contact: true
                }
            }
        },
        orderBy: {
            startDate: 'desc'
        }
    });

    // Flatten the results to match the required table format
    const flatCustomers: any[] = [];
    projects.forEach(project => {
        if (project.customer) {
            flatCustomers.push({
                userId: project.customer.userId,
                projectId: project.projectId,
                customerName: project.customer.userName,
                projectName: project.projectName,
                mobileNumber: project.customer.contact,
                projectValue: project.totalBudget,
                date: project.startDate
            });
        }
    });

    return flatCustomers;
};

