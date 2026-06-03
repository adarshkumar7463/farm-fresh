import { Router } from 'express';
import {
  getSupplierDashboard,
  getBuyerDashboard,
  getPredictions,
  getSuggestions,
  getCustomerSpendingAnalysis,
} from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/supplier', authorize('supplier'), getSupplierDashboard);
router.get('/buyer', authorize('buyer'), getBuyerDashboard);
router.get('/predictions', authorize('supplier'), getPredictions);
router.get('/suggestions', authorize('supplier'), getSuggestions);
router.get('/customers', authorize('supplier'), getCustomerSpendingAnalysis);

export default router;
