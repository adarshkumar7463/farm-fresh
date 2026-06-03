import ApiError from '../utils/ApiError.js';

/**
 * Middleware to authorize users based on roles.
 * Must be used after authenticate middleware.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Access denied. Insufficient permissions.'));
    }

    next();
  };
};
