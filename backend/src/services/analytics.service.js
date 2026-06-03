import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import mongoose from 'mongoose';
import { startOfDay, subDays } from 'date-fns';

class AnalyticsService {
  /**
   * Get stats for the supplier dashboard
   */
  async getSupplierDashboardStats(supplierId) {
    const today = startOfDay(new Date());
    const supplierObjId = new mongoose.Types.ObjectId(supplierId);

    // Total sales, orders, pending payments, today's sales
    const generalStats = await Order.aggregate([
      { $match: { supplier: supplierObjId } },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, '$pricing.total', 0],
            },
          },
          totalOrders: { $sum: 1 },
          pendingPayments: {
            $sum: {
              $cond: [
                { $eq: ['$payment.status', 'pending'] },
                '$pricing.total',
                0,
              ],
            },
          },
          todaySales: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', today] },
                    { $eq: ['$status', 'delivered'] },
                  ],
                },
                '$pricing.total',
                0,
              ],
            },
          },
        },
      },
    ]);

    const stats = generalStats[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      pendingPayments: 0,
      todaySales: 0,
    };

    // Total unique customers
    const customers = await Order.distinct('buyer', { supplier: supplierId });
    const totalCustomers = customers.length;

    // Total products count
    const totalProducts = await Product.countDocuments({ supplier: supplierId });

    // Inventory status (Low stock count)
    const lowStockProducts = await Product.countDocuments({
      supplier: supplierId,
      isActive: true,
      $expr: { $lte: ['$stock.quantity', '$stock.lowStockThreshold'] },
    });

    // Monthly Sales Chart Data (last 6 months)
    const sixMonthsAgo = subDays(new Date(), 180);
    const monthlySales = await Order.aggregate([
      {
        $match: {
          supplier: supplierObjId,
          status: 'delivered',
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Top Selling Products
    const topProducts = await Order.aggregate([
      {
        $match: {
          supplier: supplierObjId,
          status: 'delivered',
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          unit: { $first: '$items.unit' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
    ]);

    return {
      cards: {
        totalProducts,
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        totalCustomers,
        pendingPayments: stats.pendingPayments,
        todaySales: stats.todaySales,
        lowStockProducts,
      },
      topProducts,
      monthlySales: monthlySales.map((m) => ({
        label: `${m._id.month}/${m._id.year}`,
        revenue: m.revenue,
        orders: m.orders,
      })),
    };
  }

  /**
   * Get stats for the buyer dashboard
   */
  async getBuyerDashboardStats(buyerId) {
    const buyerObjId = new mongoose.Types.ObjectId(buyerId);

    const orderStats = await Order.aggregate([
      { $match: { buyer: buyerObjId } },
      {
        $group: {
          _id: null,
          totalSpent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, '$pricing.total', 0],
            },
          },
          totalOrders: { $sum: 1 },
          pendingPayments: {
            $sum: {
              $cond: [
                { $eq: ['$payment.status', 'pending'] },
                '$pricing.total',
                0,
              ],
            },
          },
        },
      },
    ]);

    const stats = orderStats[0] || {
      totalSpent: 0,
      totalOrders: 0,
      pendingPayments: 0,
    };

    // Active orders (not delivered or cancelled)
    const activeOrders = await Order.find({
      buyer: buyerId,
      status: { $nin: ['delivered', 'cancelled', 'refunded'] },
    })
      .populate('supplier', 'firstName lastName businessInfo.businessName')
      .sort('-createdAt')
      .lean();

    return {
      totalSpent: stats.totalSpent,
      totalOrders: stats.totalOrders,
      pendingPayments: stats.pendingPayments,
      activeOrders,
    };
  }

  /**
   * Detailed sales report for excel or graph exports
   */
  async getSalesReport(supplierId, startDate, endDate) {
    const query = {
      supplier: new mongoose.Types.ObjectId(supplierId),
      status: 'delivered',
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const report = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 },
          itemsCount: { $sum: { $size: '$items' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return report.map((r) => ({
      date: r._id,
      revenue: r.revenue,
      orders: r.orders,
      itemsCount: r.itemsCount,
    }));
  }
}

export default new AnalyticsService();
