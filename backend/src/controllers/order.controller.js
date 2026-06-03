import Order from '../models/Order.model.js';
import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import Notification from '../models/Notification.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import PDFService from '../services/pdf.service.js';
import PaymentService from '../services/payment.service.js';
import { createActivityLog, emitToRoom } from '../utils/helpers.js';
import { ORDER_STATUS, PAYMENT_STATUS, NOTIFICATION_TYPES, SOCKET_EVENTS } from '../utils/constants.js';

// Helper to create notifications and sockets
const triggerNotification = async (recipientId, title, message, type, orderId, socketRoom, socketEvent, data) => {
  await Notification.create({
    recipient: recipientId,
    type,
    title,
    message,
    data: { orderId },
  });

  emitToRoom(socketRoom, socketEvent, data);
};

// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private (Buyer)
export const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, notes } = req.body;

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest('Cart is empty');
  }

  // Group items by supplier (for simplicity, we assume one order per checkout or handle single supplier carts.
  // In B2B, a cart usually has items from a single supplier or we split it. Let's find the supplier from the first item.)
  const supplierId = cart.items[0].supplier;

  // Calculate pricing
  let subtotal = 0;
  const orderItems = [];

  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isActive) {
      throw ApiError.badRequest(`Product "${product?.name || 'Unknown'}" is not available`);
    }

    if (product.stock.quantity < item.quantity) {
      throw ApiError.badRequest(`Insufficient stock for product "${product.name}"`);
    }

    const price = product.effectivePrice || product.price;
    const itemTotal = price * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      product: product._id,
      name: product.name,
      quantity: item.quantity,
      price,
      unit: product.unit,
      total: itemTotal,
    });
  }

  const discount = cart.appliedCoupon?.discount || 0;
  const deliveryFee = subtotal > 5000 ? 0 : 250; // Free delivery above 5000
  const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% B2B tax
  const total = subtotal - discount + deliveryFee + tax;

  // Create the Order
  const order = await Order.create({
    buyer: req.user._id,
    supplier: supplierId,
    items: orderItems,
    pricing: {
      subtotal,
      discount,
      deliveryFee,
      tax,
      total,
    },
    shippingAddress,
    notes,
    payment: {
      method: paymentMethod,
      status: PAYMENT_STATUS.PENDING,
    },
  });

  // Deduct stock and increment sales count
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.product._id, {
      $inc: {
        'stock.quantity': -item.quantity,
        salesCount: item.quantity,
      },
    });
  }

  // Clear Cart
  cart.items = [];
  cart.appliedCoupon = undefined;
  await cart.save();

  // Logs & Notifications
  await createActivityLog(req.user._id, 'order_create', `Placed order ${order.orderNumber}`, req, {
    type: 'order',
    id: order._id,
  });

  // Notify Supplier
  await triggerNotification(
    supplierId,
    'New Order Received',
    `You have received a new order ${order.orderNumber} totaling ₹${total}`,
    NOTIFICATION_TYPES.ORDER,
    order._id,
    `supplier:${supplierId}`,
    SOCKET_EVENTS.ORDER_CREATED,
    { order }
  );

  // If online payment is selected, set up Razorpay details
  let razorpayData = null;
  if (paymentMethod === 'online') {
    razorpayData = await PaymentService.createRazorpayOrder(order);
  }

  res.status(201).json(
    ApiResponse.created({
      order,
      razorpay: razorpayData,
    }, 'Order placed successfully')
  );
});

// @desc    Get orders (buyer or supplier)
// @route   GET /api/v1/orders
// @access  Private
export const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const query = {};
  if (req.user.role === 'supplier') {
    query.supplier = req.user._id;
  } else {
    query.buyer = req.user._id;
  }

  if (status) {
    query.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('buyer', 'firstName lastName businessInfo')
      .populate('supplier', 'firstName lastName businessInfo')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Order.countDocuments(query),
  ]);

  res.status(200).json(
    ApiResponse.success({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  );
});

// @desc    Get order details
// @route   GET /api/v1/orders/:id
// @access  Private
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('buyer', 'firstName lastName email phone businessInfo')
    .populate('supplier', 'firstName lastName email phone businessInfo');

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // Ensure authorized user
  if (
    order.buyer._id.toString() !== req.user._id.toString() &&
    order.supplier._id.toString() !== req.user._id.toString()
  ) {
    throw ApiError.forbidden('Unauthorized access to order details');
  }

  res.status(200).json(ApiResponse.success({ order }));
});

