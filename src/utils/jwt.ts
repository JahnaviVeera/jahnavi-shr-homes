import dotenv from "dotenv";
import jwt, { SignOptions } from "jsonwebtoken";

// Ensure dotenv is loaded before accessing environment variables
dotenv.config({ path: "./src/config/.env" });

interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}

/**
 * Generate JWT token for admin
 * @param userId - Admin user ID
 * @param email - Admin email
 * @returns JWT token string
 */
export const generateAdminToken = (userId: string, email: string): string => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const payload: TokenPayload = {
        userId,
        email,
        role: "admin"
    };

    const expiresIn = process.env.JWT_EXPIRY || "24h"; // Default 24 hours

    const signOptions: SignOptions = { expiresIn: expiresIn as any };
    return jwt.sign(payload, secret, signOptions);
};

/**
 * Generate JWT token for user or supervisor
 * @param userId - User or Supervisor ID
 * @param email - User email
 * @param role - User role ("user" or "supervisor")
 * @returns JWT token string
 */
export const generateUserToken = (userId: string, email: string, role: string): string => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }

    if (role !== "customer" && role !== "supervisor") {
        throw new Error("Invalid role. Must be 'customer' or 'supervisor'");
    }

    const payload: TokenPayload = {
        userId,
        email,
        role
    };

    const expiresIn = process.env.JWT_EXPIRY || "24h"; // Default 24 hours

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

