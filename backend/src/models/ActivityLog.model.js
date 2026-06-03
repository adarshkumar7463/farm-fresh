import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'password_change', 'profile_update',
      'product_create', 'product_update', 'product_delete', 'price_update', 'stock_update',
      'order_create', 'order_update', 'order_cancel', 'order_status_change',
      'payment_create', 'payment_complete', 'refund_process',
      'discount_create', 'discount_update', 'discount_delete',
      'customer_add', 'customer_update',
      'bulk_upload', 'export_data',
      'settings_update',
    ],
  },
  description: {
    type: String,
    required: true,
  },
  resource: {
    type: { type: String, enum: ['product', 'order', 'payment', 'user', 'discount', 'settings'] },
    id: mongoose.Schema.Types.ObjectId,
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: String,
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success',
  },
}, {
  timestamps: true,
});

// Indexes
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ 'resource.type': 1, 'resource.id': 1 });

// TTL index to auto-delete logs after 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
