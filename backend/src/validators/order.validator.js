import Joi from 'joi';
import { PAYMENT_METHODS, ORDER_STATUS } from '../utils/constants.js';

export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().hex().length(24).required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'Order must contain at least one item',
      'any.required': 'Order items are required',
    }),
  deliveryAddress: Joi.object({
    label: Joi.string(),
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().default('India'),
    landmark: Joi.string(),
    contactName: Joi.string(),
    contactPhone: Joi.string().pattern(/^[6-9]\d{9}$/),
  }).required(),
  billingAddress: Joi.object({
    sameAsDelivery: Joi.boolean().default(true),
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    postalCode: Joi.string(),
    country: Joi.string(),
  }),
  paymentMethod: Joi.string()
    .valid(...Object.values(PAYMENT_METHODS))
    .required()
    .messages({
      'any.only': `Payment method must be one of: ${Object.values(PAYMENT_METHODS).join(', ')}`,
      'any.required': 'Payment method is required',
    }),
  delivery: Joi.object({
    expectedDate: Joi.date().greater('now'),
    slot: Joi.object({
      start: Joi.string(),
      end: Joi.string(),
    }),
    instructions: Joi.string().max(500),
  }),
  notes: Joi.object({
    buyer: Joi.string().max(500),
  }),
  couponCode: Joi.string().uppercase().trim(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(ORDER_STATUS))
    .required()
    .messages({
      'any.only': `Status must be one of: ${Object.values(ORDER_STATUS).join(', ')}`,
      'any.required': 'Status is required',
    }),
  note: Joi.string().max(500),
});

export const cancelOrderSchema = Joi.object({
  reason: Joi.string().max(500).required().messages({
    'any.required': 'Cancellation reason is required',
  }),
});

export const orderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('createdAt', '-createdAt', 'total', '-total').default('-createdAt'),
  status: Joi.string().valid(...Object.values(ORDER_STATUS)),
  paymentStatus: Joi.string().valid('pending', 'completed', 'failed'),
  startDate: Joi.date(),
  endDate: Joi.date().greater(Joi.ref('startDate')),
  search: Joi.string().trim(),
});
