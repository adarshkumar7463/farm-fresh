import Joi from 'joi';
import { PRODUCT_UNITS } from '../utils/constants.js';

export const createProductSchema = Joi.object({
  name: Joi.string().trim().max(100).required().messages({
    'string.max': 'Product name cannot exceed 100 characters',
    'any.required': 'Product name is required',
  }),
  description: Joi.string().max(2000).messages({
    'string.max': 'Description cannot exceed 2000 characters',
  }),
  shortDescription: Joi.string().max(200).messages({
    'string.max': 'Short description cannot exceed 200 characters',
  }),
  category: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid category ID',
    'string.length': 'Invalid category ID',
    'any.required': 'Category is required',
  }),
  price: Joi.number().positive().required().messages({
    'number.positive': 'Price must be a positive number',
    'any.required': 'Price is required',
  }),
  compareAtPrice: Joi.number().positive().messages({
    'number.positive': 'Compare at price must be a positive number',
  }),
  costPrice: Joi.number().min(0).messages({
    'number.min': 'Cost price cannot be negative',
  }),
  unit: Joi.string().valid(...Object.values(PRODUCT_UNITS)).required().messages({
    'any.only': `Unit must be one of: ${Object.values(PRODUCT_UNITS).join(', ')}`,
    'any.required': 'Unit is required',
  }),
  minOrderQuantity: Joi.number().integer().min(1).default(1).messages({
    'number.min': 'Minimum order quantity must be at least 1',
  }),
  maxOrderQuantity: Joi.number().integer().min(1).messages({
    'number.min': 'Maximum order quantity must be at least 1',
  }),
  stock: Joi.object({
    quantity: Joi.number().integer().min(0).default(0),
    lowStockThreshold: Joi.number().integer().min(0).default(10),
    trackInventory: Joi.boolean().default(true),
    allowBackorder: Joi.boolean().default(false),
  }),
  discount: Joi.object({
    type: Joi.string().valid('percentage', 'fixed'),
    value: Joi.number().min(0),
    startDate: Joi.date(),
    endDate: Joi.date().greater(Joi.ref('startDate')),
    isActive: Joi.boolean().default(false),
  }),
  specifications: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      value: Joi.string().required(),
    })
  ),
  tags: Joi.array().items(Joi.string().trim().lowercase()),
  origin: Joi.string(),
  shelfLife: Joi.string(),
  storageInstructions: Joi.string(),
  nutritionalInfo: Joi.object({
    calories: Joi.number().min(0),
    protein: Joi.number().min(0),
    carbohydrates: Joi.number().min(0),
    fat: Joi.number().min(0),
    fiber: Joi.number().min(0),
  }),
  certifications: Joi.array().items(Joi.string()),
  isOrganic: Joi.boolean().default(false),
  isSeasonal: Joi.boolean().default(false),
  seasonalAvailability: Joi.object({
    startMonth: Joi.number().min(1).max(12),
    endMonth: Joi.number().min(1).max(12),
  }),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
  barcode: Joi.string(),
  sku: Joi.string(),
});

export const updateProductSchema = createProductSchema.fork(
  ['name', 'category', 'price', 'unit'],
  (schema) => schema.optional()
);

export const updatePriceSchema = Joi.object({
  price: Joi.number().positive().required().messages({
    'number.positive': 'Price must be a positive number',
    'any.required': 'Price is required',
  }),
  compareAtPrice: Joi.number().positive(),
});

export const updateStockSchema = Joi.object({
  quantity: Joi.number().integer().min(0).required().messages({
    'number.min': 'Quantity cannot be negative',
    'any.required': 'Quantity is required',
  }),
  operation: Joi.string().valid('set', 'add', 'subtract').default('set'),
});

export const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('price', '-price', 'name', '-name', 'createdAt', '-createdAt', 'salesCount', '-salesCount').default('-createdAt'),
  search: Joi.string().trim(),
  category: Joi.string().hex().length(24),
  supplier: Joi.string().hex().length(24),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  inStock: Joi.boolean(),
  isOrganic: Joi.boolean(),
  isFeatured: Joi.boolean(),
  tags: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
});
