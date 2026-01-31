import { generateAdminToken } from "./src/utils/jwt";

async function test() {
    const token = generateAdminToken("22183718-ec4a-4c1f-9415-9bb04476abf7", "admin@example.com");
    console.log("Generated token, calling API...");
    try {
        const response = await fetch("http://localhost:3000/api/user", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (error: any) {
        console.error("Error calling API:", error.message);
    }
}
test();
