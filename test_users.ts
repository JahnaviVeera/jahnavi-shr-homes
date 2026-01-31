import { getAllUsers } from "./src/modules/user/user.services";

async function test() {
    try {
        console.log("Starting test...");
        const users = await getAllUsers();
        console.log("Users fetched:", users.length);
        console.log(JSON.stringify(users, null, 2));
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

test();
