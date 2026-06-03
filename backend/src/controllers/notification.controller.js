import Notification from '../models/Notification.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get user notifications
// @route   GET /api/v1/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isRead } = req.query;

  const query = { recipient: req.user._id, 'status.isArchived': false };
  if (isRead !== undefined) {
    query['status.isRead'] = isRead === 'true';
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(query),
  ]);

  const unreadCount = await Notification.getUnreadCount(req.user._id);

  res.status(200).json(
    ApiResponse.success({
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  );
});

// @desc    Mark notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  notification.status.isRead = true;
  notification.status.readAt = new Date();
  await notification.save();

  res.status(200).json(ApiResponse.success({ notification }, 'Notification marked as read'));
});

// @desc    Mark all notifications as read
// @route   PATCH /api/v1/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, 'status.isRead': false },
    {
      $set: {
        'status.isRead': true,
        'status.readAt': new Date(),
      },
    }
  );

  res.status(200).json(ApiResponse.success(null, 'All notifications marked as read'));
});

// @desc    Archive notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
export const archiveNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  notification.status.isArchived = true;
  notification.status.archivedAt = new Date();
  await notification.save();

  res.status(200).json(ApiResponse.success(null, 'Notification archived successfully'));
});
