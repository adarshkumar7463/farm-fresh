export const USER_ROLES = {
  SUPPLIER: 'supplier',
  BUYER: 'buyer',
  ADMIN: 'admin',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  PACKED: 'packed',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_METHODS = {
  ONLINE: 'online',
  COD: 'cod',
};

export const PRODUCT_UNITS = {
  KG: 'kg',
  GRAM: 'gram',
  PIECE: 'piece',
  DOZEN: 'dozen',
  BOX: 'box',
  CRATE: 'crate',
  BUNDLE: 'bundle',
};

export const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
};

export const NOTIFICATION_TYPES = {
  ORDER: 'order',
  PAYMENT: 'payment',
  STOCK: 'stock',
  PRICE: 'price',
  SYSTEM: 'system',
  PROMOTION: 'promotion',
};

export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  
  // Products
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  PRICE_UPDATED: 'price:updated',
  STOCK_UPDATED: 'stock:updated',
  
  // Orders
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  
  // Payments
  PAYMENT_RECEIVED: 'payment:received',
  PAYMENT_FAILED: 'payment:failed',
  
  // Notifications
  NOTIFICATION: 'notification',
  
  // Room events
  JOIN_ROOM: 'join:room',
  LEAVE_ROOM: 'leave:room',
};
