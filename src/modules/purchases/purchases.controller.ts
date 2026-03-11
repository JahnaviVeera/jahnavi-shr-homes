import { Request, Response } from "express";
import * as PurchaseServices from "./purchases.services";

export const createPurchase = async (req: Request, res: Response) => {
    try {
        const { projectId, materialName, price } = req.body;

        const newPurchase = await PurchaseServices.createPurchase(projectId, materialName, Number(price));

        // The user specifically requested a format like this.
        return res.status(201).json({
            success: true,
            data: [newPurchase] // Could return it as single object or array, wrapping in array as requested in example
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
        const purchases = await PurchaseServices.getAllPurchases();

        // The EXACT format requested:
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
