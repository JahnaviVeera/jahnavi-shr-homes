import dotenv from "dotenv";
import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import path from "path";

// Ensure environment variables are loaded from project root
dotenv.config({ path: path.join(process.cwd(), ".env") });

interface TokenPayload {
    userId: string;
    email: string;
    role: string;
    fullName: string;
    tokenVersion: number;
}

/**
 * Generate Refresh Token (Opaque)
 * @returns Opaque refresh token string
 */
export const generateRefreshToken = (): string => {
    return crypto.randomBytes(40).toString("hex");
};

/**
 * Generate JWT token for admin
 * @param userId - Admin user ID
 * @param email - Admin email
 * @param fullName - Admin full name
 * @param tokenVersion - Current token version from DB
 * @returns JWT token string
 */
export const generateAdminToken = (userId: string, email: string, fullName: string, tokenVersion: number): string => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const payload: TokenPayload = {
        userId,
        email,
        role: "admin",
        fullName,
        tokenVersion
    };

    const expiresIn = process.env.JWT_ACCESS_EXPIRY || "15m";

    const signOptions: SignOptions = { expiresIn: expiresIn as any };
    return jwt.sign(payload, secret, signOptions);
};

/**
 * Generate JWT token for user or supervisor
 * @param userId - User or Supervisor ID
 * @param email - User email
 * @param role - User role ("customer", "supervisor", "accountant")
 * @param fullName - User full name
 * @param tokenVersion - Current token version from DB
 * @returns JWT token string
 */
export const generateUserToken = (userId: string, email: string, role: string, fullName: string, tokenVersion: number): string => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }

    // Role validation
    const validRoles = ["customer", "supervisor", "accountant", "admin"];
    if (!validRoles.includes(role)) {
        throw new Error(`Invalid role: ${role}. Must be one of ${validRoles.join(", ")}`);
    }

    const payload: TokenPayload = {
        userId,
        email,
        role,
        fullName,
        tokenVersion
    };

    const expiresIn = process.env.JWT_ACCESS_EXPIRY || "15m";

    const signOptions: SignOptions = { expiresIn: expiresIn as any };
    return jwt.sign(payload, secret, signOptions);
};

/**
 * Verify JWT token
 * @param token - JWT token string
 * @returns Decoded token payload or null if invalid
 */
export const verifyToken = (token: string): TokenPayload | null => {
    try {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }

        const decoded = jwt.verify(token, secret) as TokenPayload;
        return decoded;
    } catch (error) {
        return null;
    }
};

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value (e.g., "Bearer <token>")
 * @returns Token string or null
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return null;
    }

    return parts[1] ?? null;
};
