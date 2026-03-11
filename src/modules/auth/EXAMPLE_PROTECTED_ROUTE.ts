/**
 * EXAMPLE: How to protect routes with admin authentication
 * 
 * This file shows examples of protecting routes with admin middleware.
 * Copy the pattern to your actual route files.
 */

const express = require("express");
const router = express.Router();
const adminAuthMiddleware = require("../../middleware/adminAuth.middleware");

// ============================================
// EXAMPLE 1: Protect a single route
// ============================================
// router.post("/create", adminAuthMiddleware, YourController.createMethod);

// ============================================
// EXAMPLE 2: Protect multiple routes at once
// ============================================
// router.use(adminAuthMiddleware); // All routes below this line are protected
// router.post("/create", YourController.createMethod);
// router.put("/update/:id", YourController.updateMethod);
// router.delete("/delete/:id", YourController.deleteMethod);

// ============================================
// EXAMPLE 3: Mix protected and public routes
// ============================================
// Public route (no middleware)
// router.get("/public", YourController.getPublicData);

// Protected routes (with middleware)
// router.post("/admin-create", adminAuthMiddleware, YourController.adminCreate);
// router.put("/admin-update/:id", adminAuthMiddleware, YourController.adminUpdate);
// router.delete("/admin-delete/:id", adminAuthMiddleware, YourController.adminDelete);

// ============================================
// EXAMPLE 4: Access admin info in controller
// ============================================
/*
exports.yourProtectedMethod = async (req: any, res: Response) => {
    try {
        // Access authenticated admin information
        const adminEmail = req.user.email;  // e.g., "admin@example.com"
        const adminRole = req.user.role;    // e.g., "admin"
        
        // Your protected logic here
        // Only admins can reach this code
        
        return res.status(200).json({
            success: true,
            message: "Operation successful",
            admin: adminEmail
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};
*/

module.exports = router;


