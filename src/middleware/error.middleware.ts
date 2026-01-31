import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        logger.warn(`[AppError] ${err.statusCode} - ${err.message}`);
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    // Handle invalid JSON payload
    if (err instanceof SyntaxError && 'body' in err) {
        logger.warn(`[SyntaxError] Invalid JSON payload: ${err.message}`);
        return res.status(400).json({
            success: false,
            message: "Invalid JSON payload provided. Please check for syntax errors."
        });
    }

    // Generic/Unknown Error
    logger.error(`[Unhandled Error] ${err.message}`, { stack: err.stack });

    return res.status(500).json({
        success: false,
        message: 'Internal Server Error',
    });
};
