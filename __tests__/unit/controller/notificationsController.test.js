jest.mock('../../../src/models/notificationsModel');

const NotificationsModel = require('../../../src/models/notificationsModel');
const controller = require('../../../src/controllers/notificationsController');

describe('NotificationsController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    req = { body: {}, params: {}, query: {} };
    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => jest.restoreAllMocks());

  test.each([
    ['getUnreadNotifications', 'getUnreadNotifications'],
    ['getAllNotifications', 'getAllNotifications'],
    ['createNotification', 'createNotification'],
    ['markAsRead', 'markAsRead'],
    ['markAllAsRead', 'markAllAsRead'],
    ['deleteNotification', 'deleteNotification'],
    ['deleteAllNotifications', 'deleteAllNotifications'],
    ['deleteReadNotifications', 'deleteReadNotifications'],
    ['getNotificationCounts', 'getNotificationCounts'],
    ['createBudgetAlert', 'createBudgetAlert'],
  ])('%s returns 401 without an authenticated user', async (method) => {
    await controller[method](req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User not authenticated' });
  });

  test('gets unread notifications and counts for the current user', async () => {
    res.locals.userId = 7;
    const notifications = [{ notification_id: 1, title: 'Warning' }];
    NotificationsModel.getUnreadNotifications.mockResolvedValueOnce(notifications);
    NotificationsModel.getNotificationCounts.mockResolvedValueOnce({ total: 2, unread: 1 });

    await controller.getUnreadNotifications(req, res);

    expect(NotificationsModel.getUnreadNotifications).toHaveBeenCalledWith(7);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { notifications, counts: { total: 2, unread: 1 } },
    });
  });

  test('uses supplied pagination values when getting all notifications', async () => {
    res.locals.userId = 7;
    req.query = { limit: '10', offset: '20' };
    NotificationsModel.getAllNotifications.mockResolvedValueOnce([]);
    NotificationsModel.getNotificationCounts.mockResolvedValueOnce({ total: 0, unread: 0 });

    await controller.getAllNotifications(req, res);

    expect(NotificationsModel.getAllNotifications).toHaveBeenCalledWith(7, 10, 20);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pagination: { limit: 10, offset: 20 } }),
      }),
    );
  });

  test('returns an empty successful response when fetching notifications fails', async () => {
    res.locals.userId = 7;
    const error = new Error('DB down');
    NotificationsModel.getUnreadNotifications.mockRejectedValueOnce(error);

    await controller.getUnreadNotifications(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { notifications: [], counts: { total: 0, unread: 0 } },
    });
  });

  test('returns an empty successful response with default pagination when getting all notifications fails', async () => {
    res.locals.userId = 7;
    const error = new Error('DB down');
    NotificationsModel.getAllNotifications.mockRejectedValueOnce(error);

    await controller.getAllNotifications(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        notifications: [],
        counts: { total: 0, unread: 0 },
        pagination: { limit: 50, offset: 0 },
      },
    });
  });

  test('validates required notification fields and notification type', async () => {
    res.locals.userId = 7;
    await controller.createNotification(req, res);
    expect(res.status).toHaveBeenCalledWith(400);

    res.status.mockClear();
    res.json.mockClear();
    req.body = { type: 'info', title: 'Title', message: 'Message' };
    await controller.createNotification(req, res);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid type. Must be warning or exceeded',
    });
  });

  test('creates a valid notification', async () => {
    res.locals.userId = 7;
    req.body = { type: 'WARNING', title: 'Near limit', message: 'You are near the limit' };
    const notification = { notification_id: 3, ...req.body };
    NotificationsModel.createNotification.mockResolvedValueOnce(notification);

    await controller.createNotification(req, res);

    expect(NotificationsModel.createNotification).toHaveBeenCalledWith(7, req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: notification }));
  });

  test('returns 500 when creating a notification fails', async () => {
    res.locals.userId = 7;
    req.body = { type: 'WARNING', title: 'Near limit', message: 'You are near the limit' };
    const error = new Error('DB down');
    NotificationsModel.createNotification.mockRejectedValueOnce(error);

    await controller.createNotification(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to create notification',
      error: error.message,
    });
  });

  test('returns 404 when a notification to mark read does not exist', async () => {
    res.locals.userId = 7;
    req.params.id = '99';
    NotificationsModel.markAsRead.mockResolvedValueOnce(undefined);

    await controller.markAsRead(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Notification not found' });
  });

  test('marks a notification as read', async () => {
    res.locals.userId = 7;
    req.params.id = '3';
    const updated = { notification_id: 3, read: true };
    NotificationsModel.markAsRead.mockResolvedValueOnce(updated);

    await controller.markAsRead(req, res);

    expect(NotificationsModel.markAsRead).toHaveBeenCalledWith('3', 7);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: updated }));
  });

  test('returns 500 when marking a notification as read fails', async () => {
    res.locals.userId = 7;
    req.params.id = '3';
    const error = new Error('DB down');
    NotificationsModel.markAsRead.mockRejectedValueOnce(error);

    await controller.markAsRead(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  });

  test.each([
    ['markAllAsRead', 'markAllAsRead', '3 notification(s) marked as read'],
    ['deleteAllNotifications', 'deleteAllNotifications', '3 notification(s) deleted'],
    ['deleteReadNotifications', 'deleteReadNotifications', '3 read notification(s) deleted'],
  ])('%s reports the number of affected notifications', async (method, modelMethod, message) => {
    res.locals.userId = 7;
    NotificationsModel[modelMethod].mockResolvedValueOnce(3);

    await controller[method](req, res);

    expect(NotificationsModel[modelMethod]).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({ success: true, message, data: { count: 3 } });
  });

  test('returns 500 when marking all notifications as read fails', async () => {
    res.locals.userId = 7;
    const error = new Error('DB down');
    NotificationsModel.markAllAsRead.mockRejectedValueOnce(error);

    await controller.markAllAsRead(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to mark all as read',
      error: error.message,
    });
  });

  test('returns 404 when a notification to delete does not exist', async () => {
    res.locals.userId = 7;
    req.params.id = '99';
    NotificationsModel.deleteNotification.mockResolvedValueOnce(undefined);

    await controller.deleteNotification(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('deletes a notification', async () => {
    res.locals.userId = 7;
    req.params.id = '3';
    NotificationsModel.deleteNotification.mockResolvedValueOnce(true);

    await controller.deleteNotification(req, res);

    expect(NotificationsModel.deleteNotification).toHaveBeenCalledWith('3', 7);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Notification deleted successfully',
    });
  });

  test('returns 500 when deleting a notification fails', async () => {
    res.locals.userId = 7;
    req.params.id = '3';
    const error = new Error('DB down');
    NotificationsModel.deleteNotification.mockRejectedValueOnce(error);

    await controller.deleteNotification(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to delete notification',
      error: error.message,
    });
  });

  test('returns 500 when deleting all notifications fails', async () => {
    res.locals.userId = 7;
    const error = new Error('DB down');
    NotificationsModel.deleteAllNotifications.mockRejectedValueOnce(error);

    await controller.deleteAllNotifications(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to delete all notifications',
      error: error.message,
    });
  });

  test('returns 500 when deleting read notifications fails', async () => {
    res.locals.userId = 7;
    const error = new Error('DB down');
    NotificationsModel.deleteReadNotifications.mockRejectedValueOnce(error);

    await controller.deleteReadNotifications(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to delete read notifications',
      error: error.message,
    });
  });

  test('returns notification counts', async () => {
    res.locals.userId = 7;
    NotificationsModel.getNotificationCounts.mockResolvedValueOnce({ total: 5, unread: 2 });

    await controller.getNotificationCounts(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: { total: 5, unread: 2 } });
  });

  test('returns empty counts when fetching notification counts fails', async () => {
    res.locals.userId = 7;
    const error = new Error('DB down');
    NotificationsModel.getNotificationCounts.mockRejectedValueOnce(error);

    await controller.getNotificationCounts(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { total: 0, unread: 0 },
    });
  });

  test('validates required budget alert fields', async () => {
    res.locals.userId = 7;
    req.body = { spent: 90 };

    await controller.createBudgetAlert(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing required fields: spent, total',
    });
  });

  test('creates a budget alert only after its threshold is reached', async () => {
    res.locals.userId = 7;
    req.body = { spent: 90, total: 100, threshold: 80 };
    const alert = { notification_id: 8 };
    NotificationsModel.createBudgetAlert.mockResolvedValueOnce(alert);

    await controller.createBudgetAlert(req, res);

    expect(NotificationsModel.createBudgetAlert).toHaveBeenCalledWith(7, 90, 100, 90, 80);
    expect(res.status).toHaveBeenCalledWith(201);

    res.status.mockClear();
    res.json.mockClear();
    req.body = { spent: 20, total: 100, threshold: 80 };
    await controller.createBudgetAlert(req, res);
    expect(NotificationsModel.createBudgetAlert).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 500 when creating a budget alert fails', async () => {
    res.locals.userId = 7;
    req.body = { spent: 90, total: 100, threshold: 80 };
    const error = new Error('DB down');
    NotificationsModel.createBudgetAlert.mockRejectedValueOnce(error);

    await controller.createBudgetAlert(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to create budget alert',
      error: error.message,
    });
  });
});
