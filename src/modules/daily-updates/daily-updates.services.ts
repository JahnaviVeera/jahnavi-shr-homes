import prisma from "../../config/prisma.client";
import { fileUploadService } from "../../services/fileUpload.service";
import { ConstructionStage, DailyUpdateStatus, Prisma, UpdateType } from "@prisma/client";
import { notifyAdmins, notifyUser } from "../notifications/notifications.services";
import SocketService from "../../services/socket.service";
import * as projectService from "../project/project.services";
import * as supervisorService from "../supervisor/supervisor.services";

/**
 * Create a new daily update
 * @param data - The daily update data including stage, description, projectId, and raw materials
 * @param image - Optional image file to upload
 * @param video - Optional video file to upload
 * @returns The created daily update record
 */
export const createDailyUpdate = async (
    data: {
        constructionStage: string;
        description?: string | null;
        projectId?: string | null;
        rawMaterials?: Array<{
            materialName: string;
            quantity: number;
            notes?: string;
        }> | null;
        status?: string;
    },
    image?: any,
    video?: any,
    supervisorId?: string
) => {
    // Validate construction stage
    const validStages = ["Foundation", "Framing", "Plumbing & Electrical", "Interior Walls", "Painting", "Finishing"];
    if (!validStages.includes(data.constructionStage)) {
        throw new Error(`Invalid construction stage. Must be one of: ${validStages.join(", ")}`);
    }

    // Validate status if provided
    if (data.status !== undefined) {
        const validStatuses = ["pending", "approved", "rejected"];
        if (!validStatuses.includes(data.status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        }
    }

    // Validate required fields
    if (!data.constructionStage) {
        throw new Error("Construction stage is required");
    }

    // Validate rawMaterials structure if provided
    if (data.rawMaterials && Array.isArray(data.rawMaterials)) {
        for (const material of data.rawMaterials) {
            if (!material.materialName || material.materialName.trim() === "") {
                throw new Error("Material name is required for each raw material");
            }
            if (material.quantity === undefined || material.quantity < 0) {
                throw new Error("Quantity must be a non-negative number for each raw material");
            }
        }
    }

    // Validate projectId if provided
    let validProjectId: string | null = null;
    let projectName = "";
    if (data.projectId && data.projectId.trim() !== "") {
        // Check if project exists (Decoupled)
        const project = await projectService.getProjectById(data.projectId);

        // RESTRICTION: Check if project is assigned to this supervisor
        if (supervisorId) {
            if (project.supervisorId !== supervisorId) {
                throw new Error("Unauthorized: You are not assigned to this project and cannot post updates for it.");
            }
        }

        validProjectId = data.projectId;
        projectName = project.projectName;
    }

    // Upload image to Supabase if provided
    let imageUrl: string | null = null;
    if (image) {
        try {
            const uploadResult = await fileUploadService.uploadFile({
                file: image,
                bucket: 'uploads',
                folder: 'daily-updates/images'
            });
            imageUrl = uploadResult.publicUrl;
        } catch (error) {
            console.error("Error uploading image to Supabase:", error);
            throw new Error("Failed to upload image to storage");
        }
    }

    // Upload video to Supabase if provided
    let videoUrl: string | null = null;
    if (video) {
        try {
            const uploadResult = await fileUploadService.uploadFile({
                file: video,
                bucket: 'uploads',
                folder: 'daily-updates/videos'
            });
            videoUrl = uploadResult.publicUrl;
        } catch (error) {
            console.error("Error uploading video to Supabase:", error);
            throw new Error("Failed to upload video to storage");
        }
    }

    // Maps string to enum
    const stageEnum = data.constructionStage === "Plumbing & Electrical" ? ConstructionStage.Plumbing___Electrical :
        data.constructionStage === "Interior Walls" ? ConstructionStage.Interior_Walls :
            data.constructionStage as ConstructionStage;

    const statusEnum = data.status as DailyUpdateStatus || DailyUpdateStatus.pending;


    const newDailyUpdate = await prisma.dailyUpdate.create({
        data: {
            constructionStage: stageEnum,
            description: data.description || null,
            projectId: validProjectId,
            rawMaterials: data.rawMaterials ? JSON.stringify(data.rawMaterials) : "[]", // Store as JSON string if your DB expects it or rely on Prisma Json type
            status: statusEnum,
            imageUrl: imageUrl,
            imageName: image ? image.originalname : null,
            imageType: image ? image.mimetype : null,
            videoUrl: videoUrl,
        }
    });

    // Notify Admins
    if (projectName) {
        SocketService.getInstance().emitToRole("admin", "daily_update_created", {
            message: `New daily update submitted for ${projectName}`,
            dailyUpdateId: newDailyUpdate.dailyUpdateId
        });
        await notifyAdmins(`New daily update submitted for ${projectName}`, "daily_update");
    } else {
        SocketService.getInstance().emitToRole("admin", "daily_update_created", {
            message: `New daily update submitted`,
            dailyUpdateId: newDailyUpdate.dailyUpdateId
        });
        await notifyAdmins(`New daily update submitted`, "daily_update");
    }

    // Notify Customer
    if (validProjectId) {
        const project = await prisma.project.findUnique({
            where: { projectId: validProjectId },
            include: { customer: true }
        });

        if (project && project.customer) {
            const customerMsg = `New daily update received for project ${project.projectName}`;
            SocketService.getInstance().emitToUser(project.customer.userId, "notification", {
                type: "DAILY_UPDATE_RECEIVED",
                message: customerMsg,
                dailyUpdateId: newDailyUpdate.dailyUpdateId
            });
            await notifyUser(project.customer.userId, customerMsg, "daily_update_received");
        }
    }

    return newDailyUpdate;

};

/**
 * Create a new admin daily update
 * @param data - The admin daily update data including projectId, quantityConsumption, and labourWorkers
 * @param image - Optional image file to upload
 * @returns The created admin daily update record
 */
export const createAdminDailyUpdate = async (
    data: {
        projectId?: string | null;
        quantityConsumption?: Array<any> | null;
        labourWorkers?: Array<any> | null;
    },
    image?: any,
    supervisorId?: string
) => {
    // Validate required fields
    if (!data.projectId || data.projectId.trim() === "") {
        throw new Error("Project ID is required for Admin update");
    }

    // Check if project exists and supervisor is assigned
    let validProjectId: string = data.projectId;
    let projectName = "";

    const project = await projectService.getProjectById(data.projectId);

    if (supervisorId) {
        if (project.supervisorId !== supervisorId) {
            throw new Error("Unauthorized: You are not assigned to this project and cannot post updates for it.");
        }
    }
    projectName = project.projectName;

    // Validate quantityConsumption structure if provided
    if (data.quantityConsumption && Array.isArray(data.quantityConsumption)) {
        for (const consumption of data.quantityConsumption) {
            if (!consumption.materialName || consumption.materialName.trim() === "") {
                throw new Error("Material name is required for each consumption entry");
            }
            if (!consumption.totalQuantity || consumption.totalQuantity.trim() === "") {
                throw new Error("Total quantity is required for each consumption entry");
            }
            if (!consumption.consumed || consumption.consumed.trim() === "") {
                throw new Error("Consumed quantity is required for each consumption entry");
            }
            if (!consumption.date || consumption.date.trim() === "") {
                throw new Error("Date is required for each consumption entry");
            }
        }
    }

    // Validate labourWorkers structure if provided
    if (data.labourWorkers && Array.isArray(data.labourWorkers)) {
        for (const worker of data.labourWorkers) {
            if (worker.noOfLabours === undefined || worker.noOfLabours === null) {
                throw new Error("No. of Labours is required for each worker entry");
            }
        }
    }

    // Upload image to Supabase if provided
    let imageUrl: string | null = null;
    let imageId: string | null = null;
    if (image) {
        if (!image.mimetype.startsWith('image/')) {
            throw new Error(`Invalid file type: ${image.mimetype}. Only image files are allowed.`);
        }
        try {
            const uploadResult = await fileUploadService.uploadFile({
                file: image,
                bucket: 'uploads',
                folder: 'daily-updates/admin/images'
            });
            imageUrl = uploadResult.publicUrl;
            imageId = uploadResult.id;
        } catch (error) {
            console.error("Error uploading image to Supabase:", error);
            throw new Error("Failed to upload image to storage: " + (error instanceof Error ? error.message : String(error)));
        }
    }

    const newDailyUpdate = await prisma.dailyUpdate.create({
        data: {
            projectId: validProjectId,
            updateType: UpdateType.Admin,
            quantityConsumption: data.quantityConsumption ? JSON.stringify(data.quantityConsumption) : "[]",
            labourWorkers: data.labourWorkers ? JSON.stringify(data.labourWorkers) : "[]",
            imageUrl: imageUrl,
            imageId: imageId,
            imageName: image ? image.originalname : null,
            imageType: image ? image.mimetype : null,
            // Fallback for ConstructionStage because it has a default in Schema
            constructionStage: ConstructionStage.Foundation,
            status: DailyUpdateStatus.pending
        }
    });

    // Notify Admins
    SocketService.getInstance().emitToRole("admin", "admin_daily_update_created", {
        message: `New Admin daily update submitted for ${projectName}`,
        dailyUpdateId: newDailyUpdate.dailyUpdateId
    });

    try {
        await notifyAdmins(`New Admin daily update submitted for ${projectName}`, "admin_daily_update");
    } catch (e) {
        console.error("Failed to notify admins of admin daily update", e);
    }

    return newDailyUpdate;
};

/**
 * Get a daily update by its ID
 * @param dailyUpdateId - The UUID of the daily update
 * @returns The daily update record
 */
export const getDailyUpdateById = async (dailyUpdateId: string) => {
    if (!dailyUpdateId) {
        throw new Error("Daily update ID is required");
    }

    const dailyUpdate = await prisma.dailyUpdate.findUnique({
        where: { dailyUpdateId },
        include: {
            project: {
                select: {
                    projectName: true,
                    location: true
                }
            }
        }
    });

    if (!dailyUpdate) {
        throw new Error("Daily update not found");
    }

    // Parse rawMaterials
    let parsedRawMaterials = dailyUpdate.rawMaterials;
    for (let i = 0; i < 3; i++) {
        if (typeof parsedRawMaterials === 'string') {
            try {
                parsedRawMaterials = JSON.parse(parsedRawMaterials);
            } catch (e) {
                break;
            }
        } else {
            break;
        }
    }

    if (!parsedRawMaterials || !Array.isArray(parsedRawMaterials)) {
        parsedRawMaterials = [];
    }

    return {
        ...dailyUpdate,
        rawMaterials: parsedRawMaterials
    };
};

/**
 * Get all daily updates ordered by creation date (descending)
 * @param supervisorId - Optional supervisor ID to filter by
 * @param customerId - Optional customer ID to filter by
 * @returns List of all daily updates
 */
export const getAllDailyUpdates = async (supervisorId?: string, customerId?: string) => {
    const where: Prisma.DailyUpdateWhereInput = {};

    if (supervisorId) {
        where.project = {
            supervisorId: supervisorId
        };
    } else if (customerId) {
        where.project = {
            customerId: customerId
        };
    }

    const dailyUpdates = await prisma.dailyUpdate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { project: true }
    });

    if (!dailyUpdates) {
        return [];
    }
    return dailyUpdates;
};

