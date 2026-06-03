import 'dotenv/config';
import http from 'http';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { initializeSocket } from './src/socket/index.js';
import logger from './src/utils/logger.js';
import Category from './src/models/Category.model.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Connect to database and start server
connectDB()
  .then(async () => {
    // Seed default categories matching frontend IDs if not present
    try {
      const defaultCategories = [
        { _id: '64f0b2f384a56c001712aabc', name: 'Vegetables', description: 'Fresh organic vegetables' },
        { _id: '64f0b2f384a56c001712aabd', name: 'Fruits', description: 'Fresh organic fruits' },
        { _id: '64f0b2f384a56c001712aabe', name: 'Herbs', description: 'Fresh herbs' }
      ];
      for (const cat of defaultCategories) {
        const exists = await Category.findById(cat._id);
        if (!exists) {
          const category = new Category(cat);
          await category.save();
        }
      }
      logger.info('Default categories ensured/seeded in DB successfully.');
    } catch (err) {
      logger.error('Failed to seed default categories:', err);
    }

    server.listen(PORT, () => {
      logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...');
  logger.error(err.name, err.message);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(err.stack || err);
  process.exit(1);
});
