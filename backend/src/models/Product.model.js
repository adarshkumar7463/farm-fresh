import mongoose from 'mongoose';
import slugify from 'slugify';
import { PRODUCT_UNITS } from '../utils/constants.js';

const priceHistorySchema = new mongoose.Schema({
  price: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const productSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description cannot exceed 200 characters'],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  },
  images: [{
    url: { type: String, required: true },
    publicId: String,
    alt: String,
    isPrimary: { type: Boolean, default: false },
  }],
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  compareAtPrice: {
    type: Number,
    min: [0, 'Compare at price cannot be negative'],
  },
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative'],
  },
  unit: {
    type: String,
    enum: Object.values(PRODUCT_UNITS),
    required: true,
    default: PRODUCT_UNITS.KG,
  },
  minOrderQuantity: {
    type: Number,
    default: 1,
    min: [1, 'Minimum order quantity must be at least 1'],
  },
  maxOrderQuantity: {
    type: Number,
    min: [1, 'Maximum order quantity must be at least 1'],
  },
  stock: {
    quantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    trackInventory: { type: Boolean, default: true },
    allowBackorder: { type: Boolean, default: false },
  },
  discount: {
    type: { type: String, enum: ['percentage', 'fixed'] },
    value: { type: Number, min: 0 },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: false },
  },
  specifications: [{
    name: String,
    value: String,
  }],
  tags: [{ type: String, lowercase: true, trim: true }],
  origin: String,
  shelfLife: String,
  storageInstructions: String,
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbohydrates: Number,
    fat: Number,
    fiber: Number,
  },
  certifications: [String],
  isOrganic: { type: Boolean, default: false },
  isSeasonal: { type: Boolean, default: false },
  seasonalAvailability: {
    startMonth: { type: Number, min: 1, max: 12 },
    endMonth: { type: Number, min: 1, max: 12 },
  },
  priceHistory: [priceHistorySchema],
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
  },
  salesCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  seoTitle: String,
  seoDescription: String,
  barcode: String,
  sku: {
    type: String,
    unique: true,
    sparse: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ supplier: 1, isActive: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'stock.quantity': 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ salesCount: -1 });

// Virtual for effective price (after discount)
productSchema.virtual('effectivePrice').get(function () {
  if (!this.discount?.isActive) return this.price;
  
  const now = new Date();
  if (this.discount.startDate && now < this.discount.startDate) return this.price;
  if (this.discount.endDate && now > this.discount.endDate) return this.price;

  if (this.discount.type === 'percentage') {
    return Math.round(this.price * (1 - this.discount.value / 100) * 100) / 100;
  }
  return Math.max(0, this.price - this.discount.value);
});

// Virtual for discount percentage display
productSchema.virtual('discountPercentage').get(function () {
  if (!this.discount?.isActive || this.discount.type !== 'percentage') return 0;
  return this.discount.value;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function () {
  if (!this.stock.trackInventory) return 'in_stock';
  if (this.stock.quantity <= 0) return this.stock.allowBackorder ? 'backorder' : 'out_of_stock';
  if (this.stock.quantity <= this.stock.lowStockThreshold) return 'low_stock';
  return 'in_stock';
});

// Virtual for primary image
productSchema.virtual('primaryImage').get(function () {
  const primary = this.images.find((img) => img.isPrimary);
  return primary?.url || this.images[0]?.url || null;
});

// Generate slug before saving
productSchema.pre('save', async function (next) {
  if (this.isModified('name')) {
    const baseSlug = slugify(this.name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    
    while (await mongoose.model('Product').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  
  // Track price changes
  if (this.isModified('price') && !this.isNew) {
    this.priceHistory.push({
      price: this.price,
      date: new Date(),
    });
    
    // Keep only last 30 price history entries
    if (this.priceHistory.length > 30) {
      this.priceHistory = this.priceHistory.slice(-30);
    }
  }
  
  next();
});

// Generate SKU if not provided
productSchema.pre('save', async function (next) {
  if (!this.sku) {
    const prefix = this.name.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.sku = `${prefix}-${random}`;
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

export default Product;
