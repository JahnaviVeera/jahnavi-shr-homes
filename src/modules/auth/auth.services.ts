import Prisma from "../../config/prisma.client";
import * as bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { generateAdminToken, generateUserToken } from "../../utils/jwt";
import logger from "../../utils/logger";
import { AppError } from "../../utils/AppError";

export const adminLogin = async (email: string, password: string) => {
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
    const token = generateAdminToken(user.userId, user.email);
    logger.info(`[adminLogin] Login successful for: ${user.email}`);

    return {
        success: true,
        message: "Login successful",
        token,
        email: user.email,
        role: "admin",
        userId: user.userId
    };
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
            role: UserRole.user
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
    const token = generateUserToken(user.userId, user.email, user.role);
    return {
        success: true,
        message: "Login successful",
        token,
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

    if (!user) {

        throw new AppError(401, "Invalid email or password");
    }

    // Verify Role Manually
    if (user.role !== UserRole.supervisor) {
        throw new AppError(401, "Invalid email or password");
    }

    // 3. Password Verification
    if (!user.password) {
        throw new AppError(401, "Password not set for this supervisor. Please contact administrator.");
    }

    const isPasswordValid = await bcrypt.compare(trimmedPassword, user.password);
    if (!isPasswordValid) {
        throw new AppError(401, "Invalid email or password");
    }
    // 4. Success
    const token = generateUserToken(user.userId, user.email, user.role);
    return {
        success: true,
        message: "Supervisor login successful",
        token,
        email: user.email,
        role: user.role,
        userId: user.userId
    };
};
