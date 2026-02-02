import type { Request, Response, NextFunction } from "express";
const UserServices = require("./user.services");

/**
 * @swagger
 * /api/user:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - User already exists or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       403:
 *         description: Forbidden - Admin privileges required
 */
//POST
exports.createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userData = await UserServices.createUser(req.body);

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            data: userData,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/user/{userId}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
//GETBYID
exports.getuserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId
        const user = await UserServices.getUserById(userId);

        return res.status(200).json({
            success: true,
            message: "User fetched successfully",
            data: user
        })
    } catch (error) {
        next(error);
    }

}

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
//GETALL
exports.getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await UserServices.getAllUsers();
        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: users
        })

    } catch (error) {
        next(error);
    }
}

/**
 * @swagger
 * /api/user/{userId}:
 *   put:
 *     summary: Update a user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *                 maxLength: 255
 *                 example: "John Doe"
 *               role:
 *                 type: string
 *                 enum: ["admin", "customer", "supervisor"]
 *                 example: "customer"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 maxLength: 255
 *                 example: "NewPassword123!"
 *                 description: Password (will be hashed automatically)
 *               contact:
 *                 type: string
 *                 maxLength: 15
 *                 example: "9876543210"
 *               estimatedInvestment:
 *                 type: number
 *                 format: decimal
 *                 example: 50000.00
 *                 description: Estimated investment amount (optional)
 *               notes:
 *                 type: string
 *                 example: "Additional notes about the user"
 *                 description: Notes about the user (optional)
 *               companyName:
 *                 type: string
 *                 maxLength: 255
 *                 example: "ABC Construction Ltd"
 *                 description: Company name (optional)

 *
 *               timezone:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Asia/Kolkata"
 *                 description: User timezone preference (optional)
 *               currency:
 *                 type: string
 *                 maxLength: 20
 *                 example: "INR"
 *                 description: User currency preference (optional)
 *               language:
 *                 type: string
 *                 maxLength: 50
 *                 example: "English"
 *                 description: User language preference (optional)
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - User not found or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       403:
 *         description: Forbidden - Admin privileges required
 */
//PUT
exports.updateUser = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;

        const updatedUserData = await UserServices.updateUser(userId, req.body);

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: updatedUserData
        })
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        })
    }
}

/**
 * @swagger
 * /api/user/{userId}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       403:
 *         description: Forbidden - Admin privileges required
 */
//DELETE
exports.deleteUser = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;

        const deletedUserData = await UserServices.deleteUser(userId);

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
            data: deletedUserData
        })
    } catch (error) {
        return res.status(404).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        })
    }
}

/**
 * @swagger
 * /api/user/{userId}/assign-supervisor:
 *   post:
 *     summary: Assign supervisor to a user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The user ID to assign supervisor to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["supervisorId"]
 *             properties:
 *               supervisorId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Supervisor assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - Validation error
 *       401:
 *         description: Unauthorized - Admin authentication required
 */
