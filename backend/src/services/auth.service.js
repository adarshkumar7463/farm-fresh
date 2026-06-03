import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.model.js';
import RefreshToken from '../models/RefreshToken.model.js';
import ApiError from '../utils/ApiError.js';

class AuthService {
  generateAccessToken(userId) {
    return jwt.sign(
      { sub: userId },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY }
    );
  }

  generateRefreshToken(userId) {
    return jwt.sign(
      { 
        sub: userId,
        jti: crypto.randomBytes(16).toString('hex')
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY }
    );
  }

  async createRefreshToken(userId, ipAddress) {
    const token = this.generateRefreshToken(userId);
    
    // Calculate expiry
    const expiresAt = new Date();
    const days = parseInt(process.env.JWT_REFRESH_EXPIRY) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    await RefreshToken.create({
      token,
      user: userId,
      expiresAt,
      createdByIp: ipAddress,
    });

    return token;
  }

  async refreshAccessToken(refreshToken, ipAddress) {
    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
      isRevoked: false,
    }).populate('user');

    if (!storedToken) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (storedToken.isExpired) {
      storedToken.isRevoked = true;
      await storedToken.save();
      throw ApiError.unauthorized('Refresh token expired');
    }

    const { user } = storedToken;

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or inactive');
    }

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user._id);
    const newRefreshToken = await this.rotateRefreshToken(storedToken, ipAddress);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async rotateRefreshToken(oldToken, ipAddress) {
    const newToken = this.generateRefreshToken(oldToken.user._id || oldToken.user);
    
    const expiresAt = new Date();
    const days = parseInt(process.env.JWT_REFRESH_EXPIRY) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    // Create new token
    await RefreshToken.create({
      token: newToken,
      user: oldToken.user._id || oldToken.user,
      expiresAt,
      createdByIp: ipAddress,
    });

    // Revoke old token
    oldToken.isRevoked = true;
    oldToken.revokedAt = new Date();
    oldToken.revokedByIp = ipAddress;
    oldToken.replacedByToken = newToken;
    await oldToken.save();

    return newToken;
  }

  async revokeRefreshToken(token, ipAddress) {
    const storedToken = await RefreshToken.findOne({ token });
    
    if (storedToken) {
      storedToken.isRevoked = true;
      storedToken.revokedAt = new Date();
      storedToken.revokedByIp = ipAddress;
      await storedToken.save();
    }
  }

  async revokeAllUserTokens(userId, ipAddress) {
    await RefreshToken.updateMany(
      { user: userId, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: new Date(),
        revokedByIp: ipAddress,
      }
    );
  }

  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : user;
    const { password, otp, __v, ...sanitized } = userObj;
    return sanitized;
  }

  generateTokens(user) {
    return {
      accessToken: this.generateAccessToken(user._id),
    };
  }
}

export default new AuthService();
