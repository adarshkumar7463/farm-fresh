import AnalyticsService from '../services/analytics.service.js';
import AIService from '../services/ai.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get Supplier Dashboard Analytics & AI Insights
// @route   GET /api/v1/analytics/supplier
// @access  Private (Supplier)
export const getSupplierDashboard = asyncHandler(async (req, res) => {
  const stats = await AnalyticsService.getSupplierDashboardStats(req.user._id);
  const aiPredictions = await AIService.predictDemand(req.user._id);
  const aiSuggestions = await AIService.getSmartInventorySuggestions(req.user._id);

  res.status(200).json(
    ApiResponse.success({
      stats,
      aiPredictions,
      aiSuggestions,
    })
  );
});

// @desc    Get Buyer Dashboard Statistics & Orders
// @route   GET /api/v1/analytics/buyer
// @access  Private (Buyer)
export const getBuyerDashboard = asyncHandler(async (req, res) => {
  const stats = await AnalyticsService.getBuyerDashboardStats(req.user._id);
  const recommendations = await AIService.getSmartRecommendations(req.user._id);

  res.status(200).json(
    ApiResponse.success({
      stats,
      recommendations,
    })
  );
});

// @desc    Get AI Demand Predictions
// @route   GET /api/v1/analytics/predictions
// @access  Private (Supplier)
export const getPredictions = asyncHandler(async (req, res) => {
  const predictions = await AIService.predictDemand(req.user._id);
  res.status(200).json(ApiResponse.success({ predictions }));
});

// @desc    Get AI Smart Inventory Suggestions
// @route   GET /api/v1/analytics/suggestions
// @access  Private (Supplier)
export const getSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await AIService.getSmartInventorySuggestions(req.user._id);
  res.status(200).json(ApiResponse.success({ suggestions }));
});

// @desc    Get Customer Spend Analytics
// @route   GET /api/v1/analytics/customers
// @access  Private (Supplier)
export const getCustomerSpendingAnalysis = asyncHandler(async (req, res) => {
  const customerSpending = await AIService.analyzeCustomerSpending(req.user._id);
  res.status(200).json(ApiResponse.success({ customerSpending }));
});
