import prisma from "../../config/prisma.client";
// import { Message } from "@prisma/client"; // Will be available after generate

export const createMessage = async (data: {
    subject?: string;
    message: string;
    senderId: string;
    senderRole?: string;
    receiverId: string;
    projectId?: string;
    parentId?: string;
}) => {
    if (!data.message) {
        throw new Error("Message content is required");
    }
    if (!data.senderId || !data.receiverId) {
        throw new Error("Sender and Receiver IDs are required");
    }

    // Role-based restriction: Customers can only reply (must have parentId)
    // Assuming 'user' role is for customers.
    if (data.senderRole === 'user' && !data.parentId) {
        throw new Error("Customers can only reply to existing messages initiated by supervisors.");
    }

    const createData: any = {
        subject: data.subject || null,
        message: data.message,
        senderId: data.senderId,
        receiverId: data.receiverId,
        isRead: false,
    };

    if (data.projectId) {
        createData.project = { connect: { projectId: data.projectId } };
    }

    if (data.parentId) {
        createData.parent = { connect: { messageId: data.parentId } };
    }

    const newMessage = await prisma.message.create({
        data: createData,
        include: {
            project: {
                select: {
                    projectName: true
                }
            },
            parent: true // Optional: return parent info
        }
    });

    return newMessage;
};

export const getMessagesForUser = async (userId: string) => {
    if (!userId) {
        throw new Error("User ID is required");
    }

    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: userId },
                { receiverId: userId }
            ]
        },
        orderBy: {
            createdAt: "desc"
        },
        include: {
            project: {
                select: {
                    projectName: true,
                    projectId: true
                }
            }
        }
    });

    return messages;
};

export const getMessagesByProject = async (projectId: string) => {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    const messages = await prisma.message.findMany({
        where: {
            projectId: projectId
        },
        orderBy: {
            createdAt: "desc"
        }
    });

    return messages;
};

export const markMessageAsRead = async (messageId: string) => {
    if (!messageId) {
        throw new Error("Message ID is required");
    }

    const message = await prisma.message.findUnique({
        where: { messageId }
    });

    if (!message) {
        throw new Error("Message not found");
    }

    const updatedMessage = await prisma.message.update({
        where: { messageId },
        data: { isRead: true }
    });

    return updatedMessage;
};

// Helper to get total unread count for a user
export const getUnreadCount = async (userId: string) => {
    const count = await prisma.message.count({
        where: {
            receiverId: userId,
            isRead: false
        }
    });
    return count;
};

