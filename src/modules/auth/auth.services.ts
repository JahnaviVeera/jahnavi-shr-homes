import Prisma from "../../config/prisma.client";
import * as bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { generateAdminToken, generateUserToken, generateRefreshToken, verifyToken } from "../../utils/jwt";
import logger from "../../utils/logger";
import { AppError } from "../../utils/AppError";

export const adminLogin = async (email: string, password: string) => {
    try {
        // 1. Initial Validation & Trimming
        const trimmedEmail = email ? email.trim() : "";
        const trimmedPassword = password ? password.trim() : "";

        logger.debug(`[adminLogin] Attempting login for email: "${trimmedEmail}"`);

        if (!trimmedEmail || !trimmedPassword) {
            throw new AppError(400, "Invalid email or password");
        }

        // 2. Database Lookup (Directly targeting Admin role)
        // We filter by role here to avoid getting a non-admin user with the same email
        let user = await Prisma.user.findFirst({
            where: {
                email: { equals: trimmedEmail, mode: 'insensitive' },
                role: UserRole.admin
            },
            select: {
                userId: true,
                userName: true,
                email: true,
                password: true,
                role: true,
                contact: true,
                companyName: true
            }
        });

        if (!user) {
            logger.warn(`[adminLogin] User search failed for email: ${trimmedEmail}. User not found.`);
            throw new AppError(401, "Invalid email or password");
        }

        // 3. Password Verification
        logger.debug(`[adminLogin] User found in DB. ID: ${user.userId}`);

        if (!user.password) {
            logger.warn(`[adminLogin] User has no password set.`);
            throw new AppError(500, "Admin user exists but has no password set. Please contact support.");
        }

        const isPasswordValid = await bcrypt.compare(trimmedPassword, user.password);

        if (!isPasswordValid) {
            logger.warn(`[adminLogin] Password validation failed for user: ${user.email}`);
            throw new AppError(401, "Invalid email or password");
        }

        // 4. Success
        const accessToken = generateAdminToken(user.userId, user.email);
        const refreshToken = generateRefreshToken(user.userId);

        // Store Refresh Token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await Prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.userId,
                expiresAt
            }
        });

        logger.info(`[adminLogin] Login successful for: ${user.email}`);

        return {
            success: true,
            message: "Login successful",
            accessToken,
            refreshToken,
            email: user.email,
            role: "admin",
            userId: user.userId
        };
    } catch (error) {
        console.log(error);
    }
};

/**
 * User login (for users and supervisors)
 * @param email - User email
 * @param password - User password
 * @returns Login result with token
 */
export const userLogin = async (email: string, password: string) => {
    // 1. Initial Validation & Trimming
    const trimmedEmail = email ? email.trim() : "";
    const trimmedPassword = password ? password.trim() : "";

    if (!trimmedEmail) throw new AppError(400, "Email is required");
    if (!trimmedPassword) throw new AppError(400, "Password is required");

    // 2. Database Lookup
    const user = await Prisma.user.findFirst({
        where: {
            email: { equals: trimmedEmail, mode: 'insensitive' },
            role: UserRole.customer
        },
        select: {
            userId: true,
            userName: true,
            email: true,
            password: true,
            role: true
        }
    });

    if (!user) {
        throw new AppError(401, "Invalid email or password");
    }

    // 3. Password Verification
    if (!user.password) {
        throw new AppError(401, "Password not set for this account. Please contact administrator.");
    }

    const isPasswordValid = await bcrypt.compare(trimmedPassword, user.password);
    if (!isPasswordValid) {
        throw new AppError(401, "Invalid email or password");
    }

    // 4. Success
    const accessToken = generateUserToken(user.userId, user.email, user.role);
    const refreshToken = generateRefreshToken(user.userId);

    // Store Refresh Token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.userId,
            expiresAt
        }
    });

    return {
        success: true,
        message: "Login successful",
        accessToken,
        refreshToken,
        email: user.email,
        role: user.role,
        userId: user.userId
    };
};

/**
 * Supervisor login (for supervisors only)
 * @param email - Supervisor email
 * @param password - Supervisor password
 * @returns Login result with token
 */
export const supervisorLogin = async (email: string, password: string) => {

    console.log(password);
    // 1. Initial Validation & Trimming
    const trimmedEmail = email ? email.trim() : "";
    const trimmedPassword = password ? password.trim() : "";

    if (!trimmedEmail) throw new AppError(400, "Email is required");
    if (!trimmedPassword) throw new AppError(400, "Password is required");

    // 2. Database Lookup
    // Search by email first to debug role mismatch issues
    const user = await Prisma.user.findFirst({
        where: {
            email: { equals: trimmedEmail, mode: 'insensitive' },
            // Removed strict role filter here to check if user exists at all
        },
        select: {
            userId: true,
            userName: true,
            email: true,
            password: true,
            role: true
        }
    });
    console.log(user);

    if (!user) {

        throw new AppError(401, "Invalid email or password");
    }

    // Verify Role Manually
    if (user.role !== UserRole.supervisor) {
        throw new AppError(401, "Invalid email or password");
    }
    console.log(user.password);
    // 3. Password Verification
    if (!user.password) {
        throw new AppError(401, "Password not set for this supervisor. Please contact administrator.");
    }

    const isPasswordValid = await bcrypt.compare(trimmedPassword, user.password);
    if (!isPasswordValid) {
        throw new AppError(401, "Invalid email or password");
    }
    // 4. Success
    const accessToken = generateUserToken(user.userId, user.email, user.role);
    const refreshToken = generateRefreshToken(user.userId);

    // Store Refresh Token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.userId,
            expiresAt
        }
    });

    return {
        success: true,
        message: "Supervisor login successful",
        accessToken,
        refreshToken,
        email: user.email,
        role: user.role,
        userId: user.userId
    };
};

/**
 * Logout Service
 * Add token to blacklist to prevent further use
 * @param token - JWT token to blacklist
 * @param expiresAt - Expiration date of the token
 */
export const logout = async (token: string, expiresAt: Date) => {
    try {
        await Prisma.tokenBlacklist.create({
            data: {
                token,
                expiresAt
            }
        });

        return {
            success: true,
            message: "Logged out successfully"
        };
    } catch (error) {
        // If token already blacklisted, still return success
        return {
            success: true,
            message: "Logged out successfully"
        };
    }
};

export const refreshAccessToken = async (incomingRefreshToken: string) => {
    // 1. Verify signature
    const decoded = verifyToken(incomingRefreshToken);
    if (!decoded) {
        throw new AppError(401, "Invalid refresh token");
    }

    // 2. Find in DB
    const storedToken = await Prisma.refreshToken.findUnique({
        where: { token: incomingRefreshToken },
        include: { user: true }
    });

    if (!storedToken) {
        throw new AppError(401, "Invalid refresh token (not found)");
    }

    // 3. Check expiry (DB)
    if (new Date() > storedToken.expiresAt) {
        await Prisma.refreshToken.delete({ where: { id: storedToken.id } });
        throw new AppError(403, "Refresh token expired");
    }

    // 4. Token Rotation: Delete used token
    await Prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // 5. Generate new tokens
    const { userId, email, role } = storedToken.user;

    let newAccessToken;
    if (role === 'admin') {
        newAccessToken = generateAdminToken(userId, email);
    } else {
        newAccessToken = generateUserToken(userId, email, role as string);
    }

    const newRefreshToken = generateRefreshToken(userId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Prisma.refreshToken.create({
        data: {
            token: newRefreshToken,
            userId,
            expiresAt
        }
    });

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };
};
