import { Request, Response, NextFunction } from "express";
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
 * Authorizes based on allowed roles.
 * Usage: authorizeRoles('admin', 'supervisor')
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError(401, "User not authenticated"));
        }

        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(`[AuthMiddleware] Access denied for user ${req.user.email} (Role: ${req.user.role}). Required: ${allowedRoles.join(", ")}`);
            return next(new AppError(403, "Access denied. Insufficient privileges."));
        }

        next();
    };
};
