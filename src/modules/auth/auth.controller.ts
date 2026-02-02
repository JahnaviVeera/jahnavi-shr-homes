import type { Request, Response, NextFunction } from "express";
const authServices = require("./auth.services");

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
exports.adminLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const result = await authServices.adminLogin(email, password);

        return res.status(200).json({
            success: result.success,
            message: result.message,
            token: result.token,
            email: result.email,
            role: result.role
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
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "user123"
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
 *                   example: "user"
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
exports.userLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const result = await authServices.userLogin(email, password);

        return res.status(200).json({
            success: result.success,
            message: result.message,
            token: result.token,
            email: result.email,
            role: result.role,
            userId: result.userId
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
exports.supervisorLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        // console.log(email, password);
        const result = await authServices.supervisorLogin(email, password);

        return res.status(200).json({
            success: result.success,
            message: result.message,
            token: result.token,
            email: result.email,
            role: result.role,
            userId: result.userId
        });
    } catch (error) {
        next(error);
    }
};

