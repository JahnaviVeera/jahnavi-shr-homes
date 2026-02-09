import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt";
import prisma from "../config/prisma.client";

// Ensure dotenv is loaded before accessing environment variables
dotenv.config({ path: "./src/config/.env" });

interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}

/**
 * Admin authentication middleware
 * Verifies JWT token and ensures user has admin role
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */

export const adminAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        let token = extractTokenFromHeader(authHeader);

        // Fallback: Check cookies
        if (!token && req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authorization token is required. Please provide a valid Bearer token."
            });
        }

        // Verify token
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token. Please login again."
            });
        }

        // Check if user has admin role
        if (decoded.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin privileges required."
            });
        }

        // Fetch user from database to get userId
        const user = await prisma.user.findFirst({
            where: { email: decoded.email }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Admin user not found in database."
            });
        }

        // Attach user info to request object
        req.user = {
            userId: user.userId,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Authentication failed. Please login again."
        });
    }
};

