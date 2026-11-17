const pool = require('../services/db');

class NotificationsModel {
  // Get all unread notifications for a user
  static async getUnreadNotifications(userId) {
    try {
      const query = `
        SELECT notification_id, user_id, type, title, message, read, created_at
        FROM notifications 
        WHERE user_id = $1 AND read = false
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Database error in getUnreadNotifications:', error.message);
      // Return empty array if table doesn't exist yet
      return [];
    }
  }

  // Get all notifications for a user (with pagination)
  static async getAllNotifications(userId, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT notification_id, user_id, type, title, message, read, created_at
        FROM notifications 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Database error in getAllNotifications:', error.message);
      return [];
    }
  }

  // Get notification count (unread vs total)
  static async getNotificationCounts(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN read = false THEN 1 ELSE 0 END) as unread
        FROM notifications 
        WHERE user_id = $1
      `;
      const result = await pool.query(query, [userId]);
      return {
        total: parseInt(result.rows[0]?.total) || 0,
        unread: parseInt(result.rows[0]?.unread) || 0,
      };
    } catch (error) {
      console.error('Database error in getNotificationCounts:', error.message);
      return { total: 0, unread: 0 };
    }
  }

  // Create a new notification
  static async createNotification(userId, notificationData) {
    const { type, title, message } = notificationData;

    try {
      const query = `
        INSERT INTO notifications 
        (user_id, type, title, message, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING notification_id, user_id, type, title, message, read, created_at
      `;
      const values = [userId, type, title, message];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Database error in createNotification:', error.message);
      throw error;
    }
  }

  // Mark a single notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const query = `
        UPDATE notifications 
        SET read = true, updated_at = CURRENT_TIMESTAMP
        WHERE notification_id = $1 AND user_id = $2
        RETURNING notification_id, read, updated_at
      `;
      const result = await pool.query(query, [notificationId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Database error in markAsRead:', error.message);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      const query = `
        UPDATE notifications 
        SET read = true, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND read = false
        RETURNING notification_id
      `;
      const result = await pool.query(query, [userId]);
      return result.rowCount;
    } catch (error) {
      console.error('Database error in markAllAsRead:', error.message);
      throw error;
    }
  }

  // Delete a single notification
  static async deleteNotification(notificationId, userId) {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE notification_id = $1 AND user_id = $2
        RETURNING notification_id
      `;
      const result = await pool.query(query, [notificationId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Database error in deleteNotification:', error.message);
      throw error;
    }
  }

  // Delete all notifications for a user
  static async deleteAllNotifications(userId) {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE user_id = $1
        RETURNING notification_id
      `;
      const result = await pool.query(query, [userId]);
      return result.rowCount;
    } catch (error) {
      console.error('Database error in deleteAllNotifications:', error.message);
      throw error;
    }
  }

  // Delete read notifications only
  static async deleteReadNotifications(userId) {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE user_id = $1 AND read = true
        RETURNING notification_id
      `;
      const result = await pool.query(query, [userId]);
      return result.rowCount;
    } catch (error) {
      console.error('Database error in deleteReadNotifications:', error.message);
      throw error;
    }
  }

  // Create budget alert notification based on spending
  static async createBudgetAlert(userId, spent, total, percentage, threshold) {
    const type = percentage >= 100 ? 'EXCEEDED' : 'WARNING';
    const title = percentage >= 100 ? 'Overspending Alert' : 'Budget Warning';
    const message =
      percentage >= 100
        ? `You have exceeded your budget! Current spending: $${spent.toFixed(2)} / $${total.toFixed(2)}`
        : `You have used ${percentage.toFixed(1)}% of your budget (${threshold}% threshold reached).`;

    return await this.createNotification(userId, { type, title, message });
  }
}

module.exports = NotificationsModel;
