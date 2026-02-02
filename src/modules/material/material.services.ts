import prisma from "../../config/prisma.client";

// Create a new material
export const createMaterial = async (data: {
    projectId: string;
    materialName: string;
    quantity: number;
    date: Date | string;
    notes?: string | null;
    vendor?: string | null;
}, supervisorId?: string) => {
    // Validate project existence and assignment if supervisorId is provided
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

    // Ensure date is a valid Date object
    const parsedDate = new Date(data.date);
    if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date format. Expected ISO-8601 DateTime string.");
    }

    const newMaterial = await prisma.material.create({
        data: {
            projectId: data.projectId,
            materialName: data.materialName,
            quantity: data.quantity,
            date: parsedDate.toISOString().split('T')[0],
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
            { materialName: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
            { vendor: { contains: search, mode: 'insensitive' } },
            { project: { projectName: { contains: search, mode: 'insensitive' } } }
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

    if (!materials) {
        return [];
    }
    return materials;
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
    date?: Date | string;
    notes?: string | null;
    vendor?: string | null;
    projectId?: string;
}, supervisorId?: string) => {
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

    if (updateData.quantity !== undefined) {
        dataToUpdate.quantity = updateData.quantity;
    }

    if (updateData.date !== undefined) {
        const parsedDate = new Date(updateData.date);
        if (isNaN(parsedDate.getTime())) {
            throw new Error("Invalid date format. Expected ISO-8601 DateTime string.");
        }
        dataToUpdate.date = parsedDate.toISOString().split('T')[0];
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
