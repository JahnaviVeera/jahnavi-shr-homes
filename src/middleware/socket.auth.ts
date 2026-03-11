import { Socket } from "socket.io";
import jwt from "jsonwebtoken";

interface DecodedToken {
    userId: string;
    email: string;
    role: string;
}

export const authorizeSocket = async (socket: Socket, next: (err?: Error) => void) => {
    try {
        // Try to get token from query params or auth header
        const token = socket.handshake.auth.token || socket.handshake.query.token as string;

        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as DecodedToken;

        // Attach user info to socket
        (socket as any).user = decoded;

        next();
    } catch (error) {
        console.error("Socket authentication error:", error);
        next(new Error("Authentication error: Invalid token"));
    }
};
