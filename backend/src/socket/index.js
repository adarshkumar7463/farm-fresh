import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import logger from '../utils/logger.js';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    },
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.split(' ')[1] || 
                    socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.sub).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      if (!user.isActive) {
        return next(new Error('Account is deactivated'));
      }

      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`🔌 Socket connected: ${socket.id} (User: ${socket.user._id}, Role: ${socket.user.role})`);

    // Standard Room Join
    socket.on('join:room', (room) => {
      // Security check: only allow users to join their own rooms or the global marketplace
      const isAllowed = 
        room === 'marketplace' || 
        room === `supplier:${socket.user._id}` || 
        room === `buyer:${socket.user._id}`;

      if (isAllowed) {
        socket.join(room);
        logger.debug(`Socket ${socket.id} joined room: ${room}`);
      } else {
        logger.warn(`Unauthorized room join attempt to ${room} by socket ${socket.id}`);
      }
    });

    socket.on('leave:room', (room) => {
      socket.leave(room);
      logger.debug(`Socket ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    logger.warn('Socket.io has not been initialized yet!');
  }
  return io;
};
export default initializeSocket;
