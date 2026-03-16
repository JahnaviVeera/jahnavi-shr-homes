import { Request, Response } from "express";
import * as PurchaseServices from "./purchases.services";

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
        const { projectId, startDate, endDate } = req.query;
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
