import prisma from "../../config/prisma.client";

export const createPurchase = async (
    projectId: string, 
    materialName: string, 
    price: number,
    vendorDetails?: string,
    dateOfPurchase?: string,
    quantity?: number,
    unit?: string
) => {
    // Basic validation
    if (!projectId || !materialName || price === undefined) {
        throw new Error("projectId, materialName, and price are required");
    }
    if (!dateOfPurchase) {
        throw new Error("dateOfPurchase is required");
    }

    const purchase = await prisma.purchase.create({
        data: {
            projectId,
            materialName,
            price,
            vendorDetails,
            dateOfPurchase,
            quantity,
            unit
        }
    });

    // Convert decimal to number for the proper frontend response
    return {
        id: purchase.id,
        projectId: purchase.projectId,
        materialName: purchase.materialName,
        price: Number(purchase.price),
        vendorDetails: purchase.vendorDetails,
        dateOfPurchase: purchase.dateOfPurchase,
        quantity: purchase.quantity ? Number(purchase.quantity) : undefined,
        unit: purchase.unit,
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
        vendorDetails: p.vendorDetails,
        dateOfPurchase: p.dateOfPurchase,
        quantity: p.quantity ? Number(p.quantity) : undefined,
        unit: p.unit,
        createdAt: p.createdAt
    }));
};
