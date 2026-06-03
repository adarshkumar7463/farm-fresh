import { Router } from 'express';
import Category from '../models/Category.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

const router = Router();

// Default categories to seed when none exist
const DEFAULT_CATEGORIES = [
  { name: 'Vegetables', description: 'Fresh vegetables from local farms', icon: '🥬', color: '#4caf50' },
  { name: 'Fruits', description: 'Seasonal and exotic fruits', icon: '🍎', color: '#ff9800' },
  { name: 'Herbs', description: 'Fresh culinary and medicinal herbs', icon: '🌿', color: '#66bb6a' },
  { name: 'Dairy', description: 'Milk, cheese, and dairy products', icon: '🥛', color: '#fdd835' },
  { name: 'Grains', description: 'Rice, wheat, and other grains', icon: '🌾', color: '#8d6e63' },
  { name: 'Spices', description: 'Fresh and dried spices', icon: '🌶️', color: '#e53935' },
  { name: 'Pulses', description: 'Lentils, beans, and other pulses', icon: '🫘', color: '#a1887f' },
  { name: 'Organic', description: 'Certified organic produce', icon: '🌱', color: '#2e7d32' },
];

// @desc    Get all categories (auto-seeds defaults if empty)
// @route   GET /api/v1/categories
// @access  Public
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    let categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean();

    // Seed default categories when the collection is empty
    if (categories.length === 0) {
      const seeded = await Category.insertMany(
        DEFAULT_CATEGORIES.map((c, i) => ({ ...c, order: i }))
      );
      categories = seeded.map((doc) => doc.toObject());
    }

    res.status(200).json(ApiResponse.success({ categories }));
  })
);

export default router;
