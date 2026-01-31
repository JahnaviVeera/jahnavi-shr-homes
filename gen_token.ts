import { generateAdminToken } from "./src/utils/jwt";
import { config } from "./src/config/env";

const token = generateAdminToken("admin-id", "admin@example.com");
console.log(token);