/**
 * Get all admin daily updates (UpdateType.Admin)
 * Supports optional filtering by projectId and/or supervisorId
 * @param projectId  - Optional: filter by a specific project
 * @param supervisorId - Optional: filter to only projects assigned to this supervisor
 * @returns List of all matching admin daily updates
 */
export const getAllAdminDailyUpdates = async (
    projectId?: string,
    supervisorId?: string
) => {
    // Build the where clause dynamically
    const where: Prisma.DailyUpdateWhereInput = {
        updateType: UpdateType.Admin,
    };

    if (projectId && projectId.trim() !== "") {
        // Filter by a specific project
        where.projectId = projectId;
    } else if (supervisorId && supervisorId.trim() !== "") {
        // Filter to projects assigned to this supervisor only
        where.project = {
            supervisorId: supervisorId
        };
    }

    const dailyUpdates = await prisma.dailyUpdate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            project: {
                select: {
                    projectId: true,
                    projectName: true,
                    location: true,
                    supervisorId: true
                }
            }
        }
    });

    return dailyUpdates.map(update => {
        let parsedQuantityConsumption = update.quantityConsumption;
        let parsedLabourWorkers = update.labourWorkers;

        if (typeof parsedQuantityConsumption === 'string') {
            try { parsedQuantityConsumption = JSON.parse(parsedQuantityConsumption); } catch (e) { parsedQuantityConsumption = []; }
        }
        if (typeof parsedLabourWorkers === 'string') {
            try { parsedLabourWorkers = JSON.parse(parsedLabourWorkers); } catch (e) { parsedLabourWorkers = []; }
        }

        return {
            ...update,
            quantityConsumption: parsedQuantityConsumption,
            labourWorkers: parsedLabourWorkers
        };
    });
};

