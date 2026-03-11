import SocketService from "../../services/socket.service";
import prisma from "../../config/prisma.client";


interface SendMessagePayload {
    receiverId: string;
    message: string;
    subject?: string;
    projectId?: string;
}

interface MarkAsReadPayload {
    messageId: string;
}

class ChatGateway {
    private socketService: SocketService;

    constructor() {
        this.socketService = SocketService.getInstance();
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        const io = this.socketService.getIO();

        io.on("connection", (socket: any) => {
            // Handle sending messages
            socket.on("send_message", async (data: SendMessagePayload) => {
                try {
                    const senderId = socket.user?.userId;

                    if (!senderId) {
                        socket.emit("error", { message: "Unauthorized" });
                        return;
                    }

                    // Save message to database
                    const messageData: any = {
                        senderId,
                        receiverId: data.receiverId,
                        message: data.message,
                        isRead: false,
                    };

                    if (data.subject) {
                        messageData.subject = data.subject;
                    }

                    if (data.projectId) {
                        messageData.projectId = data.projectId;
                    }

                    const newMessage = await prisma.message.create({
                        data: messageData,
                    });

                    // Emit to receiver
                    this.socketService.emitToUser(data.receiverId, "receive_message", {
                        messageId: newMessage.messageId,
                        senderId: newMessage.senderId,
                        message: newMessage.message,
                        subject: newMessage.subject,
                        projectId: newMessage.projectId,
                        createdAt: newMessage.createdAt,
                        isRead: newMessage.isRead,
                    });

                    // Check if receiver is online
                    const isReceiverOnline = await this.socketService.isUserOnline(data.receiverId);

                    if (!isReceiverOnline) {
                        // Send notification if receiver is offline
                        await this.createNotification(
                            data.receiverId,
                            `New message from ${socket.user?.email || "User"}`,
                            "NEW_MESSAGE"
                        );
                    }

                    // Send acknowledgment to sender
                    socket.emit("message_sent", {
                        messageId: newMessage.messageId,
                        status: "success",
                    });

                    // Also emit notification event to receiver
                    this.socketService.emitToUser(data.receiverId, "notification", {
                        type: "NEW_MESSAGE",
                        message: `New message from ${socket.user?.email || "User"}`,
                        messageId: newMessage.messageId,
                    });
                } catch (error) {
                    console.error("Error sending message:", error);
                    socket.emit("error", { message: "Failed to send message" });
                }
            });

            // Handle marking messages as read
            socket.on("mark_as_read", async (data: MarkAsReadPayload) => {
                try {
                    const userId = socket.user?.userId;

                    if (!userId) {
                        socket.emit("error", { message: "Unauthorized" });
                        return;
                    }

                    await prisma.message.update({
                        where: {
                            messageId: data.messageId,
                            receiverId: userId,
                        },
                        data: {
                            isRead: true,
                        },
                    });

                    socket.emit("message_read", {
                        messageId: data.messageId,
                        status: "success",
                    });
                } catch (error) {
                    console.error("Error marking message as read:", error);
                    socket.emit("error", { message: "Failed to mark message as read" });
                }
            });

            // Handle getting unread message count
            socket.on("get_unread_count", async () => {
                try {
                    const userId = socket.user?.userId;

                    if (!userId) {
                        socket.emit("error", { message: "Unauthorized" });
                        return;
                    }

                    const unreadCount = await prisma.message.count({
                        where: {
                            receiverId: userId,
                            isRead: false,
                        },
                    });

                    socket.emit("unread_count", { count: unreadCount });
                } catch (error) {
                    console.error("Error getting unread count:", error);
                    socket.emit("error", { message: "Failed to get unread count" });
                }
            });
        });
    }

    private async createNotification(userId: string, message: string, type: string) {
        try {
            await prisma.notification.create({
                data: {
                    userId,
                    message,
                    type,
                    isRead: false,
                },
            });
        } catch (error) {
            console.error("Error creating notification:", error);
        }
    }
}

export default ChatGateway;
