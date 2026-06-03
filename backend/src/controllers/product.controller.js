import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { createActivityLog, emitToRoom } from '../utils/helpers.js';
import { SOCKET_EVENTS } from '../utils/constants.js';

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    search,
    category,
    supplier,
    minPrice,
    maxPrice,
    inStock,
    isOrganic,
    isFeatured,
    tags,
  } = req.query;

  // Build query
  const query = { isActive: true };

  if (search) {
    query.$text = { $search: search };
  }

  if (category) {
    query.category = category;
  }

  if (supplier) {
    query.supplier = supplier;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
  }

  if (inStock !== undefined) {
    if (inStock) {
      query['stock.quantity'] = { $gt: 0 };
    } else {
      query['stock.quantity'] = 0;
    }
  }

  if (isOrganic !== undefined) {
    query.isOrganic = isOrganic;
  }

  if (isFeatured !== undefined) {
    query.isFeatured = isFeatured;
  }

  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    query.tags = { $in: tagArray };
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug')
      .populate('supplier', 'firstName lastName businessInfo.businessName')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(query),
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limitNum);

  res.status(200).json(
    ApiResponse.success({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    })
  );
});

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug description')
    .populate('supplier', 'firstName lastName email phone businessInfo avatar');

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  // Increment view count
  product.viewCount += 1;
  await product.save();

  res.status(200).json(ApiResponse.success({ product }));
});

// @desc    Get product by slug
// @route   GET /api/v1/products/slug/:slug
// @access  Public
export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true })
    .populate('category', 'name slug description')
    .populate('supplier', 'firstName lastName email phone businessInfo avatar');

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  // Increment view count
  product.viewCount += 1;
  await product.save();

  res.status(200).json(ApiResponse.success({ product }));
});

// @desc    Create product
// @route   POST /api/v1/products
// @access  Private (Supplier)
export const createProduct = asyncHandler(async (req, res) => {
  const { category: categoryId, ...productData } = req.body;

  // Verify category exists
  const category = await Category.findById(categoryId);
  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  // Handle image uploads
  let images = [];
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map((file, index) =>
      uploadToCloudinary(file.buffer, 'products').then((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
        isPrimary: index === 0,
      }))
    );
    images = await Promise.all(uploadPromises);
  }

  // Create product
  const product = await Product.create({
    ...productData,
    category: categoryId,
    supplier: req.user._id,
    images,
  });

  // Populate for response
  await product.populate([
    { path: 'category', select: 'name slug' },
    { path: 'supplier', select: 'firstName lastName businessInfo.businessName' },
  ]);

  // Update category product count
  await Category.findByIdAndUpdate(categoryId, { $inc: { productCount: 1 } });

  // Log activity
  await createActivityLog(req.user._id, 'product_create', `Created product: ${product.name}`, req, {
    type: 'product',
    id: product._id,
  });

  // Emit socket event
  emitToRoom(`supplier:${req.user._id}`, SOCKET_EVENTS.PRODUCT_CREATED, { product });

  res.status(201).json(ApiResponse.created({ product }, 'Product created successfully'));
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Supplier)
export const updateProduct = asyncHandler(async (req, res) => {
  let product = await Product.findOne({
    _id: req.params.id,
    supplier: req.user._id,
  });

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  const oldPrice = product.price;

  // Handle new image uploads
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, 'products').then((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
        isPrimary: false,
      }))
    );
    const newImages = await Promise.all(uploadPromises);
    req.body.images = [...(product.images || []), ...newImages];
  }

  // Update category count if changed
  if (req.body.category && req.body.category !== product.category.toString()) {
    await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });
    await Category.findByIdAndUpdate(req.body.category, { $inc: { productCount: 1 } });
  }

  // Update product
  Object.assign(product, req.body);
  await product.save();

  // Populate for response
  await product.populate([
    { path: 'category', select: 'name slug' },
    { path: 'supplier', select: 'firstName lastName businessInfo.businessName' },
  ]);

  // Log activity
  await createActivityLog(req.user._id, 'product_update', `Updated product: ${product.name}`, req, {
    type: 'product',
    id: product._id,
  });

  // Emit socket events
  emitToRoom(`supplier:${req.user._id}`, SOCKET_EVENTS.PRODUCT_UPDATED, { product });
  
  if (req.body.price && req.body.price !== oldPrice) {
    emitToRoom('marketplace', SOCKET_EVENTS.PRICE_UPDATED, {
      productId: product._id,
      oldPrice,
      newPrice: product.price,
    });
  }

  res.status(200).json(ApiResponse.success({ product }, 'Product updated successfully'));
});

