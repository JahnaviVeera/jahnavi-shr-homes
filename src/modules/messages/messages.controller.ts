import type { Request, Response } from "express";
import prisma from "../../config/prisma.client";
const MessageServices = require("./messages.services");
import { sendEmail } from '../../email/emailService';
import { adminCustomerMessageEmail } from '../../email/templates/admin/customerMessage';
import { adminSupervisorMessageEmail } from '../../email/templates/admin/supervisorMessage';
import { supervisorMessageReceivedEmail } from '../../email/templates/supervisor/messageReceived';

interface AuthenticatedRequest extends Request {
    user?: {
        userId?: string;
        email: string;
        role: string;
    };
}

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Message management
 */

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["message", "receiverId"]
 *             properties:
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               receiverId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the recipient.
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional ID of the message being replied to (Required for customers).
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { subject, message, receiverId, projectId, parentId } = req.body;

        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Resolve Sender ID
        let senderId = req.user.userId;
        if (!senderId) {
            // If admin or otherwise missing ID, lookup by email
            const user = await prisma.user.findFirst({ where: { email: req.user.email } });
            if (!user) {
                return res.status(404).json({ success: false, message: "Sender user not found in database" });
            }
            senderId = user.userId;
        }

        // Logic for Customer (user role) sending new message (no receiverId generally expected from UI, or ignored)
        // We need to send to BOTH Admin and Supervisor
        if (req.user.role === 'customer' || req.user.role === 'user') {
            // If it's a reply (has parentId), standard logic applies (receiver is already determined by parent)
            // Only apply dual-send if it is a NEW message (no parentId)
            if (!parentId) {
                if (!projectId) {
                    return res.status(400).json({ success: false, message: "Project ID is required for sending new messages." });
                }

                // 1. Get Admin ID
                const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
                if (!admin) {
                    return res.status(500).json({ success: false, message: "Admin not found to forward message." });
                }

                // 2. Get Supervisor's User ID from Project
                const project = await prisma.project.findUnique({
                    where: { projectId },
                    select: {
                        supervisor: {
                            select: { userId: true }
                        }
                    }
                });

                if (!project) {
                    return res.status(404).json({ success: false, message: "Project not found." });
                }

                // 3. Send to Admin
                const msgToAdmin = await MessageServices.createMessage({
                    subject,
                    message,
                    senderId,
                    senderRole: req.user.role,
                    receiverId: admin.userId,
                    projectId,
                    parentId: null
                });

                // Email Admin: customer sent a message
                const senderUser = await prisma.user.findUnique({ where: { userId: senderId } });
                sendEmail({
                    to: admin.email,
                    subject: `New Message from ${senderUser?.userName || 'Customer'} – ShrHomies`,
                    html: adminCustomerMessageEmail({
                        customerName: senderUser?.userName || 'Customer',
                        message,
                        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080'
                    })
                });

                // 4. Send to Supervisor (if exists)
                if (project.supervisor?.userId) {
                    await MessageServices.createMessage({
                        subject,
                        message,
                        senderId,
                        senderRole: req.user.role,
                        receiverId: project.supervisor.userId,
                        projectId,
                        parentId: null
                    });

                    // Email Supervisor: customer sent a message
                    const supervisorUser = await prisma.user.findUnique({ where: { userId: project.supervisor.userId } });
                    if (supervisorUser?.email) {
                        sendEmail({
                            to: supervisorUser.email,
                            subject: `New Message from ${senderUser?.userName || 'Customer'} – ShrHomies`,
                            html: supervisorMessageReceivedEmail({
                                supervisorName: supervisorUser.userName || 'Supervisor',
                                senderName: senderUser?.userName || 'Customer',
                                senderRole: 'customer',
                                message,
                                frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080'
                            })
                        });
                    }
                }

                return res.status(201).json({
                    success: true,
                    message: "Message sent to Admin and Supervisor successfully",
                    data: msgToAdmin // Return one of them as response
                });
            }
        }

        // Default logic for non-customers or replies
        const newMessage = await MessageServices.createMessage({
            subject,
            message,
            senderId,
            senderRole: req.user.role,
            receiverId,
            projectId,
            parentId
        });

        // Email notifications for supervisor <-> admin messages
        if (receiverId) {
            const receiver = await prisma.user.findUnique({ where: { userId: receiverId } });
            const senderInfo = await prisma.user.findUnique({ where: { userId: senderId! } });

            if (receiver && senderInfo) {
                // Supervisor messaging Admin
                if (req.user.role === 'supervisor' && receiver.role === 'admin') {
                    sendEmail({
                        to: receiver.email,
                        subject: `New Message from ${senderInfo.userName || 'Supervisor'} – ShrHomies`,
                        html: adminSupervisorMessageEmail({
                            supervisorName: senderInfo.userName || 'Supervisor',
                            message,
                            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080'
                        })
                    });
                }
                // Admin messaging Supervisor
                else if (req.user.role === 'admin' && receiver.role === 'supervisor') {
                    sendEmail({
                        to: receiver.email,
                        subject: `New Message from Admin – ShrHomies`,
                        html: supervisorMessageReceivedEmail({
                            supervisorName: receiver.userName || 'Supervisor',
                            senderName: senderInfo.userName || 'Admin',
                            senderRole: 'admin',
                            message,
                            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080'
                        })
                    });
                }
            }
        }

        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: newMessage
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get my messages (inbox and sent)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of messages
 */
