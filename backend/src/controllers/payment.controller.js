import PaymentService from '../services/payment.service.js';
import Order from '../models/Order.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createActivityLog } from '../utils/helpers.js';
import { PAYMENT_STATUS } from '../utils/constants.js';

// @desc    Verify Razorpay online payment signature
// @route   POST /api/v1/payments/verify
// @access  Private (Buyer)
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const order = await Order.findOne({ 'payment.razorpayOrderId': razorpayOrderId });
  if (!order) {
    throw ApiError.notFound('Order associated with this payment not found');
  }

  const payment = await PaymentService.processPayment(
    { razorpayOrderId, razorpayPaymentId, razorpaySignature },
    order,
    req.user,
    req.ip
  );

  await createActivityLog(req.user._id, 'payment_complete', `Verified online payment for order ${order.orderNumber}`, req, {
    type: 'payment',
    id: payment._id,
  });

  res.status(200).json(ApiResponse.success({ payment }, 'Payment verified successfully'));
});

// @desc    Razorpay Webhook for async status synchronization
// @route   POST /api/v1/payments/webhook
// @access  Public
export const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw ApiError.internal('Webhook secret configuration missing');
  }

  const isValid = PaymentService.verifyPaymentSignature(
    JSON.stringify(req.body),
    signature,
    webhookSecret
  );

  if (!isValid) {
    throw ApiError.badRequest('Invalid webhook signature');
  }

  const event = req.body.event;
  const payload = req.body.payload;

  if (event === 'payment.captured') {
    const razorpayPaymentId = payload.payment.entity.id;
    const razorpayOrderId = payload.payment.entity.order_id;

    const order = await Order.findOne({ 'payment.razorpayOrderId': razorpayOrderId });
    if (order && order.payment.status !== PAYMENT_STATUS.COMPLETED) {
      order.payment.status = PAYMENT_STATUS.COMPLETED;
      order.payment.razorpayPaymentId = razorpayPaymentId;
      order.payment.paidAmount = order.pricing.total;
      order.payment.paidAt = new Date();
      await order.save();
    }
  }

  res.status(200).json(ApiResponse.success(null, 'Webhook processed'));
});
