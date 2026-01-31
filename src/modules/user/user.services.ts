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
    projectIds?: string[];
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

    // Check if any of the projects are already assigned to another user
    if (data.projectIds && data.projectIds.length > 0) {
        // Use ProjectService to validate, although checking "reassignment" logic might be complex.
        // For now, we mainly want to ensure these projects EXIST.
        // projectService.getProjectById throws if not found.

        // We can loop, or ideally use a new method like getProjectsByIds
        // For now, let's keep it simple and just rely on the updateMany below throwing/failing if foreign keys are weird?
        // No, updateMany won't check existence if filter doesn't match.
        // Let's manually iterate to validate (Decoupled check)
        for (const pid of data.projectIds) {
            await projectService.getProjectById(pid);
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

    const newUser = await prisma.user.create({
        data: userData
    });

    // Manually connect projects if provided
    if (data.projectIds && data.projectIds.length > 0) {
        // We are updating Project table. In a pure microservice world, we'd call projectService.assignCustomer(pid, uid).
        // Since we are decoupling DB access but not strictly separating services into processes yet, 
        // calling projectService.assignCustomerToProjects would be best.
        // But such method doesn't exist yet.
        // I will stick to prisma.project access HERE but via the SERVICE if possible?
        // No, if I remove prisma.project access, I MUST delegate this to ProjectService.
        // Let's assume for this specific transaction (user creation assigning projects), we SHOULD add a helper in ProjectService.

        // HOWEVER, to keep this refactor scoped, I will leave the direct update here OR add "assignProjectsToCustomer" to project.services.ts
        // The instructions said "Refactor user.services.ts to use ProjectService instead of direct Prisma calls".
        // So I should create that helper.
        await projectService.assignProjectsToCustomer(newUser.userId, data.projectIds);
    }

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

    // Project Associations: Manual update via Service
    if (updatedUserData.projectIds !== undefined) {
        if (updatedUserData.projectIds.length > 0) {
            await projectService.assignProjectsToCustomer(userId, updatedUserData.projectIds);
        }
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