exports.assignSupervisor = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { supervisorId } = req.body;

        if (!supervisorId) {
            return res.status(400).json({
                success: false,
                message: "supervisorId is required"
            });
        }

        const updatedUser = await UserServices.assignSupervisor(userId, supervisorId);

        return res.status(200).json({
            success: true,
            message: "Supervisor assigned successfully",
            data: updatedUser
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/user/{userId}/remove-supervisor:
 *   delete:
 *     summary: Remove supervisor from a user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Supervisor removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized - Admin authentication required
 */
exports.removeSupervisor = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const updatedUser = await UserServices.removeSupervisor(userId);

        return res.status(200).json({
            success: true,
            message: "Supervisor removed successfully",
            data: updatedUser
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/user/supervisor/{supervisorId}:
 *   get:
 *     summary: Get all users assigned to a supervisor
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: supervisorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The supervisor's user ID
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 */
exports.getUsersBySupervisor = async (req: Request, res: Response) => {
    try {
        const { supervisorId } = req.params;

        const users = await UserServices.getUsersBySupervisor(supervisorId);

        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: users
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/user/supervisors/all:
 *   get:
 *     summary: Get all supervisors (users with role "supervisor")
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Supervisors fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 */
exports.getAllSupervisors = async (req: Request, res: Response) => {
    try {
        const supervisors = await UserServices.getAllSupervisors();

        return res.status(200).json({
            success: true,
            message: "Supervisors fetched successfully",
            data: supervisors
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/user/without-supervisor:
 *   get:
 *     summary: Get all users without a supervisor assigned (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users without supervisor fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Admin authentication required
 */
exports.getUsersWithoutSupervisor = async (req: Request, res: Response) => {
    try {
        const users = await UserServices.getUsersWithoutSupervisor();

        return res.status(200).json({
            success: true,
            message: "Users without supervisor fetched successfully",
            data: users
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/user/{userId}/approve-supervisor:
 *   post:
 *     summary: Approve supervisor for a user (Customer only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The user ID (must match authenticated customer's ID)
 *     responses:
 *       200:
 *         description: Supervisor approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       400:
 *         description: Bad request - User not found or supervisor not assigned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Customer authentication required
 *       403:
 *         description: Forbidden - Customer can only approve their own supervisor
 */
exports.approveSupervisor = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const authReq = req as any; // Type assertion for AuthRequest

        // Ensure customer can only approve their own supervisor
        if (authReq.user && authReq.user.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only approve your own supervisor."
            });
        }

        const supervisor = await UserServices.approveSupervisor(userId);

        return res.status(200).json({
            success: true,
            message: "Supervisor approved successfully",
            data: supervisor
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/user/{userId}/reject-supervisor:
 *   post:
 *     summary: Reject supervisor for a user (Customer only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The user ID (must match authenticated customer's ID)
 *     responses:
 *       200:
 *         description: Supervisor rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       400:
 *         description: Bad request - User not found or supervisor not assigned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Customer authentication required
 *       403:
 *         description: Forbidden - Customer can only reject their own supervisor
 */
exports.rejectSupervisor = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const authReq = req as any; // Type assertion for AuthRequest

        // Ensure customer can only reject their own supervisor
        if (authReq.user && authReq.user.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only reject your own supervisor."
            });
        }

        const supervisor = await UserServices.rejectSupervisor(userId);

        return res.status(200).json({
            success: true,
            message: "Supervisor rejected successfully",
            data: supervisor
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};
interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}

/**
 * @swagger
 * /api/user/admin/account-settings:
 *   get:
 *     summary: Get admin account settings (email, company, contact)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin account settings fetched successfully
 *       401:
 *         description: Unauthorized
 */
exports.getAdminAccountSettings = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const user = await UserServices.getUserById(userId);

        return res.status(200).json({
            success: true,
            message: "Admin account settings fetched successfully",
            data: {
                email: user.email,
                userName: user.userName,
                companyName: user.companyName,
                contact: user.contact
            }
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/user/admin/account-settings:
 *   put:
 *     summary: Update admin account settings (email, company, contact)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *               userName:
 *                 type: string
 *                 example: "Admin User"
 *               companyName:
 *                 type: string
 *                 example: "SHR Homes"
 *               contact:
 *                 type: string
 *                 example: "1234567890"
 *     responses:
 *       200:
 *         description: Admin account settings updated successfully
 *       401:
 *         description: Unauthorized
 */
exports.updateAdminAccountSettings = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Only allow updating account-related fields
        const { email, userName, companyName, contact } = req.body;
        const updateData: any = {};

        if (email !== undefined) updateData.email = email;
        if (userName !== undefined) updateData.userName = userName;
        if (companyName !== undefined) updateData.companyName = companyName;
        if (contact !== undefined) updateData.contact = contact;

        const updatedUser = await UserServices.updateUser(userId, updateData);

        return res.status(200).json({
            success: true,
            message: "Admin account settings updated successfully",
            data: {
                email: updatedUser.email,
                userName: updatedUser.userName,
                companyName: updatedUser.companyName,
                contact: updatedUser.contact
            }
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/user/admin/general-settings:
 *   get:
 *     summary: Get admin general settings (timezone, currency, language)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin general settings fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     timezone:
 *                       type: string
 *                       example: "UTC"
 *                     currency:
 *                       type: string
 *                       example: "USD"
 *                     language:
 *                       type: string
 *                       example: "English"
 *       401:
 *         description: Unauthorized
 */
exports.getAdminGeneralSettings = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const user = await UserServices.getUserById(userId);

        return res.status(200).json({
            success: true,
            message: "Admin general settings fetched successfully",
            data: {
                timezone: user.timezone,
                currency: user.currency,
                language: user.language
            }
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/user/admin/general-settings:
 *   put:
 *     summary: Update admin general settings (timezone, currency, language)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timezone:
 *                 type: string
 *                 example: "Eastern Time (ET)"
 *                 description: "Timezone preference for the admin"
 *               currency:
 *                 type: string
 *                 example: "USD ($)"
 *                 description: "Currency preference for the admin"
 *               language:
 *                 type: string
 *                 example: "English"
 *                 description: "Language preference for the admin"
 *     responses:
 *       200:
 *         description: Admin general settings updated successfully
 *       401:
 *         description: Unauthorized
 */
exports.updateAdminGeneralSettings = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Only allow updating general settings fields
        const { timezone, currency, language } = req.body;
        const updateData: any = {};

        if (timezone !== undefined) updateData.timezone = timezone;
        if (currency !== undefined) updateData.currency = currency;
        if (language !== undefined) updateData.language = language;

        const updatedUser = await UserServices.updateUser(userId, updateData);

        return res.status(200).json({
            success: true,
            message: "Admin general settings updated successfully",
            data: {
                timezone: updatedUser.timezone,
                currency: updatedUser.currency,
                language: updatedUser.language
            }
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/user/admin/change-password:
 *   post:
 *     summary: Change admin password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["currentPassword", "newPassword", "confirmNewPassword"]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmNewPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 */
exports.changeAdminPassword = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { currentPassword, newPassword, confirmNewPassword } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ success: false, message: "New passwords do not match" });
        }

        const result = await UserServices.changePassword(userId, currentPassword, newPassword);

        return res.status(200).json({
            success: true,
            message: result.message,
            data: {}
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Update own profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *               contact:
 *                 type: string
 *               companyName:
 *                 type: string
 *               notes:
 *                 type: string
 *               estimatedInvestment:
 *                 type: number
 *                 format: decimal
 *                 description: Estimated investment amount
 *               timezone:
 *                 type: string
 *                 description: Timezone preference
 *               currency:
 *                 type: string
 *                 description: Currency preference
 *               language:
 *                 type: string
 *                 description: Language preference
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
exports.updateUserProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Filter allowed fields to update
        const { userName, contact, companyName, notes } = req.body;
        const dataToUpdate = {
            userName,
            contact,
            companyName,
            notes
        };

        const updatedUser = await UserServices.updateUser(userId, dataToUpdate);

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * @swagger
 * /api/user/profile/change-password:
 *   post:
 *     summary: Change own password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["currentPassword", "newPassword", "confirmNewPassword"]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmNewPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 */
exports.changeUserPassword = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { currentPassword, newPassword, confirmNewPassword } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ success: false, message: "New passwords do not match" });
        }

        const result = await UserServices.changePassword(userId, currentPassword, newPassword);

        return res.status(200).json({
            success: true,
            message: result.message,
            data: {}
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

// Analytics methods moved to UserServices

// ... existing code ...

/**
 * @swagger
 * /api/user/leads/stats:
 *   get:
 *     summary: Get customer leads and closed customers stats
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats fetched successfully
 */
exports.getCustomerLeadsStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await UserServices.getCustomerLeadsStats();
        return res.status(200).json({
            success: true,
            message: "Customer leads stats fetched successfully",
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/user/leads/new:
 *   get:
 *     summary: Get list of new leads (Users with Inprogress or Planning projects)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: New leads fetched successfully
 */
exports.getNewLeads = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const leads = await UserServices.getNewLeadsList();
        return res.status(200).json({
            success: true,
            message: "New leads fetched successfully",
            data: leads
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/user/leads/closed:
 *   get:
 *     summary: Get list of closed customers (Users with Completed projects)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Closed customers fetched successfully
 */
exports.getClosedCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customers = await UserServices.getClosedCustomersList();
        return res.status(200).json({
            success: true,
            message: "Closed customers fetched successfully",
            data: customers
        });
    } catch (error) {
        next(error);
    }
};
