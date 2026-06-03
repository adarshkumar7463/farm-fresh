import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get current user's cart
// @route   GET /api/v1/cart
// @access  Private (Buyer)
export const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: 'items.product',
      select: 'name price unit images stock isActive discount',
    });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  res.status(200).json(ApiResponse.success({ cart }));
});

// @desc    Add item to cart
// @route   POST /api/v1/cart
// @access  Private (Buyer)
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw ApiError.notFound('Product not found or inactive');
  }

  if (product.stock.quantity < quantity) {
    throw ApiError.badRequest('Requested quantity exceeds available stock');
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    const totalQty = cart.items[existingItemIndex].quantity + quantity;
    if (product.stock.quantity < totalQty) {
      throw ApiError.badRequest('Total requested quantity exceeds available stock');
    }
    cart.items[existingItemIndex].quantity = totalQty;
  } else {
    cart.items.push({
      product: productId,
      supplier: product.supplier,
      quantity,
    });
  }

  await cart.save();
  await cart.populate({
    path: 'items.product',
    select: 'name price unit images stock isActive discount',
  });

  res.status(200).json(ApiResponse.success({ cart }, 'Item added to cart'));
});

// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/items/:itemId
// @access  Private (Buyer)
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { itemId } = req.params;

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw ApiError.notFound('Cart not found');
  }

  const itemIndex = cart.items.findIndex((item) => item._id.toString() === itemId);
  if (itemIndex === -1) {
    throw ApiError.notFound('Item not found in cart');
  }

  const product = await Product.findById(cart.items[itemIndex].product);
  if (!product || !product.isActive) {
    throw ApiError.notFound('Product is no longer available');
  }

  if (product.stock.quantity < quantity) {
    throw ApiError.badRequest('Requested quantity exceeds available stock');
  }

  cart.items[itemIndex].quantity = quantity;
  await cart.save();
  await cart.populate({
    path: 'items.product',
    select: 'name price unit images stock isActive discount',
  });

  res.status(200).json(ApiResponse.success({ cart }, 'Cart updated'));
});

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/items/:itemId
// @access  Private (Buyer)
export const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw ApiError.notFound('Cart not found');
  }

  cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
  await cart.save();
  await cart.populate({
    path: 'items.product',
    select: 'name price unit images stock isActive discount',
  });

  res.status(200).json(ApiResponse.success({ cart }, 'Item removed from cart'));
});

// @desc    Clear cart
// @route   DELETE /api/v1/cart
// @access  Private (Buyer)
export const clearCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    cart.appliedCoupon = undefined;
    await cart.save();
  }

  res.status(200).json(ApiResponse.success({ cart }, 'Cart cleared successfully'));
});