export const getMyMessages = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Resolve User ID
        let userId = req.user.userId;
        if (!userId) {
            const user = await prisma.user.findFirst({ where: { email: req.user.email } });
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
            userId = user.userId;
        }

        const messages = await MessageServices.getMessagesForUser(userId);

        return res.status(200).json({
            success: true,
            message: "Messages fetched successfully",
            data: messages
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/messages/project/{projectId}:
 *   get:
 *     summary: Get messages for a project
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of messages
 */
export const getMessagesByProject = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const messages = await MessageServices.getMessagesByProject(projectId);

        return res.status(200).json({
            success: true,
            message: "Project messages fetched successfully",
            data: messages
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/messages/{messageId}/read:
 *   patch:
 *     summary: Mark message as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message marked as read
 */
export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params;
        const updatedMessage = await MessageServices.markMessageAsRead(messageId);

        return res.status(200).json({
            success: true,
            message: "Message marked as read",
            data: updatedMessage
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/messages/unread/count:
 *   get:
 *     summary: Get count of unread messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Count of unread messages
 */
export const getUnreadCount = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Resolve User ID
        let userId = req.user.userId;
        if (!userId) {
            const user = await prisma.user.findFirst({ where: { email: req.user.email } });
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
            userId = user.userId;
        }

        const count = await MessageServices.getUnreadCount(userId);

        return res.status(200).json({
            success: true,
            message: "Unread count fetched",
            data: { count }
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/messages/{messageId}/reply:
 *   post:
 *     summary: Reply to a specific message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the message to reply to.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["message"]
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reply sent successfully
 *       404:
 *         description: Original message not found
 */
export const replyToMessage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const messageId = req.params.messageId as string;
        const { message } = req.body;

        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // 1. Fetch parent message to get context (receiver and project)
        const parentMessage = await prisma.message.findUnique({
            where: { messageId }
        });

        if (!parentMessage) {
            return res.status(404).json({ success: false, message: "Original message not found" });
        }

        // 2. Resolve Sender ID (Current logged in user)
        let senderId = req.user.userId;
        if (!senderId) {
            const user = await prisma.user.findFirst({ where: { email: req.user.email } });
            if (!user) {
                return res.status(404).json({ success: false, message: "Sender user not found" });
            }
            senderId = user.userId;
        }

        // 3. Determine Receiver (The other person in the conversation)
        const receiverId = (senderId === parentMessage.senderId)
            ? parentMessage.receiverId
            : parentMessage.senderId;

        // 4. Create the reply via service
        const newMessage = await MessageServices.createMessage({
            subject: parentMessage.subject ? `Re: ${parentMessage.subject}` : undefined,
            message,
            senderId,
            senderRole: req.user.role,
            receiverId,
            projectId: parentMessage.projectId || undefined,
            parentId: messageId
        });

        return res.status(201).json({
            success: true,
            message: "Reply sent successfully",
            data: newMessage
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};
