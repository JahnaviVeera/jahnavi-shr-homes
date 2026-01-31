import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { authorizeSocket } from "../middleware/socket.auth";

interface UserSocket extends Socket {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}

class SocketService {
    private static instance: SocketService;
    private io: SocketIOServer | null = null;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public init(server: HTTPServer): void {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "*",
                methods: ["GET", "POST"],
                credentials: true,
            },
        });

        // Apply authentication middleware
        this.io.use(authorizeSocket);

        // Handle connections
        this.io.on("connection", (socket: UserSocket) => {
            console.log(`User connected: ${socket.user?.userId} (${socket.user?.role})`);

            // Join user to their personal room
            if (socket.user?.userId) {
                socket.join(`user_${socket.user.userId}`);

                // Join role-based room
                if (socket.user.role) {
                    socket.join(`role_${socket.user.role}`);
                }
            }

            // Handle joining conversation rooms
            socket.on("join_conversation", (data: { conversationId: string }) => {
                socket.join(`conversation_${data.conversationId}`);
                console.log(`User ${socket.user?.userId} joined conversation ${data.conversationId}`);
            });

            // Handle leaving conversation rooms
            socket.on("leave_conversation", (data: { conversationId: string }) => {
                socket.leave(`conversation_${data.conversationId}`);
                console.log(`User ${socket.user?.userId} left conversation ${data.conversationId}`);
            });

            // Handle disconnect
            socket.on("disconnect", () => {
                console.log(`User disconnected: ${socket.user?.userId}`);
            });
        });

        console.log("Socket.io initialized successfully");
    }

    public getIO(): SocketIOServer {
        if (!this.io) {
            throw new Error("Socket.io not initialized. Call init() first.");
        }
        return this.io;
    }

    /**
     * Emit event to a specific user
     */
    public emitToUser(userId: string, event: string, data: any): void {
        if (!this.io) {
            console.warn("Socket.io not initialized");
            return;
        }
        this.io.to(`user_${userId}`).emit(event, data);
    }

    /**
     * Emit event to all users with a specific role
     */
    public emitToRole(role: string, event: string, data: any): void {
        if (!this.io) {
            console.warn("Socket.io not initialized");
            return;
        }
        this.io.to(`role_${role}`).emit(event, data);
    }

    /**
     * Emit event to a specific conversation room
     */
    public emitToConversation(conversationId: string, event: string, data: any): void {
        if (!this.io) {
            console.warn("Socket.io not initialized");
            return;
        }
        this.io.to(`conversation_${conversationId}`).emit(event, data);
    }

    /**
     * Check if a user is currently connected
     */
    public async isUserOnline(userId: string): Promise<boolean> {
        if (!this.io) {
            return false;
        }
        const sockets = await this.io.in(`user_${userId}`).fetchSockets();
        return sockets.length > 0;
    }

    /**
     * Check if a user is in a specific conversation room
     */
    public async isUserInConversation(userId: string, conversationId: string): Promise<boolean> {
        if (!this.io) {
            return false;
        }
        const sockets = await this.io.in(`conversation_${conversationId}`).fetchSockets();
        return sockets.some((socket: any) => socket.user?.userId === userId);
    }
}

export default SocketService;
