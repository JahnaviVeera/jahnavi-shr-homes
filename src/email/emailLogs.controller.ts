import type { Request, Response } from 'express';
import prisma from '../config/prisma.client';

/**
 * GET /api/email-logs
 * Returns the most recent 50 email log entries (Admin only).
 */
export const getEmailLogs = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(String(req.query.limit || '50'));
        const status = req.query.status as string | undefined; // "sent" | "failed"

        const where: any = {};
        if (status) where.status = status;

        const logs = await prisma.emailLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return res.status(200).json({
            success: true,
            message: `Email logs fetched successfully`,
            total: logs.length,
            data: logs,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};
