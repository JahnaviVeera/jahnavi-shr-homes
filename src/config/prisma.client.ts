import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "./env";
import logger from "../utils/logger";

const connectionString = config.DATABASE_PUBLIC_URL || config.DATABASE_URL;

const pool = new Pool({
    connectionString,
    max: 15, // Slightly more conservative than 20 to avoid exhausting Railway limits
    idleTimeoutMillis: 30000, // 30 seconds (half of Railway's 60s proxy timeout)
    connectionTimeoutMillis: 20000, // 20 seconds (more time for network latency)
    maxUses: 1000, // Regularly rotate connections to prevent stale ones
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
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

