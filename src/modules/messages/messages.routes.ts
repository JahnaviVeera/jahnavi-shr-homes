const express = require("express");
const router = express.Router();
const MessagesController = require("./messages.controller");
const { authenticate, authorizeRoles } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Messages
 *     description: Messaging system endpoints
 */

// Apply auth middleware to all routes
// Only customers and supervisors can access messages
router.use(authenticate, authorizeRoles("user", "supervisor"));

// POST - Send a message
router.post("/", MessagesController.sendMessage);

// POST - Reply to a message
router.post("/:messageId/reply", MessagesController.replyToMessage);

// GET - Get my messages
router.get("/", MessagesController.getMyMessages);

// GET - Get unread count
router.get("/unread/count", MessagesController.getUnreadCount);

// GET - Get messages by project
router.get("/project/:projectId", MessagesController.getMessagesByProject);

// PATCH - Mark as read
router.patch("/:messageId/read", MessagesController.markAsRead);

export default router;
