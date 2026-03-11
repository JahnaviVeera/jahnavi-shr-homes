import prisma from "../../config/prisma.client";

// Get notifications for a user (with optional read status filter and search)
export const getNotifications = async (userId: string, isRead?: boolean, search?: string) => {
    const whereClause: any = { userId };

    if (isRead !== undefined) {
        whereClause.isRead = isRead;
    }

    if (search) {
        whereClause.OR = [
            { message: { contains: search, mode: 'insensitive' } },
            { type: { contains: search, mode: 'insensitive' } }
        ];
    }

    const notifications = await prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" }
    });

    return notifications;
};

// Count unread notifications
export const getUnreadCount = async (userId: string) => {
    const count = await prisma.notification.count({
        where: {
            userId,
            isRead: false
        }
    });

    return { count };
};

// Mark a notification as read
export const markAsRead = async (notificationId: string, userId: string) => {
    // Verify ownership
    const notification = await prisma.notification.findUnique({
        where: { notificationId }
    });

    if (!notification) {
        throw new Error("Notification not found");
    }

    if (notification.userId.toLowerCase() !== userId.toLowerCase()) {
        throw new Error("Unauthorized access to notification");
    }

    const updatedNotification = await prisma.notification.update({
        where: { notificationId },
        data: { isRead: true }
    });

    return updatedNotification;
};

// Mark all notifications as read for a user
export const markAllAsRead = async (userId: string) => {
    const result = await prisma.notification.updateMany({
        where: {
            userId,
            isRead: false
        },
        data: { isRead: true }
    });

    return { count: result.count, message: "All notifications marked as read" };
};

// Internal service to create notification (for use by other modules)
export const createNotification = async (userId: string, message: string, type?: string, referenceId?: string) => {
    const notification = await prisma.notification.create({
        data: {
            userId,
            message,
            type: type || null,
            referenceId: referenceId || null
        }
    });
    return notification;
};

// Notify all admins
export const notifyAdmins = async (message: string, type?: string) => {
    // Find all admins
    const admins = await prisma.user.findMany({
        where: { role: "admin" } // Using string "admin" to match UserRole enum if mapped, or direct literal
    });

    if (admins.length === 0) return;

    // Create notifications for all admins
    // Using Promise.all for parallel execution
    await Promise.all(admins.map(admin =>
        prisma.notification.create({
            data: {
                userId: admin.userId,
                message,
                type: type || null
            }
        })
    ));
};

// Wrapper for notifying a specific user
export const notifyUser = async (userId: string, message: string, type?: string, referenceId?: string) => {
    return await createNotification(userId, message, type, referenceId);
};
