import prisma from "../../config/prisma.client";
import * as bcrypt from "bcrypt";
import { UserRole, Prisma, Timezone, Currency, Language, UserStatus } from "@prisma/client";
import * as projectService from "../project/project.services";

// Create a new user
export const createUser = async (data: {
    userName: string;
    role: string;
    email: string;
    password?: string | null;
    contact: string;
    status?: UserStatus;
    estimatedInvestment?: number | null;
    notes?: string | null;
    companyName?: string | null;
    location?: string | null;
    requirements?: string | null;
    description?: string | null;
    timezone?: string | null;
    currency?: string | null;
    language?: string | null;
    address?: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
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
        role: (data.role === "user" ? UserRole.customer : data.role) as UserRole,
        email: data.email,
        password: hashedPassword,
        contact: data.contact,
        status: data.status || UserStatus.pending,
        estimatedInvestment: data.estimatedInvestment || null,
        notes: data.notes || null,
        companyName: data.companyName || null,
        location: data.location || null,
        requirements: data.requirements || null,
        description: data.description || null,

        timezone: (data.timezone === "Eastern Time (ET)" ? Timezone.ET :
            data.timezone === "Central Time (CT)" ? Timezone.CT :
                data.timezone === "Mountain Time (MT)" ? Timezone.MT :
                    data.timezone === "Pacific Time (PT)" ? Timezone.PT :
                        data.timezone === "UTC" ? Timezone.UTC : Timezone.UTC),
        currency: (data.currency === "USD ($)" ? Currency.USD :
            data.currency === "EUR (€)" ? Currency.EUR :
                data.currency === "GBP (£)" ? Currency.GBP : Currency.USD),
        language: (data.language as Language) || Language.English,
        address: data.address || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: data.createdBy || null,
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

    // Validate UUID format to prevent malformed requests (e.g. "getallusers") from crashing Prisma
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
        throw new Error("Invalid User ID format");
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
            status: true,
            estimatedInvestment: true,
            notes: true,
            companyName: true,
            timezone: true,
            currency: true,
            language: true,
            address: true,
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
    const where: any = {};

    if (search) {
        where.OR = [
            { userName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } }
        ];
    }

    const users = await prisma.user.findMany({
        where,
        select: {
            userId: true,
            userName: true,
            email: true,
            role: true,
            contact: true,
            status: true,
            companyName: true,
            estimatedInvestment: true,
            createdAt: true,
            updatedAt: true,
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
    status?: UserStatus;
    estimatedInvestment?: number | null;
    notes?: string | null;
    companyName?: string | null;
    location?: string | null;
    requirements?: string | null;
    description?: string | null;
    timezone?: string | null;
    currency?: string | null;
    language?: string | null;
    address?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    updatedBy?: string;
}) => {
    const user = await prisma.user.findUnique({ where: { userId } })

    if (!user) {
        throw new Error("User not found")
    }

    const dataToUpdate: Prisma.UserUpdateInput = {
        updatedAt: new Date(),
        updatedBy: updatedUserData.updatedBy || null,
    };

    // Only update fields that are provided
    if (updatedUserData.userName !== undefined) dataToUpdate.userName = updatedUserData.userName;
    if (updatedUserData.role !== undefined) dataToUpdate.role = (updatedUserData.role === "user" ? UserRole.customer : updatedUserData.role) as UserRole;
    if (updatedUserData.email !== undefined) dataToUpdate.email = updatedUserData.email;
    if (updatedUserData.contact !== undefined) dataToUpdate.contact = updatedUserData.contact;
    if (updatedUserData.status !== undefined) {
        // Normalise whatever the frontend sends to the exact Prisma UserStatus enum value.
        // The DB enum is: pending | inprogress | completed (all lowercase, no spaces).
        const statusMap: Record<string, UserStatus> = {
            // Lowercase / compact (the DB native values)
            pending: UserStatus.pending,
            inprogress: UserStatus.inprogress,
            completed: UserStatus.completed,
            // Title-case variants (sent by the frontend select)
            Pending: UserStatus.pending,
            'In Progress': UserStatus.inprogress,
            Completed: UserStatus.completed,
            // Any other possible variants
            'in progress': UserStatus.inprogress,
            PENDING: UserStatus.pending,
            INPROGRESS: UserStatus.inprogress,
            COMPLETED: UserStatus.completed,
        };
        const normalisedStatus = statusMap[updatedUserData.status as string];
        if (!normalisedStatus) {
            throw new Error(`Invalid status value: "${updatedUserData.status}". Expected one of: pending, inprogress, completed`);
        }
        
        dataToUpdate.status = normalisedStatus;
    }
    if (updatedUserData.estimatedInvestment !== undefined) dataToUpdate.estimatedInvestment = updatedUserData.estimatedInvestment;
    if (updatedUserData.notes !== undefined) dataToUpdate.notes = updatedUserData.notes;
    if (updatedUserData.companyName !== undefined) dataToUpdate.companyName = updatedUserData.companyName;
    if (updatedUserData.location !== undefined) dataToUpdate.location = updatedUserData.location;
    if (updatedUserData.requirements !== undefined) dataToUpdate.requirements = updatedUserData.requirements;
    if (updatedUserData.description !== undefined) dataToUpdate.description = updatedUserData.description;

    // General Settings
    if (updatedUserData.timezone !== undefined) {
        if (!updatedUserData.timezone || updatedUserData.timezone.trim() === "") {
            dataToUpdate.timezone = null;
        } else {
            let tzValue: any = updatedUserData.timezone;
            // Map Display String to Enum Key if necessary
            const timeZoneMap: Record<string, any> = {
                "Eastern Time (ET)": Timezone.ET,
                "Central Time (CT)": Timezone.CT,
                "Mountain Time (MT)": Timezone.MT,
                "Pacific Time (PT)": Timezone.PT,
                "UTC": Timezone.UTC
            };
            if (timeZoneMap[tzValue]) {
                tzValue = timeZoneMap[tzValue];
            }
            dataToUpdate.timezone = tzValue as Timezone;
        }
    }

    if (updatedUserData.currency !== undefined) {
        if (!updatedUserData.currency || updatedUserData.currency.trim() === "") {
            dataToUpdate.currency = null;
        } else {
            let currValue: any = updatedUserData.currency;
            const currencyMap: Record<string, any> = {
                "USD ($)": Currency.USD,
                "EUR (€)": Currency.EUR,
                "GBP (£)": Currency.GBP,
                "INR (₹)": Currency.INR,
                "USD": Currency.USD // Handle simpler cases too
            };
            if (currencyMap[currValue]) {
                currValue = currencyMap[currValue];
            }
            dataToUpdate.currency = currValue as Currency;
        }
    }

    if (updatedUserData.language !== undefined) {
        if (!updatedUserData.language || updatedUserData.language.trim() === "") {
            dataToUpdate.language = null;
        } else {
            // Enums match strings mostly, but good to cast safely
            dataToUpdate.language = updatedUserData.language as Language;
        }
    }

    if (updatedUserData.address !== undefined) dataToUpdate.address = updatedUserData.address;



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
    const user = await prisma.user.findUnique({ where: { userId } });

    if (!user) {
        throw new Error("User not found");
    }

    // Use a transaction to manually cascade delete related records
    // since Prisma SQL defaults to RESTRICT for required foreign keys
    const deletedUser = await prisma.$transaction(async (tx) => {
        // 1. Get all projects owned by this user
        const projects = await tx.project.findMany({ where: { customerId: userId } });
        const projectIds = projects.map(p => p.projectId);

        if (projectIds.length > 0) {
            // Delete project-related entities
            await tx.dailyUpdate.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.expense.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.material.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.payment.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.document.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.quotation.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.message.deleteMany({ where: { projectId: { in: projectIds } } });

            // Delete the projects
            await tx.project.deleteMany({ where: { customerId: userId } });
        }

        // 2. Delete user-specific related entities
        await tx.notification.deleteMany({ where: { userId } });
        await tx.refreshToken.deleteMany({ where: { userId } });
        await tx.document.deleteMany({ where: { userId } });
        await tx.quotation.deleteMany({ where: { userId } });

        // Delete messages where user is sender or receiver
        await tx.message.deleteMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            }
        });

        // If user is a supervisor, delete supervisor record
        if (user.role === 'supervisor') {
            await tx.supervisor.deleteMany({ where: { userId } });
        }

        // 3. Finally, delete the user
        return tx.user.delete({ where: { userId } });
    });

    return deletedUser;
};

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
    // New Leads: Users with pending status
    const newLeadsCount = await prisma.user.count({
        where: {
            role: UserRole.customer,
            status: UserStatus.pending
        }
    });

    // Closed Customers: Users with inprogress or completed status
    const closedCustomersCount = await prisma.user.count({
        where: {
            role: UserRole.customer,
            status: { in: [UserStatus.inprogress, UserStatus.completed] }
        }
    });

    return {
        newLeads: newLeadsCount,
        closedCustomers: closedCustomersCount,
        total: newLeadsCount + closedCustomersCount
    };
};

