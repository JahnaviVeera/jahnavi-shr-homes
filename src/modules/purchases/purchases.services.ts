import prisma from "../../config/prisma.client";

export const createPurchase = async (
    projectId: string, 
    materialName: string, 
    price: number,
    vendorDetails?: string,
    dateOfPurchase?: string,
    quantity?: number,
    unit?: string,
    createdBy?: string,
    transportAmt?: number,
    vendorPay?: number,
    totalPrice?: number,
    dueAmount?: number
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
            vendorDetails: vendorDetails ?? null,
            dateOfPurchase: dateOfPurchase,
            quantity: quantity ?? null,
            unit: unit ?? null,
            transportAmt: transportAmt ?? null,
            vendorPay: vendorPay ?? null,
            totalPrice: totalPrice ?? null,
            dueAmount: dueAmount ?? null,
            createdBy: createdBy || null
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
        transportAmt: purchase.transportAmt != null ? Number(purchase.transportAmt) : undefined,
        vendorPay: purchase.vendorPay != null ? Number(purchase.vendorPay) : undefined,
        totalPrice: purchase.totalPrice != null ? Number(purchase.totalPrice) : undefined,
        dueAmount: purchase.dueAmount != null ? Number(purchase.dueAmount) : undefined,
        createdAt: purchase.createdAt
    };
};

export const getAllPurchases = async (projectId?: string, startDate?: string, endDate?: string) => {
    const whereClause: any = {};

    if (projectId) {
        whereClause.projectId = projectId;
    }

    if (startDate || endDate) {
        whereClause.dateOfPurchase = {};
        if (startDate) {
            whereClause.dateOfPurchase.gte = startDate;
        }
        if (endDate) {
            whereClause.dateOfPurchase.lte = endDate;
        }
    }

    const purchases = await prisma.purchase.findMany({
        where: whereClause,
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
        transportAmt: p.transportAmt != null ? Number(p.transportAmt) : undefined,
        vendorPay: p.vendorPay != null ? Number(p.vendorPay) : undefined,
        totalPrice: p.totalPrice != null ? Number(p.totalPrice) : undefined,
        dueAmount: p.dueAmount != null ? Number(p.dueAmount) : undefined,
        createdAt: p.createdAt,
        createdBy: p.createdBy,
        updatedBy: p.updatedBy
    }));
};

// Fetch purchases for multiple projects at once (used when a supervisor has no specific projectId filter)
export const getAllPurchasesForProjects = async (projectIds: string[], startDate?: string, endDate?: string) => {
    if (!projectIds || projectIds.length === 0) {
        return [];
    }

    const whereClause: any = {
        projectId: { in: projectIds }
    };

    if (startDate || endDate) {
        whereClause.dateOfPurchase = {};
        if (startDate) {
            whereClause.dateOfPurchase.gte = startDate;
        }
        if (endDate) {
            whereClause.dateOfPurchase.lte = endDate;
        }
    }

    const purchases = await prisma.purchase.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" }
    });

    return purchases.map((p: any) => ({
        id: p.id,
        projectId: p.projectId,
        materialName: p.materialName,
        price: Number(p.price),
        vendorDetails: p.vendorDetails,
        dateOfPurchase: p.dateOfPurchase,
        quantity: p.quantity ? Number(p.quantity) : undefined,
        unit: p.unit,
        transportAmt: p.transportAmt != null ? Number(p.transportAmt) : undefined,
        vendorPay: p.vendorPay != null ? Number(p.vendorPay) : undefined,
        totalPrice: p.totalPrice != null ? Number(p.totalPrice) : undefined,
        dueAmount: p.dueAmount != null ? Number(p.dueAmount) : undefined,
        createdAt: p.createdAt,
        createdBy: p.createdBy,
        updatedBy: p.updatedBy
    }));
};

export const updatePurchase = async (
    id: number,
    data: {
        projectId?: string;
        materialName?: string;
        price?: number;
        vendorDetails?: string;
        dateOfPurchase?: string;
        quantity?: number;
        unit?: string;
        transportAmt?: number;
        vendorPay?: number;
        totalPrice?: number;
        dueAmount?: number;
        updatedBy?: string;
    }
) => {
    const updateData: any = { ...data };
    
    // Remove undefined properties to satisfy exactOptionalPropertyTypes
    Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
            delete updateData[key];
        }
    });

    const purchase = await prisma.purchase.update({
        where: { id },
        data: updateData
    });

    return {
        id: purchase.id,
        projectId: purchase.projectId,
        materialName: purchase.materialName,
        price: Number(purchase.price),
        vendorDetails: purchase.vendorDetails,
        dateOfPurchase: purchase.dateOfPurchase,
        quantity: purchase.quantity ? Number(purchase.quantity) : undefined,
        unit: purchase.unit,
        transportAmt: purchase.transportAmt != null ? Number(purchase.transportAmt) : undefined,
        vendorPay: purchase.vendorPay != null ? Number(purchase.vendorPay) : undefined,
        totalPrice: purchase.totalPrice != null ? Number(purchase.totalPrice) : undefined,
        dueAmount: purchase.dueAmount != null ? Number(purchase.dueAmount) : undefined,
        createdAt: purchase.createdAt,
        createdBy: purchase.createdBy,
        updatedBy: purchase.updatedBy
    };
};
