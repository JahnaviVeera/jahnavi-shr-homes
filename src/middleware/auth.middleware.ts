import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";
import Prisma from "../config/prisma.client";

interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
        fullName: string;
    };
}

/**
 * Validates the JWT token and populates req.user
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Strictly use accessToken from cookies
        const token = req.cookies?.accessToken;

        console.log(`[AuthMiddleware] Path: ${req.path}, Token found: ${!!token}`);

        if (!token) {
            return next(new AppError(401, "Authentication required"));
        }

        const decoded = verifyToken(token);

        if (!decoded) {
            return next(new AppError(401, "Invalid or expired token"));
        }

        // Fetch user from database to check token version and status
        const user = await Prisma.user.findUnique({
            where: { userId: decoded.userId },
            select: { userId: true, tokenVersion: true }
        });

        if (!user) {
            return next(new AppError(401, "User no longer exists"));
        }

        // Compare token version in JWT with the one in DB
        // If they don't match, it means the password was changed or session was invalidated
        if (decoded.tokenVersion !== user.tokenVersion) {
            return next(new AppError(401, "Session invalidated. Please log in again."));
        }

        // Check if token is blacklisted (kept the existing check for specific token logouts)
        const isBlacklisted = await Prisma.tokenBlacklist.findUnique({
            where: { token }
        });

        if (isBlacklisted) {
            return next(new AppError(401, "Token has been invalidated. Please log in again."));
        }

        // Attach user info to request object
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            fullName: decoded.fullName
        };

        next();
    } catch (error) {
        logger.error(`[AuthMiddleware] Error: ${error}`);
        return next(new AppError(401, "Authentication failed"));
    }
};

export * from "./authorization.middleware";

