import mongoose from 'mongoose';
import { PAYMENT_STATUS, PAYMENT_METHODS } from '../utils/constants.js';

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true,
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  method: {
    type: String,
    enum: Object.values(PAYMENT_METHODS),
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING,
    index: true,
  },
  razorpay: {
    orderId: String,
    paymentId: String,
    signature: String,
    method: String,
    bank: String,
    wallet: String,
    vpa: String,
    cardNetwork: String,
    cardLast4: String,
  },
  refund: {
    isRefunded: { type: Boolean, default: false },
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    refundedAt: Date,
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceId: String,
  },
  failureReason: String,
  notes: String,
  paidAt: Date,
}, {
  timestamps: true,
});

// Indexes
paymentSchema.index({ order: 1, status: 1 });
paymentSchema.index({ buyer: 1, createdAt: -1 });
paymentSchema.index({ supplier: 1, createdAt: -1 });
paymentSchema.index({ 'razorpay.paymentId': 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
