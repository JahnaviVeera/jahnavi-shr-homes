import { Request, Response } from "express";
import * as ReportServices from "./reports.services";

export const getConsolidatedExpenseReport = async (req: Request, res: Response) => {
    try {
        const { projectId, startDate, endDate } = req.query;

        const report = await ReportServices.getConsolidatedExpenseReport(
            projectId as string,
            startDate as string,
            endDate as string
        );

        return res.status(200).json({
            success: true,
            data: report
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to generate consolidated report"
        });
    }
};