/**
 * Get daily updates for projects assigned to a specific supervisor
 * @param supervisorId - The ID of the supervisor
 * @returns List of daily updates for assigned projects
 */
export const getDailyUpdatesForSupervisor = async (supervisorId: string) => {
    // 1. Get the projects assigned to this supervisor (Decoupled)
    const assignedProjects = await projectService.getProjectsBySupervisorId(supervisorId);

    if (assignedProjects.length === 0) {
        return [];
    }

    const projectIds = assignedProjects.map(p => p.projectId);

    // Fetch Daily Updates for these projects
    const dailyUpdates = await prisma.dailyUpdate.findMany({
        where: {
            projectId: { in: projectIds }
        },
        select: {
            projectId: true,
            constructionStage: true,
            status: true,
            updatedAt: true,
            createdAt: true
        }
    });

    // 2. Calculate progress for each project
    const projectsWithProgress = assignedProjects.map(project => {
        // Filter updates for this project that are APPROVED
        const projectUpdates = dailyUpdates.filter(u => u.projectId === project.projectId && u.status === DailyUpdateStatus.approved);

        // Count unique approved stages
        const uniqueStages = new Set(projectUpdates.map(u => u.constructionStage));
        const totalStages = 6; // Total number of construction stages defined in enum

        // Calculate percentage (capped at 100)
        const progress = Math.min(Math.round((uniqueStages.size / totalStages) * 100), 100);

        return {
            ...project,
            progress
        };
    });

    return projectsWithProgress;
};


