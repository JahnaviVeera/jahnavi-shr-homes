import { config } from "dotenv";
import path from "path";

// Load environment variables from the correct path
config({ path: path.resolve(__dirname, "src/config/.env") });

import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: "postgresql://postgres:FEPNVAXUKupqkwZCKbDKdCkyWNgrWLLP@caboose.proxy.rlwy.net:58514/railway",
    },
});