// Get New Leads List (Users with pending status)
export const getNewLeadsList = async () => {
    // 1. Get all pending customers
    const activeCustomers = await prisma.user.findMany({
        where: {
            role: UserRole.customer,
            status: UserStatus.pending
        },
        include: {
            // Include their latest project if needed to show project info
            projects: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    // 2. Format the response to structure it similarly to before (flat object with user + project info)
    // Or users might just want the user list. The original returned "projects" with user info.
    // To minimize breakage, let's returning the user info, and if they have a project, include its details.

    // Original return shape: Array of Project & { customer: User }
    // But now checking USER status, a user might not have a project yet.
    // The request implies "leads" are users.

    // Let's return the user + their latest project details flattened, or just the user object with a 'project' field.
    // Based on the user request, he seems to want to see the users in these lists.

    return activeCustomers.map(user => {
        const { password, ...userDetails } = user;
        const latestProject = user.projects[0] || {};

        // Return a structure that resembles the old one for compatibility if the frontend expects project fields at root level?
        // The original response was PROJECT-centric. Currently it's USER-centric.
        // Let's return User details primarily, merging latest project info if available.

        return {
            ...latestProject, // Spread project fields first (default empty if none)
            ...userDetails,   // Spread user fields (overwriting any conflicts, user ID is key)
            customer: userDetails // Keep nested customer object for compatibility with Project-based views
        };
        // Note: Ideally, specific response DTOs should be defined. 
        // With spread `...latestProject`, we get projectId, projectName etc at root.
        // With spread `...userDetails`, we get userId, userName at root.
    });
};

// Get Closed Customers List (Users with inprogress/completed status)
export const getClosedCustomersList = async () => {
    // 1. Get all customers with inprogress or completed status
    const inactiveCustomers = await prisma.user.findMany({
        where: {
            role: UserRole.customer,
            status: { in: [UserStatus.inprogress, UserStatus.completed] }
        },
        include: {
            projects: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        },
        orderBy: {
            updatedAt: 'desc' // Most recently converted first
        }
    });

    // 2. Format to the specific structure requested by the frontend:
    // With spread we make sure all fields like status, estimatedInvestment etc are passed
    return inactiveCustomers.map(user => {
        const { password, ...userDetails } = user;
        const latestProject = user.projects[0];
        
        return {
            ...latestProject,
            ...userDetails,
            projectId: latestProject?.projectId || null,
            projectName: latestProject?.projectName || "No Project Assigned",
            createdAt: latestProject?.createdAt || user.createdAt,
            customer: {
                ...userDetails
            }
        };
    });
};

/**
 * Get dashboard statistics for a customer
 * @param userId - The ID of the customer
 * @returns Object with dashboard metrics
 */
export const getCustomerDashboardStats = async (userId: string) => {
    // Get all projects for this customer
    const projects = await prisma.project.findMany({
        where: { customerId: userId },
        include: {
            payments: true,
            quotations: true,
            dailyUpdates: true
        }
    });

    if (!projects || projects.length === 0) {
        return {
            projectProgress: 0,
            pendingApprovals: 0,
            paidAmount: 0,
            pendingAmount: 0
        };
    }

    let totalBudget = 0;
    let totalPaid = 0;
    let pendingApprovals = 0;

    // For progress, we'll focus on the most recent active project ("Inprogress") 
    // or the most recent one if none are active.
    // Let's sort projects by creation date to find the latest
    const sortedProjects = [...projects].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const latestProject = sortedProjects[0];

    // Calculate Metrics
    for (const project of projects) {
        // Budget
        totalBudget += Number(project.totalBudget);

        // Paid Amount
        const projectPaid = project.payments
            .filter(p => p.paymentStatus === 'completed')
            .reduce((sum, p) => sum + Number(p.amount), 0);
        totalPaid += projectPaid;

        // Pending Approvals (Quotations linked to project)
        const pendingQuotes = project.quotations.filter(q => q.status === 'pending').length;
        pendingApprovals += pendingQuotes;

        // Pending Approvals (Daily Updates linked to project)
        // Wait, daily updates are usually approved by the customer?
        // Yes, schema has "approveDailyUpdate" by customer.
        // So status 'pending' means waiting for customer approval.
        const pendingUpdates = project.dailyUpdates.filter(du =>
            (du.status === 'pending' || du.status === 'Approval_Requested') &&
            du.updateType === 'Customer'
        ).length;
        pendingApprovals += pendingUpdates;
    }

    // Pending Amount (Balance)
    const pendingAmount = Math.max(0, totalBudget - totalPaid);

    // Project Progress (Latest Project)
    let projectProgress = 0;
    if (latestProject) {
        const approvedUpdates = latestProject.dailyUpdates.filter(du => du.status === 'approved');
        const uniqueStages = new Set(approvedUpdates.map(du => du.constructionStage));
        // Total stages = 6 (from Enum)
        const totalStages = 6;
        projectProgress = Math.min(100, Math.round((uniqueStages.size / totalStages) * 100));
    }

    return {
        projectProgress,     // Percentage (0-100)
        pendingApprovals,    // Count
        paidAmount: totalPaid, // Currency value
        pendingAmount        // Currency value
    };
};

/**
 * Get dashboard statistics for admin
 * @returns Object with dashboard metrics
 */
export const getAdminDashboardStats = async () => {
    // 1. Total Projects
    const totalProjects = await prisma.project.count();

    // 2. Active Supervisors (Assuming 'Active' status or purely existence)
    // The schema has SupervisorStatus enum with 'Active', 'Inactive', 'reject'.
    const activeSupervisors = await prisma.supervisor.count({
        where: {
            status: 'Active'
        }
    });

    // 3. Pending Approvals
    // This typically includes:
    // - Pending Quotations (Admin might review them before customer? Or just global count)
    // - Pending Daily Updates (Usually supervisor->admin->customer or supervisor->customer)
    // - Pending Supervisor Approvals ? (If that flow exists)
    // Let's count pending Quotations and pending Daily Updates for now as a global metric.

    // Pending Quotations
    const pendingQuotations = await prisma.quotation.count({
        where: { status: 'pending' }
    });

    // Pending Daily Updates
    const pendingApps = await prisma.dailyUpdate.count({
        where: { status: 'pending' }
    });

    // Total Pending
    const totalPendingApprovals = pendingQuotations + pendingApps;

    return {
        totalProjects,
        activeSupervisors,
        pendingApprovals: totalPendingApprovals
    };
};

export const getUsersBySupervisor = async (supervisorId: string) => {
    const projects = await prisma.project.findMany({
        where: { supervisorId },
        select: { customerId: true },
        distinct: ['customerId']
    });

    const customerIds = projects.map(p => p.customerId);

    const users = await prisma.user.findMany({
        where: { userId: { in: customerIds } },
        select: {
            userId: true,
            userName: true,
            email: true,
            contact: true,
            status: true,
            companyName: true,
            role: true
        }
    });

    return users;
};

export const getAllSupervisors = async () => {
    const supervisors = await prisma.supervisor.findMany();

    const result = await Promise.all(supervisors.map(async (s) => {
        const user = await prisma.user.findUnique({
            where: { userId: s.userId },
            select: {
                userId: true,
                userName: true,
                email: true,
                status: true,
                role: true
            }
        });
        return {
            ...s,
            userName: user?.userName,
            userEmail: user?.email,
            userStatus: user?.status
        };
    }));

    return result;
};

export const getUsersWithoutSupervisor = async () => {
    const projects = await prisma.project.findMany({
        where: {
            supervisorId: null,
            initialStatus: { in: ['Inprogress'] }
        },
        select: { customerId: true },
        distinct: ['customerId']
    });

    const customerIds = projects.map(p => p.customerId);

    const users = await prisma.user.findMany({
        where: { userId: { in: customerIds } },
        select: {
            userId: true,
            userName: true,
            email: true,
            contact: true,
            status: true,
            companyName: true
        }
    });

    return users;
};

export const assignSupervisor = async (userId: string, supervisorId: string) => {
    const supervisor = await prisma.supervisor.findUnique({ where: { supervisorId } });
    if (!supervisor) {
        throw new Error("Supervisor not found");
    }

    const updateResult = await prisma.project.updateMany({
        where: {
            customerId: userId,
            initialStatus: { in: ['Inprogress'] }
        },
        data: {
            supervisorId: supervisorId
        }
    });

    return { count: updateResult.count, message: "Supervisor assigned to active projects" };
};

export const removeSupervisor = async (userId: string) => {
    const updateResult = await prisma.project.updateMany({
        where: {
            customerId: userId,
            initialStatus: { in: ['Inprogress'] }
        },
        data: {
            supervisorId: null
        }
    });

    return { count: updateResult.count, message: "Supervisor removed from active projects" };
};

export const approveSupervisor = async (userId: string) => {
    return { message: "Supervisor assignment approved" };
};

export const rejectSupervisor = async (userId: string) => {
    return { message: "Supervisor assignment rejected" };
};

/**
 * Change customer password
 * @param userId - The customer user ID
 * @param currentPassword - Current password
 * @param newPassword - New password
 * @returns Success message
 */
export const changeCustomerPassword = async (
    userId: string,
    currentPassword: string,
    newPassword: string
) => {
    const user = await prisma.user.findUnique({ where: { userId } });

    if (!user) {
        throw new Error("Customer not found");
    }

    // Verify user is a customer
    if (user.role !== UserRole.customer) {
        throw new Error("This endpoint is only for customer users");
    }

    // Verify current password
    if (!user.password) {
        throw new Error("Customer does not have a password set");
    }

    const isMatch = await bcrypt.compare(currentPassword.trim(), user.password);
    if (!isMatch) {
        throw new Error("Current password is incorrect");
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

    return { success: true, message: "Customer password updated successfully" };
};
export const regeneratePassword = async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { userId } });

    if (!user) {
        throw new Error("User not found");
    }

    // Generate a secure random password (10 characters)
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let newPassword = "";
    for (let i = 0; i < 10; i++) {
        newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user record
    await prisma.user.update({
        where: { userId },
        data: {
            password: hashedPassword,
            updatedAt: new Date()
        }
    });

    return { success: true, newPassword };
};