/**
 * Update a daily update
 * @param dailyUpdateId - ID of the update to modify
 * @param updateData - Data fields to update
 * @param image - Optional new image file
 * @param video - Optional new video file
 * @returns The updated daily update record
 */
export const updateDailyUpdate = async (
    dailyUpdateId: string,
    updateData: {
        constructionStage?: string;
        description?: string | null;
        projectId?: string | null;
        rawMaterials?: Array<{
            materialName: string;
            quantity: number;
            notes?: string;
        }> | null;
        status?: string;
    },
    image?: any,
    video?: any
) => {
    const dailyUpdate = await prisma.dailyUpdate.findUnique({
        where: { dailyUpdateId },
    });

    if (!dailyUpdate) {
        throw new Error("Daily update not found");
    }

    const dataToUpdate: Prisma.DailyUpdateUpdateInput = {
        updatedAt: new Date(),
    };

    // Validate and update construction stage if provided
    if (updateData.constructionStage !== undefined) {
        const validStages = ["Foundation", "Framing", "Plumbing & Electrical", "Interior Walls", "Painting", "Finishing"];
        if (!validStages.includes(updateData.constructionStage)) {
            throw new Error(`Invalid construction stage. Must be one of: ${validStages.join(", ")}`);
        }

        const stageEnum = updateData.constructionStage === "Plumbing & Electrical" ? ConstructionStage.Plumbing___Electrical :
            updateData.constructionStage === "Interior Walls" ? ConstructionStage.Interior_Walls :
                updateData.constructionStage as ConstructionStage;

        dataToUpdate.constructionStage = stageEnum;
    }

    // Validate and update status if provided
    if (updateData.status !== undefined) {
        const validStatuses = ["pending", "approved", "rejected"];
        if (!validStatuses.includes(updateData.status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        }
        dataToUpdate.status = updateData.status as DailyUpdateStatus;
    }

    // Update description if provided
    if (updateData.description !== undefined) {
        dataToUpdate.description = updateData.description || null;
    }

    // Update projectId if provided
    if (updateData.projectId !== undefined) {
        if (updateData.projectId && updateData.projectId.trim() !== "") {
            // Check Project Exists (Decoupled)
            await projectService.getProjectById(updateData.projectId);
            dataToUpdate.project = { connect: { projectId: updateData.projectId } };
        } else {
            dataToUpdate.project = { disconnect: true };
        }
    }

    // Update rawMaterials if provided
    if (updateData.rawMaterials !== undefined) {
        if (Array.isArray(updateData.rawMaterials)) {
            // Validate rawMaterials structure
            for (const material of updateData.rawMaterials) {
                if (!material.materialName || material.materialName.trim() === "") {
                    throw new Error("Material name is required for each raw material");
                }
                if (material.quantity === undefined || material.quantity < 0) {
                    throw new Error("Quantity must be a non-negative number for each raw material");
                }
            }
            dataToUpdate.rawMaterials = JSON.stringify(updateData.rawMaterials);
        } else {
            dataToUpdate.rawMaterials = Prisma.JsonNull;
        }
    }

    // Update image if provided
    if (image) {
        try {
            const uploadResult = await fileUploadService.uploadFile({
                file: image,
                bucket: 'uploads',
                folder: 'daily-updates/images'
            });
            dataToUpdate.imageUrl = uploadResult.publicUrl;
            dataToUpdate.imageId = uploadResult.id;
            dataToUpdate.imageName = image.originalname;
            dataToUpdate.imageType = image.mimetype;
        } catch (error) {
            console.error("Error uploading image to Supabase:", error);
            throw new Error("Failed to upload image to storage");
        }
    }

    // Update video if provided
    if (video) {
        try {
            const uploadResult = await fileUploadService.uploadFile({
                file: video,
                bucket: 'uploads',
                folder: 'daily-updates/videos'
            });
            dataToUpdate.videoUrl = uploadResult.publicUrl;
            dataToUpdate.videoId = uploadResult.id;
        } catch (error) {
            console.error("Error uploading video to Supabase:", error);
            throw new Error("Failed to upload video to storage");
        }
    }

    const updatedDailyUpdate = await prisma.dailyUpdate.update({
        where: { dailyUpdateId },
        data: dataToUpdate,
    });
    return updatedDailyUpdate;
};

/**
 * Delete a daily update
 * @param dailyUpdateId - ID of the update to delete
 * @returns Success message
 */
export const deleteDailyUpdate = async (dailyUpdateId: string) => {
    if (!dailyUpdateId) {
        throw new Error("Daily update ID is required");
    }

    // Check if exists
    const dailyUpdate = await prisma.dailyUpdate.findUnique({
        where: { dailyUpdateId },
    });

    if (!dailyUpdate) {
        throw new Error("Daily update not found");
    }

    await prisma.dailyUpdate.delete({
        where: { dailyUpdateId },
    });
    return { success: true, message: "Daily update deleted successfully" };
};

/**
 * Get daily update image/video details
 * @param dailyUpdateId - ID of the daily update
 * @returns The daily update with file URLs
 */
export const getDailyUpdateImage = async (dailyUpdateId: string) => {
    if (!dailyUpdateId) {
        throw new Error("Daily update ID is required");
    }

    const dailyUpdate = await prisma.dailyUpdate.findUnique({
        where: { dailyUpdateId },
        select: {
            dailyUpdateId: true,
            imageName: true,
            imageType: true,
            imageUrl: true,
            videoUrl: true,
            createdAt: true,
        },
    });

    if (!dailyUpdate) {
        throw new Error("Daily update not found");
    }

    return dailyUpdate;
};

/**
 * Get all daily updates for projects owned by a specific user (Customer)
 * @param userId - The ID of the user (customer)
 * @returns List of daily updates with project details
 */
export const getDailyUpdatesForUser = async (userId: string) => {
    // 1. Get projects owned by this user (Decoupled)
    const projects = await projectService.getProjectsByCustomerId(userId);

    if (projects.length === 0) {
        return [];
    }

    const projectIds = projects.map(p => p.projectId);

    // 2. Fetch daily updates for these projects
    const dailyUpdates = await prisma.dailyUpdate.findMany({
        where: {
            projectId: { in: projectIds }
        },
        orderBy: { createdAt: "desc" },
        include: {
            project: {
                select: {
                    projectName: true,
                    location: true
                }
            }
        }
    });


    // 3. To calculate progress efficiently, we need ALL approved updates for these projects,
    // not just the ones for the specific user (which is all of them anyway).
    // Let's fetch all approved updates for these projects to calculate progress.
    const allApprovedUpdates = await prisma.dailyUpdate.findMany({
        where: {
            projectId: { in: projectIds },
            status: DailyUpdateStatus.approved
        },
        select: {
            projectId: true,
            constructionStage: true
        }
    });

    // 4. Map progress to each daily update's project AND parse rawMaterials
    const updatesWithProgress = dailyUpdates.map(update => {

        // Parse rawMaterials
        let parsedRawMaterials = update.rawMaterials;
        for (let i = 0; i < 3; i++) {
            if (typeof parsedRawMaterials === 'string') {
                try {
                    parsedRawMaterials = JSON.parse(parsedRawMaterials);
                } catch (e) {
                    break;
                }
            } else {
                break;
            }
        }

        if (!parsedRawMaterials || !Array.isArray(parsedRawMaterials)) {
            parsedRawMaterials = [];
        }

        if (!update.project) return { ...update, rawMaterials: parsedRawMaterials };

        const approvedForThisProject = allApprovedUpdates.filter(u => u.projectId === update.projectId);
        const uniqueStages = new Set(approvedForThisProject.map(u => u.constructionStage));
        const totalStages = 6; // Total stages defined in enum
        const progress = Math.min(100, Math.round((uniqueStages.size / totalStages) * 100));

        return {
            ...update,
            rawMaterials: parsedRawMaterials,
            project: {
                ...update.project,
                progress: progress
            }
        };
    });

    return updatesWithProgress;
};

/**
 * Get daily updates by status for a specific user (Customer)
 * Used to fetch updates for projects owned by the user.
 * @param userId - The ID of the authenticated user
 * @param status - The status filter (pending, approved, rejected)
 * @returns List of matching daily updates
 */
export const getDailyUpdatesByStatusForUser = async (userId: string, status: string) => {
    // Validate status
    const validStatuses = ["pending", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    // Find all projects belonging to the user (Decoupled)
    const userProjects = await projectService.getProjectsByCustomerId(userId);

    if (userProjects.length === 0) {
        return [];
    }

    const projectIds = userProjects.map(p => p.projectId);

    // Find daily updates for these projects with the given status
    const statusEnum = status as DailyUpdateStatus;

    const dailyUpdates = await prisma.dailyUpdate.findMany({
        where: {
            projectId: { in: projectIds },
            status: statusEnum
        },
        orderBy: { createdAt: "desc" },
        include: {
            project: {
                select: {
                    projectName: true,
                    location: true
                }
            }
        }
    });

    // Parse rawMaterials
    const parsedUpdates = dailyUpdates.map(update => {
        let parsedRawMaterials = update.rawMaterials;

        // Loop to safely parse double or triple stringified JSON, if any
        for (let i = 0; i < 3; i++) {
            if (typeof parsedRawMaterials === 'string') {
                try {
                    parsedRawMaterials = JSON.parse(parsedRawMaterials);
                } catch (e) {
                    console.error(`Failed to parse rawMaterials for update ${update.dailyUpdateId}:`, e);
                    break;
                }
            } else {
                break;
            }
        }

        if (!parsedRawMaterials || !Array.isArray(parsedRawMaterials)) {
            parsedRawMaterials = [];
        }

        return {
            ...update,
            rawMaterials: parsedRawMaterials
        };
    });

    return parsedUpdates;
};

/**
 * Get daily updates by status with count, filtered by user role
 * @param status - Status to filter by (pending, approved, rejected)
 * @param supervisorId - Optional supervisor ID
 * @param customerId - Optional customer ID
 * @returns Object containing updates list and count
 */
export const getDailyUpdatesByStatus = async (status: string, supervisorId?: string, customerId?: string) => {
    // Validate status
    const validStatuses = ["pending", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    const statusEnum = status as DailyUpdateStatus;
    const where: Prisma.DailyUpdateWhereInput = { status: statusEnum };

    if (supervisorId) {
        where.project = { supervisorId };
    } else if (customerId) {
        where.project = { customerId };
    }

    const [updates, count] = await Promise.all([
        prisma.dailyUpdate.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { project: true }
        }),
        prisma.dailyUpdate.count({ where })
    ]);

    // Parse rawMaterials
    const parsedUpdates = updates.map(update => {
        let parsedRawMaterials = update.rawMaterials;

        for (let i = 0; i < 3; i++) {
            if (typeof parsedRawMaterials === 'string') {
                try {
                    parsedRawMaterials = JSON.parse(parsedRawMaterials);
                } catch (e) {
                    console.error(`Failed to parse rawMaterials for update ${update.dailyUpdateId}:`, e);
                    break;
                }
            } else {
                break;
            }
        }

        if (!parsedRawMaterials || !Array.isArray(parsedRawMaterials)) {
            parsedRawMaterials = [];
        }

        return {
            ...update,
            rawMaterials: parsedRawMaterials
        };
    });

    return { updates: parsedUpdates, count };
};

/**
 * Approve a daily update (Customer)
 * Validates that the update belongs to a project owned by the user.
 * @param dailyUpdateId - ID of the update to approve
 * @param userId - ID of the authenticated user
 * @returns The updated daily update record
 */
export const approveDailyUpdate = async (dailyUpdateId: string, userId: string) => {
    // Get Daily Update
    const dailyUpdate = await prisma.dailyUpdate.findUnique({
        where: { dailyUpdateId },
    });

    if (!dailyUpdate) {
        throw new Error("Daily update not found");
    }

    if (!dailyUpdate.projectId) {
        throw new Error("Daily update is not linked to any project");
    }

    // Decoupled Validation: Fetch project via service
    const project = await projectService.getProjectById(dailyUpdate.projectId);

    // Check if user is the customer of the project
    const isCustomer = project.customer?.userId === userId;

    if (!isCustomer) {
        throw new Error("Unauthorized: You can only approve updates for your own projects");
    }

    const updatedDailyUpdate = await prisma.dailyUpdate.update({
        where: { dailyUpdateId },
        data: {
            status: DailyUpdateStatus.approved,
            updatedAt: new Date()
        }
    });

    // Update Project Progress
    const approvedUpdates = await prisma.dailyUpdate.findMany({
        where: {
            projectId: dailyUpdate.projectId,
            status: DailyUpdateStatus.approved
        },
        select: { constructionStage: true }
    });

    const uniqueStages = new Set(approvedUpdates.map(u => u.constructionStage));
    const totalStages = 6;
    const newProgress = Math.min(Math.round((uniqueStages.size / totalStages) * 100), 100);

    await prisma.project.update({
        where: { projectId: dailyUpdate.projectId },
        data: { progress: newProgress }
    });

    // Notify Admins
    SocketService.getInstance().emitToRole("admin", "daily_update_status", {
        status: "APPROVED",
        projectName: project.projectName,
        dailyUpdateId: dailyUpdate.dailyUpdateId
    });

    // Notify Supervisor
    if (project.supervisorId) {
        const supervisor = await prisma.supervisor.findUnique({
            where: { supervisorId: project.supervisorId }
        });
        if (supervisor) {
            SocketService.getInstance().emitToUser(supervisor.userId, "notification", {
                type: "DAILY_UPDATE_APPROVED",
                message: `Daily update for ${project.projectName} has been APPROVED by customer`,
                dailyUpdateId: dailyUpdate.dailyUpdateId
            });
            await notifyUser(supervisor.userId, `Daily update for ${project.projectName} has been APPROVED by customer`, "daily_update_approved");
        }
    }

    try {
        const projectName = project.projectName || "Unknown Project";
        await notifyAdmins(`Daily update for ${projectName} has been APPROVED by the customer`, "daily_update_approval");
    } catch (error) {
        console.error("Failed to send notification:", error);
    }

    return updatedDailyUpdate;
};

/**
 * Reject a daily update (Customer)
 * Validates that the update belongs to a project owned by the user.
 * @param dailyUpdateId - ID of the update to reject
 * @param userId - ID of the authenticated user
 * @returns The updated daily update record
 */
export const rejectDailyUpdate = async (dailyUpdateId: string, userId: string) => {
    // Get Daily Update
    const dailyUpdate = await prisma.dailyUpdate.findUnique({
        where: { dailyUpdateId },
    });

    if (!dailyUpdate) {
        throw new Error("Daily update not found");
    }

    if (!dailyUpdate.projectId) {
        throw new Error("Daily update is not linked to any project");
    }

    // Decoupled Validation: Fetch project via service
    const project = await projectService.getProjectById(dailyUpdate.projectId);

    // Check if user is the customer of the project
    const isCustomer = project.customer?.userId === userId;

    if (!isCustomer) {
        throw new Error("Unauthorized: You can only reject updates for your own projects");
    }

    const updatedDailyUpdate = await prisma.dailyUpdate.update({
        where: { dailyUpdateId },
        data: {
            status: DailyUpdateStatus.rejected,
            updatedAt: new Date()
        }
    });

    // Notify Admins
    SocketService.getInstance().emitToRole("admin", "daily_update_status", {
        status: "REJECTED",
        projectName: project.projectName,
        dailyUpdateId: dailyUpdate.dailyUpdateId
    });

    // Notify Supervisor
    if (project.supervisorId) {
        const supervisor = await prisma.supervisor.findUnique({
            where: { supervisorId: project.supervisorId }
        });
        if (supervisor) {
            SocketService.getInstance().emitToUser(supervisor.userId, "notification", {
                type: "DAILY_UPDATE_REJECTED",
                message: `Daily update for ${project.projectName} has been REJECTED by customer`,
                dailyUpdateId: dailyUpdate.dailyUpdateId
            });
            await notifyUser(supervisor.userId, `Daily update for ${project.projectName} has been REJECTED by customer`, "daily_update_rejected");
        }
    }

    try {
        const projectName = project.projectName || "Unknown Project";
        await notifyAdmins(`Daily update for ${projectName} has been REJECTED by the customer`, "daily_update_rejection");
    } catch (error) {
        console.error("Failed to send notification:", error);
    }

    return updatedDailyUpdate;
};

/**
 * Get construction timeline for a project
 * @param projectId - The project ID
 * @param supervisorId - Optional supervisor ID to verify assignment
 * @returns Timeline with status and dates for each stage
 */
export const getConstructionTimeline = async (projectId: string, supervisorId?: string) => {
    // 1. Verify project exists (Decoupled)
    const project = await projectService.getProjectById(projectId);

    // 2. If supervisorId is provided, check if project is assigned to this supervisor
    if (supervisorId) {
        if (project.supervisorId !== supervisorId) {
            throw new Error("Unauthorized: You are not assigned to this project");
        }
    }

    // 3. Fetch all daily updates for this project
    const updates = await prisma.dailyUpdate.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' }
    });

    const stages = [
        "Foundation",
        "Framing",
        "Plumbing & Electrical",
        "Interior Walls",
        "Painting",
        "Finishing"
    ];

    const timeline = stages.map(stage => {
        // Map display string to Enum
        let stageEnum: ConstructionStage;
        if (stage === "Plumbing & Electrical") {
            stageEnum = ConstructionStage.Plumbing___Electrical;
        } else if (stage === "Interior Walls") {
            stageEnum = ConstructionStage.Interior_Walls;
        } else {
            stageEnum = stage as ConstructionStage;
        }

        const stageUpdates = updates.filter(u => u.constructionStage === stageEnum);

        let status = "Pending";
        let date: Date | null = null;

        if (stageUpdates.length > 0) {
            // Check if any is approved
            const approved = stageUpdates.find(u => u.status === DailyUpdateStatus.approved);
            if (approved) {
                status = "Completed";
                date = approved.updatedAt; // Completion date
            } else {
                // If any pending or rejected, it's considered In Progress/Active attempt
                // Use the latest one for date
                const latest = stageUpdates[0];
                status = "In Progress";
                date = latest ? latest.createdAt : null;
            }
        }

        return {
            stage,
            status,
            date: date ? date.toISOString().split('T')[0] : null
        };
    });

    return timeline;
};

/**
 * Get statistics for a supervisor (pending and rejected counts)
 * @param supervisorId - The ID of the supervisor
 * @returns Object containing pending and rejected counts
 */
export const getSupervisorStats = async (supervisorId: string) => {
    if (!supervisorId) {
        throw new Error("Supervisor ID is required");
    }

    // Decoupled: Get Supervisor's Projects via ProjectService
    const projects = await projectService.getProjectsBySupervisorId(supervisorId);

    if (projects.length === 0) {
        return { pending: 0, rejected: 0, approved: 0 };
    }

    const projectIds = projects.map(p => p.projectId);

    const pendingCount = await prisma.dailyUpdate.count({
        where: {
            projectId: { in: projectIds },
            status: DailyUpdateStatus.pending
        }
    });

    const rejectedCount = await prisma.dailyUpdate.count({
        where: {
            projectId: { in: projectIds },
            status: DailyUpdateStatus.rejected
        }
    });

    const approvedCount = await prisma.dailyUpdate.count({
        where: {
            projectId: { in: projectIds },
            status: DailyUpdateStatus.approved
        }
    });

    return {
        pending: pendingCount,
        rejected: rejectedCount,
        approved: approvedCount
    };
};
