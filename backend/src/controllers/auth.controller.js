import User from '../models/User.model.js';
import RefreshToken from '../models/RefreshToken.model.js';
import Cart from '../models/Cart.model.js';
import Wishlist from '../models/Wishlist.model.js';
import AuthService from '../services/auth.service.js';
import EmailService from '../services/email.service.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createActivityLog } from '../utils/helpers.js';
import logger from '../utils/logger.js';

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { password, firstName, lastName, phone, role, businessInfo } = req.body;
  const email = req.body.email.toLowerCase();

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict('An account with this email already exists');
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    phone,
    role,
    businessInfo,
  });

  // Generate OTP for email verification
  const otp = user.generateOTP('email_verification');
  await user.save();

  // Send verification email
  try {
    await EmailService.sendVerificationEmail(user, otp);
  } catch (emailError) {
    console.log(`\n✉️ SMTP not configured. Use this OTP to verify email for ${user.email}: ${otp}\n`);
  }

  // Create cart and wishlist for buyers
  if (role === 'buyer') {
    await Cart.create({ user: user._id, items: [] });
    await Wishlist.create({ user: user._id, items: [] });
  }

  // Generate tokens
  const accessToken = AuthService.generateAccessToken(user._id);
  const refreshToken = await AuthService.createRefreshToken(user._id, req.ip);

  // Set cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json(
    ApiResponse.created(
      {
        user: AuthService.sanitizeUser(user),
        accessToken,
        refreshToken,
      },
      'Registration successful. Please verify your email.'
    )
  );
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  logger.info(`[LOGIN REQUEST] body: ${JSON.stringify(req.body)}`);
  
  // Find user with password
  const emailLower = email ? email.toLowerCase() : '';
  const emailTrimmed = emailLower.trim();
  
  logger.info(`[LOGIN QUERY] searching: "${emailLower}" and trimmed: "${emailTrimmed}"`);
  const foundUser = await User.findOne({ email: emailLower }).select('+password');
  logger.info(`[LOGIN QUERY] foundUser by lower: ${!!foundUser}`);
  
  let userTrimmed = null;
  if (!foundUser && emailLower !== emailTrimmed) {
    userTrimmed = await User.findOne({ email: emailTrimmed }).select('+password');
    logger.info(`[LOGIN QUERY] userTrimmed by trimmed: ${!!userTrimmed}`);
  }

  const finalUser = foundUser || userTrimmed;
  logger.info(`[LOGIN QUERY] finalUser: ${!!finalUser}`);
  
  if (!finalUser) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const user = finalUser;

  if (!user.isActive) {
    throw ApiError.unauthorized('Your account has been deactivated');
  }

  // Check if user registered with Google
  if (user.authProvider === 'google' && !user.password) {
    throw ApiError.unauthorized('Please sign in with Google');
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Update last login
  user.lastLoginAt = new Date();
  user.loginCount += 1;
  await user.save();

  // Generate tokens
  const accessToken = AuthService.generateAccessToken(user._id);
  const refreshToken = await AuthService.createRefreshToken(user._id, req.ip);

  // Set cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
  });

  // Log activity
  await createActivityLog(user._id, 'login', 'User logged in', req);

  res.status(200).json(
    ApiResponse.success(
      {
        user: AuthService.sanitizeUser(user),
        accessToken,
        refreshToken,
      },
      'Login successful'
    )
  );
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (refreshToken) {
    await AuthService.revokeRefreshToken(refreshToken, req.ip);
  }

  // Log activity
  await createActivityLog(req.user._id, 'logout', 'User logged out', req);

  // Clear cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(200).json(ApiResponse.success(null, 'Logged out successfully'));
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (!token) {
    throw ApiError.unauthorized('Refresh token required');
  }

  const result = await AuthService.refreshAccessToken(token, req.ip);

  // Set new cookies
  res.cookie('accessToken', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json(ApiResponse.success(result, 'Token refreshed'));
});

// @desc    Verify email OTP
// @route   POST /api/v1/auth/verify-email
// @access  Public
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.isEmailVerified) {
    throw ApiError.badRequest('Email already verified');
  }

  const isValid = user.verifyOTP(otp, 'email_verification');
  
  if (!isValid) {
    throw ApiError.badRequest('Invalid or expired OTP');
  }

  user.isEmailVerified = true;
  user.otp = undefined;
  await user.save();

  res.status(200).json(ApiResponse.success(null, 'Email verified successfully'));
});

