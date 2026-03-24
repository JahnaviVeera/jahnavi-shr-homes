import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "./env";
import logger from "../utils/logger";

const connectionString = config.DATABASE_PUBLIC_URL || config.DATABASE_URL;

if (!connectionString) {
    logger.error("DATABASE_URL or DATABASE_PUBLIC_URL is missing in environment variables.");
    throw new Error("Missing database connection string");
}

const pool = new Pool({
    connectionString,
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
    maxUses: 1000,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
    // TCP Keepalive to keep the connection alive through proxy/firewalls
    // Note: These properties might need @ts-ignore if using older @types/pg
    // @ts-ignore
    keepalives: true,
    // @ts-ignore
    keepalives_idle: 60 
});

// Explicit error handling for the pool to debug connection issues
pool.on('error', (err) => {
    // Railway proxy (and other clouds) often close idle connections after a minute.
    // The pool should generally handle this, but we log it for clarity.
    if (err.message && (err.message.includes('terminated unexpectedly') || err.message.includes('closed by the server'))) {
        logger.warn(`PG Pool: Idle connection closed by host (normal behavior). Message: ${err.message}`);
    } else {
        logger.error('PG Pool Error:', err.message);
    }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ 
    adapter,
    log: ['error', 'warn'] // Reduced log noise for production-like server
});

export default prisma;

