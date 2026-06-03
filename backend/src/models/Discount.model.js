import mongoose from 'mongoose';
import { DISCOUNT_TYPES } from '../utils/constants.js';

const discountSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    uppercase: true,
    trim: true,
    sparse: true,
  },
  type: {
    type: String,
    enum: Object.values(DISCOUNT_TYPES),
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  scope: {
    type: String,
    enum: ['global', 'category', 'product', 'customer'],
    default: 'global',
  },
  applicableTo: {
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  conditions: {
    minOrderValue: { type: Number, default: 0 },
    maxDiscountAmount: Number,
    minQuantity: { type: Number, default: 1 },
    firstOrderOnly: { type: Boolean, default: false },
  },
  usage: {
    limit: Number,
    perCustomerLimit: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
  },
  validity: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  description: String,
}, {
  timestamps: true,
});

// Indexes
discountSchema.index({ supplier: 1, isActive: 1 });
discountSchema.index({ code: 1, supplier: 1 }, { unique: true, sparse: true });
discountSchema.index({ 'validity.startDate': 1, 'validity.endDate': 1 });

// Virtual to check if discount is currently valid
discountSchema.virtual('isValid').get(function () {
  if (!this.isActive) return false;
  const now = new Date();
  return now >= this.validity.startDate && now <= this.validity.endDate;
});

const Discount = mongoose.model('Discount', discountSchema);

export default Discount;
