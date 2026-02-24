import { Router } from 'express';
import { getEmailLogs } from './emailLogs.controller';

const router = Router();

// GET /api/email-logs  — get all email logs (latest first)
// optional query: ?status=failed&limit=20
router.get('/', getEmailLogs);

export default router;
