import type { Request, Response, NextFunction } from "express";
import * as authServices from "./auth.services";
import jwt from "jsonwebtoken";

/**
 * @swagger
 * /api/auth/admin/login:
 *   post:
 *     summary: Admin login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["email", "password"]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "admin123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   example: "admin"
 *       400:
 *         description: Bad request - Invalid credentials or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        console.log(`[Login] Request from Origin: ${req.headers.origin}`);
        const result = await authServices.adminLogin(email, password);

        // Set cookies
        console.log(`[AdminLogin] Setting cookies for user: ${result.email}`);
        const isProduction = process.env.NODE_ENV === 'development';

        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: true, // Must be false for local http://
            sameSite: 'none',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: true, // Must be false for local http://
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        return res.status(200).json({
            success: result.success,
            message: result.message,
            user: {
                id: result.userId,
                role: result.role,
                username: result.userName
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/auth/user/login:
 *   post:
 *     summary: User login (for regular users only)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["email", "password"]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "customer@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "customer123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   example: "customer"
 *                 userId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Bad request - Invalid credentials or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const result = await authServices.userLogin(email, password);

        // Set cookies
        console.log(`[UserLogin] Setting cookies for user: ${result.email}`);
        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: true, // Must be false for local http://
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: true, // Must be false for local http://
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        return res.status(200).json({
            success: result.success,
            message: result.message,
            user: {
                id: result.userId,
                role: result.role,
                username: result.userName
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/auth/supervisor/login:
 *   post:
 *     summary: Supervisor login (for supervisors only)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["email", "password"]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "supervisor@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "supervisor123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   example: "supervisor"
 *                 userId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Bad request - Invalid credentials or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid credentials or access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const supervisorLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        // console.log(email, password);
        const result = await authServices.supervisorLogin(email, password);

        // Set cookies
        console.log(`[SupervisorLogin] Setting cookies for user: ${result.email}`);
        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: isProduction, // Must be false for local http://
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: isProduction, // Must be false for local http://
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        return res.status(200).json({
            success: result.success,
            message: result.message,
            user: {
                id: result.userId,
                role: result.role,
                username: result.userName
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.accessToken;

        if (!token) {
            // Also need to clear cookies even if token is not found/expired
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');

            return res.status(200).json({
                success: true,
                message: "Logged out successfully"
            });
        }

        const decoded: any = jwt.decode(token);
        const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

        const result = await authServices.logout(token, expiresAt);

        // Clear cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        return res.status(200).json({
            success: result.success,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh Access Token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["refreshToken"]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refresh successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token
 */
export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token is missing"
            });
        }

        const result = await authServices.refreshAccessToken(refreshToken);

        // Set new cookies
        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('accessToken', result.newAccessToken, {
            httpOnly: true,
            secure: isProduction, // Must be false for local http://
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', result.newRefreshToken, {
            httpOnly: true,
            secure: isProduction, // Must be false for local http://
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        return res.status(200).json({
            success: true
        });
    } catch (error) {
        next(error);
    }
};
