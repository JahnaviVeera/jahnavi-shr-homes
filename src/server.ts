import { config } from "./config/env";
// Removed redundant dotenv loading logic as it's handled in config/env.ts

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
