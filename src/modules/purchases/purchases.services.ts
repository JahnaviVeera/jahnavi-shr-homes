import prisma from "../../config/prisma.client";

export const createPurchase = async (projectId: string, materialName: string, price: number) => {
    // Basic validation
    if (!projectId || !materialName || price === undefined) {
        throw new Error("projectId, materialName, and price are required");
    }

    const purchase = await prisma.purchase.create({
        data: {
            projectId,
            materialName,
            price
        }
    });

    // Convert decimal to number for the proper frontend response
    return {
        id: purchase.id,
        projectId: purchase.projectId,
        materialName: purchase.materialName,
        price: Number(purchase.price),
        createdAt: purchase.createdAt
    };
};

export const getAllPurchases = async () => {
    const purchases = await prisma.purchase.findMany({
        orderBy: { createdAt: "desc" }
    });

    // Formatting it properly to match the exact requirement
    return purchases.map((p: any) => ({
        id: p.id,
        projectId: p.projectId,
        materialName: p.materialName,
        price: Number(p.price),
        createdAt: p.createdAt
    }));
};
