import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotification,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', archiveNotification);

export default router;