// @desc    Resend verification email
// @route   POST /api/v1/auth/resend-verification
// @access  Public
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.isEmailVerified) {
    throw ApiError.badRequest('Email already verified');
  }

  // Generate new OTP
  const otp = user.generateOTP('email_verification');
  await user.save();

  // Send email
  try {
    await EmailService.sendVerificationEmail(user, otp);
  } catch (emailError) {
    console.log(`\n✉️ SMTP not configured. Use this OTP to verify email for ${user.email}: ${otp}\n`);
  }

  res.status(200).json(ApiResponse.success(null, 'Verification email sent'));
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  
  if (!user) {
    // Don't reveal if user exists
    return res.status(200).json(
      ApiResponse.success(null, 'If an account exists, a reset email has been sent')
    );
  }

  if (user.authProvider === 'google') {
    throw ApiError.badRequest('Please use Google Sign-In for this account');
  }

  // Generate OTP
  const otp = user.generateOTP('password_reset');
  await user.save();

  // Send email
  try {
    await EmailService.sendPasswordResetEmail(user, otp);
  } catch (emailError) {
    console.log(`\n✉️ SMTP not configured. Use this OTP to reset password for ${user.email}: ${otp}\n`);
  }

  res.status(200).json(
    ApiResponse.success(null, 'If an account exists, a reset email has been sent')
  );
});

// @desc    Verify password reset OTP
// @route   POST /api/v1/auth/verify-reset-otp
// @access  Public
export const verifyResetOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const isValid = user.verifyOTP(otp, 'password_reset');
  
  if (!isValid) {
    throw ApiError.badRequest('Invalid or expired OTP');
  }

  res.status(200).json(ApiResponse.success(null, 'OTP verified'));
});

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;

  const user = await User.findOne({ email });
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const isValid = user.verifyOTP(otp, 'password_reset');
  
  if (!isValid) {
    throw ApiError.badRequest('Invalid or expired OTP');
  }

  // Update password
  user.password = password;
  user.otp = undefined;
  await user.save();

  // Revoke all refresh tokens
  await AuthService.revokeAllUserTokens(user._id, req.ip);

  // Log activity
  await createActivityLog(user._id, 'password_change', 'Password reset', req);

  res.status(200).json(ApiResponse.success(null, 'Password reset successful'));
});

// @desc    Change password
// @route   POST /api/v1/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!user.password) {
    throw ApiError.badRequest('Cannot change password for social login accounts');
  }

  const isMatch = await user.comparePassword(currentPassword);
  
  if (!isMatch) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  // Revoke all refresh tokens except current
  await RefreshToken.updateMany(
    { user: user._id, isRevoked: false },
    { isRevoked: true, revokedAt: new Date(), revokedByIp: req.ip }
  );

  // Log activity
  await createActivityLog(user._id, 'password_change', 'Password changed', req);

  res.status(200).json(ApiResponse.success(null, 'Password changed successfully'));
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  res.status(200).json(
    ApiResponse.success({ user: AuthService.sanitizeUser(user) })
  );
});

// @desc    Google OAuth callback
// @route   GET /api/v1/auth/google/callback
// @access  Public
export const googleCallback = asyncHandler(async (req, res) => {
  const user = req.user;

  // Update last login
  user.lastLoginAt = new Date();
  user.loginCount += 1;
  await user.save();

  // Create cart and wishlist for new buyers
  if (user.role === 'buyer') {
    await Cart.findOneAndUpdate(
      { user: user._id },
      { $setOnInsert: { user: user._id, items: [] } },
      { upsert: true }
    );
    await Wishlist.findOneAndUpdate(
      { user: user._id },
      { $setOnInsert: { user: user._id, items: [] } },
      { upsert: true }
    );
  }

  // Generate tokens
  const accessToken = AuthService.generateAccessToken(user._id);
  const refreshToken = await AuthService.createRefreshToken(user._id, req.ip);

  // Redirect to frontend with tokens
  const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
  res.redirect(redirectUrl);
});
