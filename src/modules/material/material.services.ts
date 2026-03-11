import prisma from "../../config/prisma.client";

// Create a new material
export const createMaterial = async (data: {
    projectId: string;
    materialName: string;
    quantity: number;
    units?: string;
    date: Date | string;
    notes?: string | null;
    vendor?: string | null;
}, supervisorId?: string) => {
    // Validate required fields
    if (!data.projectId || !data.materialName || data.quantity === undefined || !data.date) {
        throw new Error("Missing required fields: projectId, materialName, quantity, date");
    }

    // Parse quantity to integer
    const quantity = parseInt(String(data.quantity), 10);
    if (isNaN(quantity)) {
        throw new Error("Invalid quantity. Must be a valid number.");
    }

    // Ensure date is a valid Date object or string
    let parsedDate: Date;
    if (data.date instanceof Date) {
        parsedDate = data.date;
    } else {
        // Try parsing YYYY-MM-DD (ISO) first
        parsedDate = new Date(data.date);

        // If invalid, try parsing DD-MM-YYYY
        if (isNaN(parsedDate.getTime())) {
            const parts = String(data.date).split("-");
            // Check if it matches DD-MM-YYYY format (roughly)
            if (parts.length === 3 && parts[2]?.length === 4) {
                // Convert to YYYY-MM-DD for Date constructor
                parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
        }
    }

    if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date format. Expected YYYY-MM-DD or DD-MM-YYYY.");
    }

    // Validate project existence and assignment
    const project = await prisma.project.findUnique({
        where: { projectId: data.projectId },
        select: { supervisorId: true }
    });

    if (!project) {
        throw new Error("Project not found");
    }

    if (supervisorId) {
        if (project.supervisorId !== supervisorId) {
            throw new Error("Unauthorized: You are not assigned to this project and cannot post materials for it.");
        }
    }

    const newMaterial = await prisma.material.create({
        data: {
            projectId: data.projectId,
            materialName: data.materialName,
            quantity: quantity,
            units: data.units as any,
            date: `${String(parsedDate.getDate()).padStart(2, '0')}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${parsedDate.getFullYear()}`,
            notes: data.notes || null,
            vendor: data.vendor || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    });

    return newMaterial;
};

// Get material by ID
export const getMaterialById = async (materialId: string, supervisorId?: string) => {
    if (!materialId) {
        throw new Error("Material ID is required");
    }

    const material = await prisma.material.findUnique({
        where: { materialId },
        include: { project: true }
    });

    if (!material) {
        throw new Error("Material not found");
    }

    // Check assignment
    if (supervisorId) {
        if (material.project.supervisorId !== supervisorId) {
            throw new Error("Unauthorized: You are not assigned to the project this material belongs to.");
        }
    }

    return material;
};

// Get all materials
export const getAllMaterials = async (search?: string, supervisorId?: string) => {
    const where: any = {};

    if (supervisorId) {
        where.project = {
            supervisorId: supervisorId
        };
    }

    if (search) {
        const searchFilter = [
            { materialName: { contains: search, mode: 'insensitive' as const } },
            { notes: { contains: search, mode: 'insensitive' as const } },
            { vendor: { contains: search, mode: 'insensitive' as const } },
            { project: { projectName: { contains: search, mode: 'insensitive' as const } } }
        ];

        if (where.project) {
            // Combine with existing project filter
            where.AND = [
                { project: where.project },
                { OR: searchFilter }
            ];
            delete where.project;
        } else {
            where.OR = searchFilter;
        }
    }

    const materials = await prisma.material.findMany({
        where,
        include: { project: true },
        orderBy: { createdAt: "desc" }
    });

    return materials || [];
};

// Get materials by project ID
export const getMaterialsByProject = async (projectId: string, supervisorId?: string) => {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    // Check assignment
    if (supervisorId) {
        const project = await prisma.project.findUnique({
            where: { projectId },
            select: { supervisorId: true }
        });

        if (!project) {
            throw new Error("Project not found");
        }

        if (project.supervisorId !== supervisorId) {
            throw new Error("Unauthorized: You are not assigned to this project.");
        }
    }

    const materials = await prisma.material.findMany({
        where: { projectId },
        include: { project: true },
        orderBy: { createdAt: "desc" }
    });

    return materials;
};

// Get total material count by project
export const getTotalMaterialCountByProject = async (projectId: string, supervisorId?: string) => {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    // Check assignment
    if (supervisorId) {
        const project = await prisma.project.findUnique({
            where: { projectId },
            select: { supervisorId: true }
        });

        if (!project) {
            throw new Error("Project not found");
        }

        if (project.supervisorId !== supervisorId) {
            throw new Error("Unauthorized: You are not assigned to this project.");
        }
    }

    const count = await prisma.material.count({
        where: { projectId }
    });

    return {
        projectId: projectId,
        totalCount: count
    };
};

// Update material
export const updateMaterial = async (materialId: string, updateData: {
    materialName?: string;
    quantity?: number;
    units?: string;
    date?: Date | string;
    notes?: string | null;
    vendor?: string | null;
    projectId?: string;
}, supervisorId?: string) => {

    // Parse quantity if provided
    let quantity: number | undefined = undefined;
    if (updateData.quantity !== undefined) {
        quantity = parseInt(String(updateData.quantity), 10);
        if (isNaN(quantity)) {
            throw new Error("Invalid quantity. Must be a valid number.");
        }
    }

    const material = await prisma.material.findUnique({
        where: { materialId },
        include: { project: true }
    });

    if (!material) {
        throw new Error("Material not found");
    }

    // Check assignment for the original project
    if (supervisorId) {
        if (material.project.supervisorId !== supervisorId) {
            throw new Error("Unauthorized: You are not assigned to this project and cannot update its materials.");
        }

        // If shifting material to another project, check that project too
        if (updateData.projectId && updateData.projectId !== material.projectId) {
            const newProject = await prisma.project.findUnique({
                where: { projectId: updateData.projectId },
                select: { supervisorId: true }
            });

            if (!newProject) {
                throw new Error("Target project not found");
            }

            if (newProject.supervisorId !== supervisorId) {
                throw new Error("Unauthorized: You are not assigned to the target project and cannot move materials into it.");
            }
        }
    }

    const dataToUpdate: any = {
        updatedAt: new Date(),
    };

    if (updateData.materialName !== undefined) {
        dataToUpdate.materialName = updateData.materialName;
    }

    if (quantity !== undefined) {
        dataToUpdate.quantity = quantity;
    }

    if (updateData.units !== undefined) {
        dataToUpdate.units = updateData.units;
    }

    if (updateData.date !== undefined) {
        let parsedDate: Date;
        if (updateData.date instanceof Date) {
            parsedDate = updateData.date;
        } else {
            // Try parsing YYYY-MM-DD first
            parsedDate = new Date(updateData.date);

            // If invalid, try parsing DD-MM-YYYY
            if (isNaN(parsedDate.getTime())) {
                const parts = String(updateData.date).split("-");
                if (parts.length === 3 && parts[2]?.length === 4) {
                    parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
            }
        }

        if (isNaN(parsedDate.getTime())) {
            throw new Error("Invalid date format. Expected YYYY-MM-DD or DD-MM-YYYY.");
        }
        dataToUpdate.date = `${String(parsedDate.getDate()).padStart(2, '0')}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${parsedDate.getFullYear()}`;
    }

    if (updateData.notes !== undefined) {
        dataToUpdate.notes = updateData.notes;
    }

    if (updateData.vendor !== undefined) {
        dataToUpdate.vendor = updateData.vendor;
    }

    if (updateData.projectId !== undefined) {
        dataToUpdate.projectId = updateData.projectId;
    }

    const updatedMaterial = await prisma.material.update({
        where: { materialId },
        data: dataToUpdate,
    });
    return updatedMaterial;
};

// Delete material
export const deleteMaterial = async (materialId: string, supervisorId?: string) => {
    const material = await prisma.material.findUnique({
        where: { materialId },
        include: { project: true }
    });

    if (!material) {
        throw new Error("Material not found");
    }

    // Check assignment
    if (supervisorId) {
        if (material.project.supervisorId !== supervisorId) {
            throw new Error("Unauthorized: You are not assigned to this project and cannot delete its materials.");
        }
    }

    await prisma.material.delete({
        where: { materialId }
    });
    return { success: true, message: "Material deleted successfully" };
};

// Get materials for logged-in supervisor
export const getMaterialsBySupervisorId = async (supervisorId: string) => {
    // Fetch projects assigned to this supervisor with their materials
    const projects = await prisma.project.findMany({
        where: { supervisorId },
        select: {
            projectId: true,
            projectName: true,
            projectType: true,
            location: true,
            materials: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    // Format the response
    return projects.map(project => ({
        projectId: project.projectId,
        projectName: project.projectName,
        projectType: project.projectType,
        location: project.location,
        totalMaterials: project.materials.length,
        materials: project.materials
    }));
};