// @desc    Update order status
// @route   PATCH /api/v1/orders/:id/status
// @access  Private (Supplier)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, comment } = req.body;

  const order = await Order.findOne({
    _id: req.params.id,
    supplier: req.user._id,
  });

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  order.status = status;
  order.statusHistory.push({
    status,
    updatedBy: req.user._id,
    comment,
  });

  // Track delivery timestamps
  if (status === ORDER_STATUS.DELIVERED) {
    order.actualDeliveryDate = new Date();
    if (order.payment.method === 'cod') {
      order.payment.status = PAYMENT_STATUS.COMPLETED;
      order.payment.paidAmount = order.pricing.total;
      order.payment.paidAt = new Date();
    }
  }

  // Timeline description
  order.deliveryTimeline.push({
    status,
    description: comment || `Order status updated to ${status.replace('_', ' ')}`,
    date: new Date(),
  });

  await order.save();

  // Log action
  await createActivityLog(req.user._id, 'order_status_change', `Updated order ${order.orderNumber} status to ${status}`, req, {
    type: 'order',
    id: order._id,
  });

  // Notify Buyer
  await triggerNotification(
    order.buyer,
    'Order Status Update',
    `Your order ${order.orderNumber} is now ${status.replace('_', ' ')}`,
    NOTIFICATION_TYPES.ORDER,
    order._id,
    `buyer:${order.buyer}`,
    SOCKET_EVENTS.ORDER_STATUS_CHANGED,
    { orderId: order._id, status }
  );

  res.status(200).json(ApiResponse.success({ order }, 'Order status updated successfully'));
});

// @desc    Cancel order
// @route   POST /api/v1/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // Check permissions
  const isBuyer = order.buyer.toString() === req.user._id.toString();
  const isSupplier = order.supplier.toString() === req.user._id.toString();

  if (!isBuyer && !isSupplier) {
    throw ApiError.forbidden('You are not authorized to cancel this order');
  }

  if (order.status === ORDER_STATUS.DELIVERED || order.status === ORDER_STATUS.CANCELLED) {
    throw ApiError.badRequest('Order cannot be cancelled in its current state');
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.statusHistory.push({
    status: ORDER_STATUS.CANCELLED,
    updatedBy: req.user._id,
    comment: reason || 'Order cancelled',
  });

  // Restore inventory stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { 'stock.quantity': item.quantity },
    });
  }

  // Process refund if online payment was completed
  if (order.payment.status === PAYMENT_STATUS.COMPLETED && order.payment.method === 'online') {
    await PaymentService.processRefund(order, order.pricing.total, reason || 'Order Cancelled');
  }

  await order.save();

  // Log activity
  await createActivityLog(req.user._id, 'order_cancel', `Cancelled order ${order.orderNumber}`, req, {
    type: 'order',
    id: order._id,
  });

  // Notify counterparty
  const notifyRecipient = isBuyer ? order.supplier : order.buyer;
  const notifyRoom = isBuyer ? `supplier:${order.supplier}` : `buyer:${order.buyer}`;

  await triggerNotification(
    notifyRecipient,
    'Order Cancelled',
    `Order ${order.orderNumber} has been cancelled`,
    NOTIFICATION_TYPES.ORDER,
    order._id,
    notifyRoom,
    SOCKET_EVENTS.ORDER_UPDATED,
    { orderId: order._id, status: ORDER_STATUS.CANCELLED }
  );

  res.status(200).json(ApiResponse.success({ order }, 'Order cancelled successfully'));
});

// @desc    Download invoice PDF
// @route   GET /api/v1/orders/:id/invoice
// @access  Private
export const downloadInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('buyer')
    .populate('supplier');

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  if (
    order.buyer._id.toString() !== req.user._id.toString() &&
    order.supplier._id.toString() !== req.user._id.toString()
  ) {
    throw ApiError.forbidden('Unauthorized to download this invoice');
  }

  // Adapt database order object to pdf service structure
  const pdfOrder = {
    ...order.toObject(),
    deliveryAddress: order.shippingAddress,
    items: order.items.map((item) => ({
      productSnapshot: {
        name: item.name,
        unit: item.unit,
      },
      quantity: item.quantity,
      unitPrice: item.price,
      subtotal: item.total,
    })),
    pricing: {
      subtotal: order.pricing.subtotal,
      discount: order.pricing.discount,
      deliveryCharge: order.pricing.deliveryFee,
      tax: order.pricing.tax,
      taxRate: 5,
      total: order.pricing.total,
    },
  };

  const pdfBuffer = await PDFService.generateInvoice(pdfOrder, order.supplier, order.buyer);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
  res.send(pdfBuffer);
});
