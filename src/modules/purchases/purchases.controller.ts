import { Request, Response } from "express";
import * as PurchaseServices from "./purchases.services";
import prisma from "../../config/prisma.client";

export const createPurchase = async (req: Request, res: Response) => {
    try {
        const { projectId, materialName, price, vendorDetails, dateOfPurchase, quantity, unit, transportAmt, vendorPay, totalPrice, dueAmount } = req.body;

        const authReq = req as any;
        const fullName = authReq.user?.fullName || "System";

        const newPurchase = await PurchaseServices.createPurchase(
            projectId, 
            materialName, 
            Number(price),
            vendorDetails,
            dateOfPurchase,
            quantity !== undefined ? Number(quantity) : undefined,
            unit,
            fullName,
            transportAmt !== undefined ? Number(transportAmt) : undefined,
            vendorPay !== undefined ? Number(vendorPay) : undefined,
            totalPrice !== undefined ? Number(totalPrice) : undefined,
            dueAmount !== undefined ? Number(dueAmount) : undefined
        );

        return res.status(201).json({
            success: true,
            data: [newPurchase] 
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to create purchase"
        });
    }
};

export const getAllPurchases = async (req: Request, res: Response) => {
    try {
        const authReq = req as any;
        let { projectId, startDate, endDate } = req.query;

        // If the caller is a supervisor, scope to their assigned projects only
        if (authReq.user?.role === 'supervisor') {
            const supervisorRecord = await prisma.supervisor.findUnique({
                where: { userId: authReq.user.userId },
                select: { supervisorId: true }
            });

            if (!supervisorRecord) {
                return res.status(403).json({
                    success: false,
                    message: "Supervisor record not found"
                });
            }

            // Fetch all projects assigned to this supervisor
            const assignedProjects = await prisma.project.findMany({
                where: { supervisorId: supervisorRecord.supervisorId },
                select: { projectId: true }
            });

            const assignedProjectIds = assignedProjects.map((p: { projectId: string }) => p.projectId);

            // If a specific projectId was requested, ensure it is one of their assigned ones
            if (projectId && !assignedProjectIds.includes(projectId as string)) {
                // The requested project is not assigned to this supervisor — return empty
                return res.status(200).json({ success: true, data: [] });
            }

            // Restrict to assigned projects (use provided projectId if it is valid, else all assigned ones)
            if (!projectId) {
                // No specific project requested — return all purchases across their assigned projects
                const purchases = await PurchaseServices.getAllPurchasesForProjects(
                    assignedProjectIds,
                    startDate as string,
                    endDate as string
                );
                return res.status(200).json({ success: true, data: purchases });
            }
        }

        const purchases = await PurchaseServices.getAllPurchases(
            projectId as string,
            startDate as string,
            endDate as string
        );

        return res.status(200).json({
            success: true,
            data: purchases
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch purchases"
        });
    }
};

export const updatePurchase = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const authReq = req as any;
        const fullName = authReq.user?.fullName || "System";

        const updatedPurchase = await PurchaseServices.updatePurchase(Number(id), {
            ...req.body,
            updatedBy: fullName
        });

        return res.status(200).json({
            success: true,
            data: [updatedPurchase]
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to update purchase"
        });
    }
};
