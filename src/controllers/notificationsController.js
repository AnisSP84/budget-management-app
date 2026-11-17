const NotificationsModel = require('../models/notificationsModel');

class NotificationsController {
  // Get all unread notifications
  async getUnreadNotifications(req, res) {
    try {
      const userId = res.locals.userId;

      console.log('[DEBUG] getUnreadNotifications - userId:', userId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const notifications = await NotificationsModel.getUnreadNotifications(userId);
      const counts = await NotificationsModel.getNotificationCounts(userId);

      console.log('[DEBUG] Found notifications:', notifications.length);

      res.status(200).json({
        success: true,
        data: {
          notifications,
          counts,
        },
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(200).json({
        success: true,
        data: {
          notifications: [],
          counts: { total: 0, unread: 0 },
        },
      });
    }
  }

  // Get all notifications (with pagination)
  async getAllNotifications(req, res) {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const notifications = await NotificationsModel.getAllNotifications(userId, limit, offset);
      const counts = await NotificationsModel.getNotificationCounts(userId);

      res.status(200).json({
        success: true,
        data: {
          notifications,
          counts,
          pagination: { limit, offset },
        },
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(200).json({
        success: true,
        data: {
          notifications: [],
          counts: { total: 0, unread: 0 },
          pagination: { limit: 50, offset: 0 },
        },
      });
    }
  }

  // Create a new notification
  async createNotification(req, res) {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const { type, title, message } = req.body;

      if (!type || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: type, title, message',
        });
      }

      if (!['WARNING', 'EXCEEDED'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid type. Must be warning or exceeded',
        });
      }

      const notification = await NotificationsModel.createNotification(userId, {
        type,
        title,
        message,
      });

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: notification,
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification',
        error: error.message,
      });
    }
  }

  // Mark a notification as read
  async markAsRead(req, res) {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const notificationId = req.params.id;

      const updated = await NotificationsModel.markAsRead(notificationId, userId);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: updated,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message,
      });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const count = await NotificationsModel.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        message: `${count} notification(s) marked as read`,
        data: { count },
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all as read',
        error: error.message,
      });
    }
  }

  // Delete a notification
  async deleteNotification(req, res) {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const notificationId = req.params.id;

      const deleted = await NotificationsModel.deleteNotification(notificationId, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: error.message,
      });
    }
  }

  // Delete all notifications
  async deleteAllNotifications(req, res) {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const count = await NotificationsModel.deleteAllNotifications(userId);

      res.status(200).json({
        success: true,
        message: `${count} notification(s) deleted`,
        data: { count },
      });
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete all notifications',
        error: error.message,
      });
    }
  }

  // Delete read notifications only
  async deleteReadNotifications(req, res) {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const count = await NotificationsModel.deleteReadNotifications(userId);

      res.status(200).json({
        success: true,
        message: `${count} read notification(s) deleted`,
        data: { count },
      });
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete read notifications',
        error: error.message,
      });
    }
  }

  // Get notification counts
  async getNotificationCounts(req, res) {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const counts = await NotificationsModel.getNotificationCounts(userId);

      res.status(200).json({
        success: true,
        data: counts,
      });
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      res.status(200).json({
        success: true,
        data: { total: 0, unread: 0 },
      });
    }
  }

  // Create budget alert
  async createBudgetAlert(req, res) {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const { spent, total, threshold } = req.body;

      if (!spent || !total) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: spent, total',
        });
      }

      const percentage = (spent / total) * 100;

      if (threshold && percentage >= threshold) {
        const notification = await NotificationsModel.createBudgetAlert(
          userId,
          spent,
          total,
          percentage,
          threshold,
        );

        return res.status(201).json({
          success: true,
          message: 'Budget alert created',
          data: notification,
        });
      }

      res.status(200).json({
        success: true,
        message: 'No alert needed at this time',
      });
    } catch (error) {
      console.error('Error creating budget alert:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create budget alert',
        error: error.message,
      });
    }
  }
}

module.exports = new NotificationsController();
