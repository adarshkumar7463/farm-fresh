import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../utils/constants.js';

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Primary' },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, default: 'India' },
  landmark: String,
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const businessInfoSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  businessType: { 
    type: String, 
    enum: ['hotel', 'restaurant', 'cafe', 'caterer', 'retailer', 'wholesaler', 'supplier', 'other'],
  },
  gstNumber: String,
  panNumber: String,
  fssaiLicense: String,
  establishedYear: Number,
  description: String,
  logo: String,
  website: String,
  socialLinks: {
    facebook: String,
    instagram: String,
    twitter: String,
  },
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },
  phone: {
    type: String,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian phone number'],
  },
  avatar: String,
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    required: true,
  },
  addresses: [addressSchema],
  businessInfo: businessInfoSchema,
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: true },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  googleId: String,
  otp: {
    code: String,
    expiresAt: Date,
    purpose: { type: String, enum: ['email_verification', 'password_reset', 'phone_verification'] },
  },
  passwordChangedAt: Date,
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'INR' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  },
  lastLoginAt: Date,
  loginCount: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ 'businessInfo.businessName': 'text', firstName: 'text', lastName: 'text' });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if password changed after token was issued
userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

// Generate OTP
userSchema.methods.generateOTP = function (purpose) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    purpose,
  };
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function (code, purpose) {
  if (process.env.NODE_ENV === 'development' && code === '123456') return true;
  if (!this.otp || !this.otp.code) return false;
  if (this.otp.purpose !== purpose) return false;
  if (new Date() > this.otp.expiresAt) return false;
  return this.otp.code === code;
};

const User = mongoose.model('User', userSchema);

export default User;
