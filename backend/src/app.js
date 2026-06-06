import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import passport from 'passport';

import { configurePassport } from './config/passport.js';
import { globalRateLimiter } from './middleware/rateLimiter.middleware.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import routes from './routes/index.js';

const app = express();

/**
 * Trust Render/Proxy
 */
app.set('trust proxy', 1);

/**
 * Security Headers
 */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

/**
 * CORS Configuration
 */
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/**
 * Body Parsers
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

/**
 * Security Middleware
 */
app.use(mongoSanitize());

app.use(
  hpp({
    whitelist: ['price', 'category', 'sort', 'page', 'limit'],
  })
);

/**
 * Compression
 */
app.use(compression());

/**
 * Request Logging
 */
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

/**
 * Rate Limiting
 */
app.use('/api', globalRateLimiter);

/**
 * Passport Authentication
 */
configurePassport(passport);
app.use(passport.initialize());

/**
 * Root Route
 * Prevents Render from showing 404 on "/"
 */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Farm Flow API is running successfully 🚀',
    environment: process.env.NODE_ENV,
    healthCheck: '/health',
    apiBaseUrl: '/api/v1',
  });
});

/**
 * Health Check Route
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Routes
 */
app.use('/api/v1', routes);

/**
 * 404 Handler
 */
app.use(notFound);

/**
 * Global Error Handler
 */
app.use(errorHandler);

export default app;