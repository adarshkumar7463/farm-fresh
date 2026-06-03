import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import AuthService from '../services/auth.service.js';

// @desc    Update user profile details
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, businessInfo, preferences } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;
  if (businessInfo) user.businessInfo = { ...user.businessInfo, ...businessInfo };
  if (preferences) user.preferences = { ...user.preferences, ...preferences };

  await user.save();

  res.status(200).json(
    ApiResponse.success(
      { user: AuthService.sanitizeUser(user) },
      'Profile updated successfully'
    )
  );
});

// @desc    Add new delivery/business address
// @route   POST /api/v1/users/addresses
// @access  Private
export const addAddress = asyncHandler(async (req, res) => {
  const { label, street, city, state, postalCode, country, landmark, isDefault } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // If set to default, unset other defaults
  if (isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  user.addresses.push({
    label,
    street,
    city,
    state,
    postalCode,
    country,
    landmark,
    isDefault: isDefault || user.addresses.length === 0,
  });

  await user.save();

  res.status(200).json(
    ApiResponse.success(
      { user: AuthService.sanitizeUser(user) },
      'Address added successfully'
    )
  );
});

// @desc    Remove an address
// @route   DELETE /api/v1/users/addresses/:addressId
// @access  Private
export const removeAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  user.addresses = user.addresses.filter(
    (addr) => addr._id.toString() !== req.params.addressId
  );

  await user.save();

  res.status(200).json(
    ApiResponse.success(
      { user: AuthService.sanitizeUser(user) },
      'Address removed successfully'
    )
  );
});
