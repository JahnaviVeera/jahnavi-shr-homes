import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Robust environment variable loading
const envPaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "src/config/.env"),
    path.resolve(__dirname, "config/.env"), // Relative to compiled JS
];

for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`Loaded environment from: ${envPath}`);
        break;
    }
}

import http from "http";
import app from "./app";
import SocketService from "./services/socket.service";
import ChatGateway from "./modules/chat/chat.gateway";

async function startServer() {
    try {
        const port = process.env.PORT || 3000;

        // Create HTTP server
        const httpServer = http.createServer(app);

        // Initialize Socket.io
        const socketService = SocketService.getInstance();
        socketService.init(httpServer);

        // Start listening
        httpServer.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            console.log(`WebSocket server is ready`);
        });
    } catch (error) {
        console.log("Failed to start server", error);
        process.exit(1);
    }
}
startServer();
