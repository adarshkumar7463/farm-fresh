import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  downloadInvoice,
} from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('buyer'), createOrder);
router.get('/', getOrders);
router.get('/:id', getOrder);
router.patch('/:id/status', authorize('supplier'), updateOrderStatus);
router.post('/:id/cancel', cancelOrder);
router.get('/:id/invoice', downloadInvoice);

export default router;
