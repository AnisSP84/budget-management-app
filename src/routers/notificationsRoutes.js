const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { verifyToken } = require('../middleware/jwtMiddleware');

// Debug middleware to log requests
router.use((req, res, next) => {
  console.log(`[NOTIFICATIONS] ${req.method} ${req.url}`);
  next();
});

// TEMPORARILY COMMENT OUT verifyToken FOR TESTING
router.use(verifyToken);

// For testing - hardcode userId
router.use((req, res, next) => {
  res.locals.userId = 1; // Hardcode for testing
  next();
});

// Get all unread notifications
router.get('/unread', notificationsController.getUnreadNotifications.bind(notificationsController));

// Get all notifications (with pagination)
router.get('/all', notificationsController.getAllNotifications.bind(notificationsController));

// Get notification counts
router.get('/counts', notificationsController.getNotificationCounts.bind(notificationsController));

// Create a new notification
router.post('/', notificationsController.createNotification.bind(notificationsController));

// Create budget alert (triggered from budget page)
router.post(
  '/budget-alert',
  notificationsController.createBudgetAlert.bind(notificationsController),
);

// Mark a notification as read
router.put('/:id/read', notificationsController.markAsRead.bind(notificationsController));

// Mark all notifications as read
router.put('/read-all', notificationsController.markAllAsRead.bind(notificationsController));

// Delete all notifications
router.delete('/all', notificationsController.deleteAllNotifications.bind(notificationsController));

// Delete a notification
router.delete('/:id', notificationsController.deleteNotification.bind(notificationsController));

// Delete read notifications only
router.delete(
  '/read/clear',
  notificationsController.deleteReadNotifications.bind(notificationsController),
);

module.exports = router;
