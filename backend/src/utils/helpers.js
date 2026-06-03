import ActivityLog from '../models/ActivityLog.model.js';
import { getIO } from '../socket/index.js';

/**
 * Creates an activity log entry in the database.
 */
export const createActivityLog = async (
  userId,
  action,
  description,
  req = null,
  resource = null,
  changes = null
) => {
  try {
    const logData = {
      user: userId,
      action,
      description,
    };

    if (resource) {
      logData.resource = resource;
    }

    if (changes) {
      logData.changes = changes;
    }

    if (req) {
      logData.metadata = {
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };
    }

    await ActivityLog.create(logData);
  } catch (error) {
    // Fail silently to not disrupt the main request lifecycle
    console.error('Activity log error:', error);
  }
};

/**
 * Emits a real-time socket event to a specific room.
 */
export const emitToRoom = (room, event, data) => {
  try {
    const io = getIO();
    if (io) {
      io.to(room).emit(event, data);
    }
  } catch (error) {
    console.error('Socket emit error:', error);
  }
};
