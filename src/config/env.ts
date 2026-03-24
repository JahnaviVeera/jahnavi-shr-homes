import { config as dotenvConfig } from "dotenv";
import path from "path";

// Try to load .env from the root first, then from the config folder as a backup
const rootEnv = path.join(process.cwd(), ".env");
const configEnv = path.join(process.cwd(), "src", "config", ".env");

if (require('fs').existsSync(rootEnv)) {
    dotenvConfig({ path: rootEnv });
} else if (require('fs').existsSync(configEnv)) {
    dotenvConfig({ path: configEnv });
} else {
    // If neither exists, just call it normally (might rely on system env vars)
    dotenvConfig();
}

interface Config {
    PORT: number;
    DATABASE_URL: string;
    DATABASE_PUBLIC_URL: string | undefined;
    JWT_SECRET: string;
    JWT_EXPIRY: string;
    ADMIN_EMAIL: string;
    ADMIN_PASSWORD: string | undefined;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    NODE_ENV: string;
}

const requiredEnvVars = [
    "DATABASE_URL",
    "JWT_SECRET",
    "ADMIN_EMAIL",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Environment variable ${envVar} is missing`);
    }
}

export const config: Config = {
    PORT: parseInt(process.env.PORT || "3000", 10),
    DATABASE_URL: process.env.DATABASE_URL!,
    DATABASE_PUBLIC_URL: process.env.DATABASE_PUBLIC_URL,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRY: process.env.JWT_EXPIRY || "24h",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL!,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    NODE_ENV: process.env.NODE_ENV || "development"
};
