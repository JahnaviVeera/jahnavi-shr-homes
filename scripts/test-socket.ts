
import { io } from "socket.io-client";

const URL = "http://localhost:3000";

async function main() {
    const token = process.argv[2];

    if (!token) {
        console.log("Usage: npx ts-node scripts/test-socket.ts <JWT_TOKEN>");
        console.log("Please provide a valid JWT token to authenticate.");
        process.exit(1);
    }

    console.log(`Connecting to ${URL} with token...`);

    const socket = io(URL, {
        auth: {
            token: token
        },
        reconnection: false
    });

    socket.on("connect", () => {
        console.log("✅ Connected to WebSocket server!");
        console.log(`Socket ID: ${socket.id}`);
        console.log("Listening for events...");
    });

    socket.on("connect_error", (err) => {
        console.error("❌ Connection error:", err.message);
        process.exit(1);
    });

    socket.on("disconnect", (reason) => {
        console.log("❌ Disconnected:", reason);
    });

    // Listen for notification events
    socket.on("notification", (data) => {
        console.log("\n🔔 [NOTIFICATION] received:");
        console.log(JSON.stringify(data, null, 2));
    });

    // Chat events
    socket.on("receive_message", (data) => {
        console.log("\n💬 [CHAT] Message received:");
        console.log(JSON.stringify(data, null, 2));
    });

    // Admin specific events (if logged in as admin)
    const adminEvents = [
        "project_created",
        "project_updated",
        "payment_created",
        "daily_update_created",
        "daily_update_status",
        "quotation_status"
    ];

    adminEvents.forEach(event => {
        socket.on(event, (data) => {
            console.log(`\n👮 [ADMIN EVENT] ${event}:`);
            console.log(JSON.stringify(data, null, 2));
        });
    });

    // General/Other events
    const otherEvents = [
        "payment_received", // legacy/redundant?
        "daily_update_approval", // legacy?
        "quotation_approval", // legacy?
    ];
    otherEvents.forEach(event => {
        socket.on(event, (data) => {
            console.log(`\n📢 [EVENT] ${event}:`);
            console.log(JSON.stringify(data, null, 2));
        });
    });

    // Handle unexpected errors preventing exit
    process.on('SIGINT', () => {
        console.log("\nClosing connection...");
        socket.disconnect();
        process.exit(0);
    });
}

main();
