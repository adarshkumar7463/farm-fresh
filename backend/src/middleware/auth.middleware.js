import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import RefreshToken from '../models/RefreshToken.model.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw ApiError.unauthorized('Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    const user = await User.findById(decoded.sub).select('-password');
    
    if (!user) {
      throw ApiError.unauthorized('User no longer exists.');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Account is deactivated.');
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      throw ApiError.unauthorized('Password recently changed. Please log in again.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token.');
    }
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expired.');
    }
    throw error;
  }
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.sub).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // Token invalid or expired, continue without user
  }

  next();
});

export const verifyRefreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw ApiError.badRequest('Refresh token is required.');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
      user: decoded.sub,
      isRevoked: false,
    });

    if (!storedToken) {
      throw ApiError.unauthorized('Invalid refresh token.');
    }

    if (storedToken.isExpired) {
      throw ApiError.unauthorized('Refresh token expired.');
    }

    const user = await User.findById(decoded.sub);
    
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or inactive.');
    }

    req.user = user;
    req.refreshToken = storedToken;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Invalid or expired refresh token.');
    }
    throw error;
  }
});