// @desc    Update product price
// @route   PATCH /api/v1/products/:id/price
// @access  Private (Supplier)
export const updatePrice = asyncHandler(async (req, res) => {
  const { price, compareAtPrice } = req.body;

  const product = await Product.findOne({
    _id: req.params.id,
    supplier: req.user._id,
  });

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  const oldPrice = product.price;
  product.price = price;
  if (compareAtPrice !== undefined) {
    product.compareAtPrice = compareAtPrice;
  }
  await product.save();

  // Log activity
  await createActivityLog(
    req.user._id,
    'price_update',
    `Updated price for ${product.name}: ₹${oldPrice} → ₹${price}`,
    req,
    { type: 'product', id: product._id },
    { before: { price: oldPrice }, after: { price } }
  );

  // Emit socket event
  emitToRoom('marketplace', SOCKET_EVENTS.PRICE_UPDATED, {
    productId: product._id,
    productName: product.name,
    oldPrice,
    newPrice: price,
    supplierId: req.user._id,
  });

  res.status(200).json(ApiResponse.success({ product }, 'Price updated successfully'));
});

// @desc    Update product stock
// @route   PATCH /api/v1/products/:id/stock
// @access  Private (Supplier)
export const updateStock = asyncHandler(async (req, res) => {
  const { quantity, operation = 'set' } = req.body;

  const product = await Product.findOne({
    _id: req.params.id,
    supplier: req.user._id,
  });

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  const oldQuantity = product.stock.quantity;

  switch (operation) {
    case 'add':
      product.stock.quantity += quantity;
      break;
    case 'subtract':
      product.stock.quantity = Math.max(0, product.stock.quantity - quantity);
      break;
    default:
      product.stock.quantity = quantity;
  }

  await product.save();

  // Log activity
  await createActivityLog(
    req.user._id,
    'stock_update',
    `Updated stock for ${product.name}: ${oldQuantity} → ${product.stock.quantity}`,
    req,
    { type: 'product', id: product._id }
  );

  // Emit socket event
  emitToRoom(`supplier:${req.user._id}`, SOCKET_EVENTS.STOCK_UPDATED, {
    productId: product._id,
    productName: product.name,
    oldQuantity,
    newQuantity: product.stock.quantity,
    stockStatus: product.stockStatus,
  });

  res.status(200).json(ApiResponse.success({ product }, 'Stock updated successfully'));
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Supplier)
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    supplier: req.user._id,
  });

  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  // Delete images from Cloudinary
  if (product.images && product.images.length > 0) {
    const deletePromises = product.images
      .filter((img) => img.publicId)
      .map((img) => deleteFromCloudinary(img.publicId));
    await Promise.all(deletePromises);
  }

  // Update category product count
  await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });

  // Delete product
  await product.deleteOne();

  // Log activity
  await createActivityLog(req.user._id, 'product_delete', `Deleted product: ${product.name}`, req);

  // Emit socket event
  emitToRoom(`supplier:${req.user._id}`, SOCKET_EVENTS.PRODUCT_DELETED, {
    productId: product._id,
  });

  res.status(200).json(ApiResponse.success(null, 'Product deleted successfully'));
});

// @desc    Get supplier's products
// @route   GET /api/v1/products/my-products
// @access  Private (Supplier)
export const getMyProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sort = '-createdAt', search, category, inStock } = req.query;

  const query = { supplier: req.user._id };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }

  if (category) {
    query.category = category;
  }

  if (inStock !== undefined) {
    query['stock.quantity'] = inStock ? { $gt: 0 } : 0;
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(query),
  ]);

  res.status(200).json(
    ApiResponse.success({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: pageNum < Math.ceil(total / limitNum),
      },
    })
  );
});

// @desc    Get low stock products
// @route   GET /api/v1/products/low-stock
// @access  Private (Supplier)
export const getLowStockProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    supplier: req.user._id,
    'stock.trackInventory': true,
    $expr: { $lte: ['$stock.quantity', '$stock.lowStockThreshold'] },
  })
    .populate('category', 'name')
    .sort({ 'stock.quantity': 1 })
    .lean();

  res.status(200).json(ApiResponse.success({ products }));
});
