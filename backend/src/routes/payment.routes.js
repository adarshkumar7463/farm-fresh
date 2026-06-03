import { Router } from 'express';
import { verifyPayment, handleWebhook } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();

router.post('/verify', authenticate, authorize('buyer'), verifyPayment);
router.post('/webhook', handleWebhook);

export default router;
