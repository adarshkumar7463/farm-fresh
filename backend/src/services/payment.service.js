import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment.model.js';
import Order from '../models/Order.model.js';
import ApiError from '../utils/ApiError.js';
import { PAYMENT_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';

class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
    });
  }

  async createRazorpayOrder(order) {
    try {
      const options = {
        amount: Math.round(order.pricing.total * 100), // Amount in paise
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
        },
      };

      const razorpayOrder = await this.razorpay.orders.create(options);

      // Update order with Razorpay order ID
      order.payment.razorpayOrderId = razorpayOrder.id;
      await order.save();

      return {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      };
    } catch (error) {
      logger.error('Razorpay order creation error:', error);
      throw ApiError.internal('Failed to create payment order');
    }
  }

  verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature) {
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  async processPayment(paymentData, order, user, ipAddress) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;

    // Verify signature
    const isValid = this.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      throw ApiError.badRequest('Invalid payment signature');
    }

    // Fetch payment details from Razorpay
    const razorpayPayment = await this.razorpay.payments.fetch(razorpayPaymentId);

    // Create payment record
    const payment = await Payment.create({
      order: order._id,
      buyer: user._id,
      supplier: order.supplier,
      amount: order.pricing.total,
      currency: 'INR',
      method: 'online',
      status: PAYMENT_STATUS.COMPLETED,
      razorpay: {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
        method: razorpayPayment.method,
        bank: razorpayPayment.bank,
        wallet: razorpayPayment.wallet,
        vpa: razorpayPayment.vpa,
        cardNetwork: razorpayPayment.card?.network,
        cardLast4: razorpayPayment.card?.last4,
      },
      metadata: { ipAddress },
      paidAt: new Date(),
    });

    // Update order payment status
    order.payment.status = PAYMENT_STATUS.COMPLETED;
    order.payment.razorpayPaymentId = razorpayPaymentId;
    order.payment.razorpaySignature = razorpaySignature;
    order.payment.paidAmount = order.pricing.total;
    order.payment.paidAt = new Date();
    order.payment.transactionId = razorpayPaymentId;
    await order.save();

    return payment;
  }

  async processRefund(order, amount, reason) {
    try {
      if (!order.payment.razorpayPaymentId) {
        throw ApiError.badRequest('No payment found for this order');
      }

      const refundAmount = amount || order.pricing.total;

      const refund = await this.razorpay.payments.refund(
        order.payment.razorpayPaymentId,
        {
          amount: Math.round(refundAmount * 100),
          notes: {
            reason,
            orderId: order._id.toString(),
          },
        }
      );

      // Update payment record
      await Payment.findOneAndUpdate(
        { order: order._id },
        {
          'refund.isRefunded': true,
          'refund.refundId': refund.id,
          'refund.refundAmount': refundAmount,
          'refund.refundReason': reason,
          'refund.refundedAt': new Date(),
          status: PAYMENT_STATUS.REFUNDED,
        }
      );

      return refund;
    } catch (error) {
      logger.error('Refund error:', error);
      throw ApiError.internal('Failed to process refund');
    }
  }
}

export default new PaymentService();
