import Prisma from "../../config/prisma.client";
import * as bcrypt from "bcrypt";
import { UserRole, UserStatus } from "@prisma/client";
import { generateAdminToken, generateUserToken, generateRefreshToken } from "../../utils/jwt";
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
                companyName: true,
                status: true
            }
        });

        if (!user) {
            logger.warn(`[adminLogin] User search failed for email: ${trimmedEmail}. User not found.`);
            throw new AppError(401, "Invalid email or password");
        }

        // 3. Password Verification
        if (!user.password) {
            logger.warn(`[adminLogin] User has no password set.`);
            throw new AppError(500, "Admin user exists but has no password set. Please contact support.");
        }

        const isPasswordValid = await bcrypt.compare(trimmedPassword, user.password);

        if (!isPasswordValid) {
            logger.warn(`[adminLogin] Password validation failed for user: ${user.email}`);
            throw new AppError(401, "Invalid email or password");
        }

        if (user.status === UserStatus.Inactive) {
            throw new AppError(403, "Account is inactive. Please contact support.");
        }

        // 4. Success
        const accessToken = generateAdminToken(user.userId, user.email);
        const refreshToken = generateRefreshToken();

        // Store Refresh Token (30 days expiry)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

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
            userId: user.userId,
            userName: user.userName,
            status: user.status
        }
    } catch (error) {
        console.log(error);
        throw error;
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
            role: true,
            status: true
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

    if (user.status === UserStatus.Inactive) {
        throw new AppError(403, "Account is inactive. Please contact support.");
    }

    // 4. Success
    const accessToken = generateUserToken(user.userId, user.email, user.role);
    const refreshToken = generateRefreshToken();

    // Store Refresh Token (30 days expiry)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

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
        userId: user.userId,
        userName: user.userName,
        status: user.status
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
            role: true,
            status: true
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

    if (user.status === UserStatus.Inactive) {
        throw new AppError(403, "Account is inactive. Please contact support.");
    }

    // 4. Success
    const accessToken = generateUserToken(user.userId, user.email, user.role);
    const refreshToken = generateRefreshToken();

    // Store Refresh Token (30 days expiry)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

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
        userId: user.userId,
        userName: user.userName,
        status: user.status
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
    // 1. Find in DB (Opaque token validation)
    const storedToken = await Prisma.refreshToken.findUnique({
        where: { token: incomingRefreshToken },
        include: { user: true }
    });

    if (!storedToken) {
        throw new AppError(401, "Invalid refresh token");
    }

    if (storedToken.user.status === UserStatus.Inactive) {
        throw new AppError(403, "Account is inactive. Please contact support.");
    }

    // 2. Check expiry
    if (new Date() > storedToken.expiresAt) {
        await Prisma.refreshToken.delete({ where: { id: storedToken.id } });
        throw new AppError(403, "Refresh token expired");
    }

    // 3. Token Rotation: Delete used token
    await Prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // 4. Generate new tokens
    const { userId, email, role } = storedToken.user;

    let newAccessToken;
    if (role === 'admin') {
        newAccessToken = generateAdminToken(userId, email);
    } else {
        newAccessToken = generateUserToken(userId, email, role as string);
    }

    const newRefreshToken = generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await Prisma.refreshToken.create({
        data: {
            token: newRefreshToken,
            userId,
            expiresAt
        }
    });

    return {
        newAccessToken,
        newRefreshToken
    };
};

/**
 * Admin Signup
 * Create a new admin user
 */
export const adminSignup = async (data: {
    userName: string;
    email: string;
    password?: string;
    contact: string;
    companyName?: string;
}) => {
    // 1. Check if user exists
    const existingUser = await Prisma.user.findFirst({
        where: { email: data.email }
    });

    if (existingUser) {
        throw new AppError(400, "User already exists with this email");
    }

    // 2. Hash Password
    let hashedPassword = null;
    if (data.password && data.password.trim() !== "") {
        hashedPassword = await bcrypt.hash(data.password.trim(), 10);
    } else {
        throw new AppError(400, "Password is required for admin signup");
    }

    // 3. Create Admin User
    const newAdmin = await Prisma.user.create({
        data: {
            userName: data.userName,
            email: data.email,
            password: hashedPassword,
            role: UserRole.admin,
            contact: data.contact,
            companyName: data.companyName || "SHR Homes",
            status: UserStatus.Active,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });

    // 4. Generate Tokens (Auto-login)
    const accessToken = generateAdminToken(newAdmin.userId, newAdmin.email);
    const refreshToken = generateRefreshToken();

    // Store Refresh Token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await Prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: newAdmin.userId,
            expiresAt
        }
    });

    return {
        success: true,
        message: "Admin created successfully",
        accessToken,
        refreshToken,
        data: {
            userId: newAdmin.userId,
            userName: newAdmin.userName,
            email: newAdmin.email,
            role: newAdmin.role
        }
    };
};

/**
 * Clear Database
 * Truncate all tables
 */
export const clearDatabase = async () => {
    // Determine the order of deletion based on foreign key constraints
    // Child tables first, then parent tables.

    try {
        await Prisma.$transaction([
            // 1. Delete dependent tables
            Prisma.dailyUpdate.deleteMany(),
            Prisma.quotation.deleteMany(),
            Prisma.payment.deleteMany(),
            Prisma.expense.deleteMany(),
            Prisma.material.deleteMany(),
            Prisma.document.deleteMany(),
            Prisma.message.deleteMany(),
            Prisma.notification.deleteMany(),
            Prisma.refreshToken.deleteMany(),
            Prisma.tokenBlacklist.deleteMany(),

            // 2. Delete main tables
            Prisma.project.deleteMany(),
            Prisma.supervisor.deleteMany(),

            // 3. Delete users (top-level)
            Prisma.user.deleteMany(),
        ]);

        return { success: true, message: "All database data cleared successfully." };
    } catch (error) {
        throw new AppError(500, `Failed to clear database: ${error instanceof Error ? error.message : String(error)}`);
    }
};
