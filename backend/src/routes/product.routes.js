import { Router } from 'express';
import {
  getProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  updatePrice,
  updateStock,
  deleteProduct,
  getMyProducts,
  getLowStockProducts,
} from '../controllers/product.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { uploadProductImages } from '../middleware/upload.middleware.js';
import { validate, validateQuery } from '../middleware/validate.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  updatePriceSchema,
  updateStockSchema,
  productQuerySchema,
} from '../validators/product.validator.js';

const router = Router();

// Public routes
router.get('/', validateQuery(productQuerySchema), getProducts);
router.get('/slug/:slug', getProductBySlug);

// Supplier protected routes - placed before parameterized route to prevent cast errors
router.get('/my-products', authenticate, authorize('supplier'), getMyProducts);
router.get('/low-stock', authenticate, authorize('supplier'), getLowStockProducts);

router.get('/:id', getProduct);

// Supplier protected write/delete routes
router.use(authenticate, authorize('supplier'));

router.post('/', uploadProductImages, validate(createProductSchema), createProduct);
router.put('/:id', uploadProductImages, validate(updateProductSchema), updateProduct);
router.patch('/:id/price', validate(updatePriceSchema), updatePrice);
router.patch('/:id/stock', validate(updateStockSchema), updateStock);
router.delete('/:id', deleteProduct);

export default router;
