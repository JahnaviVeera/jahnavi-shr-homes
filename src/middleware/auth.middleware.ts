import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";

interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}

/**
 * Validates the JWT token and populates req.user
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        let token = extractTokenFromHeader(authHeader);

        // Fallback: Check query parameter (useful for downloads or simple browser testing)
        if (!token && req.query.token && typeof req.query.token === 'string') {
            token = req.query.token;
        }

        if (!token) {
            return next(new AppError(401, "Authorization token is required"));
        }

        const decoded = verifyToken(token);

        if (!decoded) {
            return next(new AppError(401, "Invalid or expired token"));
        }

        // Attach user info to request object
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (error) {
        logger.error(`[AuthMiddleware] Error: ${error}`);
        return next(new AppError(401, "Authentication failed"));
    }
};

export * from "./authorization.middleware";

