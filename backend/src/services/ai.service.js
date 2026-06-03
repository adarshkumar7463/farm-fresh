import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';
import User from '../models/User.model.js';
import mongoose from 'mongoose';

class AIService {
  /**
   * Predict future demand for a supplier's products based on sales history.
   */
  async predictDemand(supplierId) {
    // Get sales history grouped by product for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesHistory = await Order.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'delivered',
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 },
          sales: { $push: { date: '$createdAt', quantity: '$items.quantity' } },
        },
      },
    ]);

    const predictions = [];

    for (const item of salesHistory) {
      const product = await Product.findById(item._id).select('name unit stock');
      if (!product) continue;

      // Basic linear forecast heuristic: average weekly sales scaled
      const weeklyAverage = item.totalQuantity / 4;
      const predictedNextWeek = weeklyAverage * 1.15; // 15% safety factor / demand buffer
      const currentStock = product.stock.quantity;
      const daysOfStockLeft = weeklyAverage > 0 ? (currentStock / weeklyAverage) * 7 : 999;

      predictions.push({
        productId: product._id,
        name: product.name,
        unit: product.unit,
        currentStock,
        averageWeeklySales: Math.round(weeklyAverage * 10) / 10,
        predictedNextWeekDemand: Math.round(predictedNextWeek * 10) / 10,
        daysOfStockRemaining: Math.round(daysOfStockLeft),
        recommendation: daysOfStockLeft < 7 ? 'REORDER_NOW' : daysOfStockLeft < 14 ? 'MONITOR' : 'OK',
      });
    }

    return predictions;
  }

  /**
   * Generates smart inventory suggestions (e.g. low stock alerts, shelf-life alerts)
   */
  async getSmartInventorySuggestions(supplierId) {
    const products = await Product.find({ supplier: supplierId, isActive: true });
    const suggestions = [];

    for (const p of products) {
      const isLowStock = p.stock.quantity <= p.stock.lowStockThreshold;
      const outOfStock = p.stock.quantity === 0;

      if (outOfStock) {
        suggestions.push({
          type: 'CRITICAL',
          productId: p._id,
          productName: p.name,
          message: `"${p.name}" is completely out of stock. Immediate replenishment required.`,
        });
      } else if (isLowStock) {
        suggestions.push({
          type: 'WARNING',
          productId: p._id,
          productName: p.name,
          message: `"${p.name}" has low stock (${p.stock.quantity} ${p.unit} remaining). Suggested reorder quantity: ${Math.max(50, p.stock.lowStockThreshold * 3)} ${p.unit}.`,
        });
      }
    }

    return suggestions;
  }

  /**
   * Get smart personalized product recommendations for a buyer
   */
  async getSmartRecommendations(buyerId) {
    // 1. Find buyer's order history to understand categories they buy
    const pastOrders = await Order.find({ buyer: buyerId }).sort('-createdAt').limit(5).lean();
    
    // Extract unique product IDs already ordered
    const orderedProductIds = new Set();
    const orderedCategoryIds = new Set();

    pastOrders.forEach(order => {
      order.items.forEach(item => {
        orderedProductIds.add(item.product.toString());
      });
    });

    // Get products the user has ordered
    const products = await Product.find({ _id: { $in: Array.from(orderedProductIds) } });
    products.forEach(p => orderedCategoryIds.add(p.category.toString()));

    let query = { isActive: true, 'stock.quantity': { $gt: 0 } };
    if (orderedCategoryIds.size > 0) {
      query.category = { $in: Array.from(orderedCategoryIds) };
      query._id = { $nin: Array.from(orderedProductIds) };
    }

    // Get recommended products
    let recommendations = await Product.find(query)
      .populate('category', 'name')
      .sort('-salesCount')
      .limit(6)
      .lean();

    // Fallback to top-selling if not enough
    if (recommendations.length < 6) {
      const remainingCount = 6 - recommendations.length;
      const excludeIds = [...Array.from(orderedProductIds), ...recommendations.map(r => r._id.toString())];
      const popular = await Product.find({
        isActive: true,
        'stock.quantity': { $gt: 0 },
        _id: { $nin: excludeIds },
      })
        .populate('category', 'name')
        .sort('-salesCount')
        .limit(remainingCount)
        .lean();
      
      recommendations = [...recommendations, ...popular];
    }

    return recommendations;
  }

  /**
   * Analyze customer spending patterns
   */
  async analyzeCustomerSpending(supplierId) {
    const orders = await Order.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: 'delivered',
        },
      },
      {
        $group: {
          _id: '$buyer',
          totalSpent: { $sum: '$pricing.total' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$pricing.total' },
        },
      },
      { $sort: { totalSpent: -1 } },
    ]);

    const result = [];
    for (const ord of orders) {
      const buyer = await User.findById(ord._id).select('firstName lastName email businessInfo');
      if (!buyer) continue;
      
      result.push({
        buyerId: ord._id,
        name: `${buyer.firstName} ${buyer.lastName}`,
        businessName: buyer.businessInfo?.businessName || 'Direct Buyer',
        totalSpent: ord.totalSpent,
        orderCount: ord.orderCount,
        averageOrderValue: Math.round(ord.averageOrderValue),
        segment: ord.totalSpent > 50000 ? 'VIP' : ord.totalSpent > 15000 ? 'Regular' : 'New/Low value',
      });
    }

    return result;
  }
}

export default new AIService();
