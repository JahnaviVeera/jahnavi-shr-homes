import prisma from "../../config/prisma.client";
import { notifyUser } from "../notifications/notifications.services";
import SocketService from "../../services/socket.service";

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

    // Role-based restriction removed to allow customers to initiate messages
    // if (data.senderRole === 'user' && !data.parentId) {
    //     throw new Error("Customers can only reply to existing messages initiated by supervisors.");
    // }

    const createData: any = {
        subject: data.subject || null,
        message: data.message,
        senderId: data.senderId,
        receiverId: data.receiverId,
        projectId: data.projectId || null,
        parentId: data.parentId || null,
        isRead: false,
    };

    const newMessage = await prisma.message.create({
        data: createData,
        include: {
            project: {
                select: {
                    projectName: true
                }
            },
            parent: {
                include: {
                    sender: {
                        select: {
                            userName: true,
                            role: true
                        }
                    },
                    receiver: {
                        select: {
                            userName: true,
                            role: true
                        }
                    }
                }
            },
            sender: {
                select: {
                    userName: true,
                    role: true
                }
            },
            receiver: {
                select: {
                    userName: true,
                    role: true
                }
            }
        }
    });

    // Notify the receiver
    try {
        const senderName = newMessage.sender?.userName || "Someone";
        const notifyMessage = `New message from ${senderName}: ${data.message.substring(0, 30)}${data.message.length > 30 ? "..." : ""}`;

        await notifyUser(data.receiverId, notifyMessage, "message");

        // Send real-time update via Socket.io
        const socketService = SocketService.getInstance();
        socketService.emitToUser(data.receiverId, "receive_message", newMessage); // 'receive_message' event for chat
        socketService.emitToUser(data.receiverId, "notification", { message: notifyMessage, type: "message" }); // General notification

    } catch (err) {
        console.error("Failed to send notification/socket event:", err);
        // Don't fail the request if notification fails, just log it
    }

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
            },
            parent: {
                include: {
                    sender: {
                        select: {
                            userName: true,
                            role: true
                        }
                    },
                    receiver: {
                        select: {
                            userName: true,
                            role: true
                        }
                    }
                }
            }, // Include parent message info
            sender: {
                select: {
                    userName: true,
                    role: true
                }
            },
            receiver: {
                select: {
                    userName: true,
                    role: true
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
        },
        include: {
            project: {
                select: {
                    projectName: true,
                    projectId: true
                }
            },
            parent: {
                include: {
                    sender: {
                        select: {
                            userName: true,
                            role: true
                        }
                    },
                    receiver: {
                        select: {
                            userName: true,
                            role: true
                        }
                    }
                }
            },
            sender: {
                select: {
                    userName: true,
                    role: true
                }
            },
            receiver: {
                select: {
                    userName: true,
                    role: true
                }
            }
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

