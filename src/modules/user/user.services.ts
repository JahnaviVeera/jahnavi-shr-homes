import prisma from "../../config/prisma.client";
import * as bcrypt from "bcrypt";
import { UserRole, Prisma } from "@prisma/client";
import * as projectService from "../project/project.services";

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
    createdAt: Date;
    updatedAt: Date;
}) => {
    const existingUser = await prisma.user.findFirst({
        where: { email: data.email }
    });

    if (existingUser) {
        throw new Error("User already exists with this email");
    }

    // Hash password if provided
    let hashedPassword = null;
    if (data.password && data.password.trim() !== "") {
        hashedPassword = await bcrypt.hash(data.password.trim(), 10);
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

    const newUser = await prisma.user.create({
        data: userData
    });

    return newUser;
};

export const getUserById = async (userId: string) => {

    if (!userId) {
        throw new Error("User ID required");
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
        }
    });

    if (!user) {
        throw new Error("User not found");
    }

    // Manual fetch of projects (Decoupled)
    const projects = await projectService.getProjectsByCustomerId(userId);

    return { ...user, projects };
}

export const getAllUsers = async () => {
    const users = await prisma.user.findMany({
        select: {
            userId: true,
            userName: true,
            email: true,
            role: true,
            contact: true,
            companyName: true,
        }
    });

    if (!users || users.length === 0) {
        return [];
    }


    // Fetch projects for all these users
    // If we iterate, N+1 problem.
    // ProjectService doesn't have "getProjectsForCustomerIds".
    // I can stick to fetching all projects via service?? No, that exposes too much.
    // Ideally I'd ask ProjectService for a map.
    // Let's use `projectService.getAllProjectsWithCustomer()`? No.
    // I will iterate for now or query directly if I MUST.
    // But the goal is decoupling.
    // Let's add `getProjectsByCustomerIds` to project.service.

    // For now, I will use a simple iteration (Parallel Promise.all) because N is likely small (users page).
    // Or better, I will implement `getProjectsByCustomerIds` in project.services.ts later.
    // Actually, I can use `getProjectsByCustomerId` in a loop.

    const usersWithProjects = await Promise.all(users.map(async (user) => {
        const projects = await projectService.getProjectsByCustomerId(user.userId);
        return { ...user, projects };
    }));

    return usersWithProjects;
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
    // New Leads: Unique customers with at least one Inprogress or Planning project
    const newLeadsCount = await prisma.project.findMany({
        where: { initialStatus: { in: ['Inprogress', 'Planning'] } },
        distinct: ['customerId'],
        select: { customerId: true }
    }).then(res => res.length);

    // Closed Customers: Unique customers with at least one complete or Completed project
    const closedCustomersCount = await prisma.project.findMany({
        where: { initialStatus: { in: ['complete', 'Completed'] } },
        distinct: ['customerId'],
        select: { customerId: true }
    }).then(res => res.length);

    return {
        newLeads: newLeadsCount,
        closedCustomers: closedCustomersCount,
        total: newLeadsCount + closedCustomersCount
    };
};

// Get New Leads List (Users with Inprogress or Planning projects)
export const getNewLeadsList = async () => {
    const projects = await prisma.project.findMany({
        where: {
            initialStatus: { in: ['Inprogress', 'Planning'] }
        },
        include: {
            customer: true
        },
        orderBy: {
            startDate: 'desc'
        }
    });

    // Remove password from customer details
    return projects.map(project => {
        const { customer, ...projectDetails } = project;
        const { password, ...userDetails } = customer;
        return {
            ...projectDetails,
            customer: userDetails
        };
    });
};

// Get Closed Customers List (Users with complete/Completed projects)
export const getClosedCustomersList = async () => {
    const projects = await prisma.project.findMany({
        where: {
            initialStatus: { in: ['complete', 'Completed'] }
        },
        include: {
            customer: true
        },
        orderBy: {
            startDate: 'desc'
        }
    });

    // Remove password from customer details
    return projects.map(project => {
        const { customer, ...projectDetails } = project;
        const { password, ...userDetails } = customer;
        return {
            ...projectDetails,
            customer: userDetails
        };
    });
};
