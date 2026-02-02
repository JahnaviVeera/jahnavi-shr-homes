import type { Request, Response } from "express";
import prisma from "../../config/prisma.client";
const NotificationServices = require("./notifications.services");

interface RequestWithUser extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    }
}

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications for logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *         description: Filter by unread status (true for unread only, false/omitted for all)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by notification message or type
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 */
// GET /api/notifications
exports.getNotifications = async (req: RequestWithUser, res: Response) => {
    try {
        let userId = req.user?.userId;
        if (!userId && req.user?.email) {
            const user = await prisma.user.findFirst({ where: { email: { equals: req.user.email, mode: 'insensitive' } } });
            userId = user?.userId;
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const unreadOnly = req.query.unreadOnly === 'true';
        const isRead = unreadOnly ? false : undefined;
        const search = req.query.search as string;

        const notifications = await NotificationServices.getNotifications(userId, isRead, search);

        return res.status(200).json({
            success: true,
            message: "Notifications fetched successfully",
            data: notifications
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

// GET /api/notifications/unread-count
/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get count of unread notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 */
exports.getUnreadCount = async (req: RequestWithUser, res: Response) => {
    try {
        let userId = req.user?.userId;
        if (!userId && req.user?.email) {
            const user = await prisma.user.findFirst({ where: { email: { equals: req.user.email, mode: 'insensitive' } } });
            userId = user?.userId;
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await NotificationServices.getUnreadCount(userId);

        return res.status(200).json({
            success: true,
            message: "Unread count fetched successfully",
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

// PATCH /api/notifications/:notificationId/read
/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
exports.markAsRead = async (req: RequestWithUser, res: Response) => {
    try {
        let userId = req.user?.userId;
        if (!userId && req.user?.email) {
            const user = await prisma.user.findFirst({ where: { email: { equals: req.user.email, mode: 'insensitive' } } });
            userId = user?.userId;
        }

        const notificationId = req.params.notificationId as string;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const notification = await NotificationServices.markAsRead(notificationId, userId);

        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
            data: notification
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

// PATCH /api/notifications/mark-all-read
/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
exports.markAllAsRead = async (req: RequestWithUser, res: Response) => {
    try {
        let userId = req.user?.userId;
        if (!userId && req.user?.email) {
            const user = await prisma.user.findFirst({ where: { email: { equals: req.user.email, mode: 'insensitive' } } });
            userId = user?.userId;
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await NotificationServices.markAllAsRead(userId);

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read",
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};
