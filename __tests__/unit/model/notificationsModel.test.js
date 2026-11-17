const pool = require('../../../src/services/db');
const NotificationsModel = require('../../../src/models/notificationsModel');

jest.mock('../../../src/services/db');

describe('NotificationsModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  test('gets unread notifications ordered newest first', async () => {
    const rows = [{ notification_id: 1, read: false }];
    pool.query.mockResolvedValueOnce({ rows });

    await expect(NotificationsModel.getUnreadNotifications(7)).resolves.toEqual(rows);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE user_id = \$1 AND read = false[\s\S]*ORDER BY created_at DESC/),
      [7],
    );
  });

  test('returns an empty list when unread query fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB down'));
    await expect(NotificationsModel.getUnreadNotifications(7)).resolves.toEqual([]);
  });

  test('gets all notifications with pagination', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await NotificationsModel.getAllNotifications(7, 10, 20);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT $2 OFFSET $3'),
      [7, 10, 20],
    );
  });

  test('uses default pagination values', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await NotificationsModel.getAllNotifications(7);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [7, 50, 0]);
  });

  test('returns an empty list when getting all notifications fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB down'));
    await expect(NotificationsModel.getAllNotifications(7)).resolves.toEqual([]);
  });

  test('converts count values returned by PostgreSQL to numbers', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ total: '4', unread: '2' }] });
    await expect(NotificationsModel.getNotificationCounts(7)).resolves.toEqual({
      total: 4,
      unread: 2,
    });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('COUNT(*) as total'), [7]);
  });

  test('uses zero counts when the count query fails or has no values', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{}] });
    await expect(NotificationsModel.getNotificationCounts(7)).resolves.toEqual({
      total: 0,
      unread: 0,
    });
    pool.query.mockRejectedValueOnce(new Error('DB down'));
    await expect(NotificationsModel.getNotificationCounts(7)).resolves.toEqual({
      total: 0,
      unread: 0,
    });
  });

  test('inserts a notification and returns its row', async () => {
    const row = { notification_id: 3, type: 'WARNING' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    await expect(
      NotificationsModel.createNotification(7, {
        type: 'WARNING',
        title: 'Near limit',
        message: 'Check budget',
      }),
    ).resolves.toEqual(row);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO notifications'), [
      7,
      'WARNING',
      'Near limit',
      'Check budget',
    ]);
  });

  test.each([
    ['createNotification', () => NotificationsModel.createNotification(7, { type: 'WARNING' })],
    ['markAsRead', () => NotificationsModel.markAsRead(3, 7)],
    ['markAllAsRead', () => NotificationsModel.markAllAsRead(7)],
    ['deleteNotification', () => NotificationsModel.deleteNotification(3, 7)],
    ['deleteAllNotifications', () => NotificationsModel.deleteAllNotifications(7)],
    ['deleteReadNotifications', () => NotificationsModel.deleteReadNotifications(7)],
  ])('%s propagates database errors', async (method, invoke) => {
    pool.query.mockRejectedValueOnce(new Error('DB down'));
    await expect(invoke()).rejects.toThrow('DB down');
  });

  test('marks one notification as read', async () => {
    const row = { notification_id: 3, read: true };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    await expect(NotificationsModel.markAsRead(3, 7)).resolves.toEqual(row);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE notification_id = $1'),
      [3, 7],
    );
  });

  test('deletes a single notification and returns its row', async () => {
    const row = { notification_id: 3 };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    await expect(NotificationsModel.deleteNotification(3, 7)).resolves.toEqual(row);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM notifications'),
      [3, 7],
    );
  });

  test.each([
    ['markAllAsRead', () => NotificationsModel.markAllAsRead(7), 'UPDATE notifications', [7]],
    [
      'deleteAllNotifications',
      () => NotificationsModel.deleteAllNotifications(7),
      'DELETE FROM notifications',
      [7],
    ],
    [
      'deleteReadNotifications',
      () => NotificationsModel.deleteReadNotifications(7),
      'read = true',
      [7],
    ],
  ])('%s returns the number of affected rows', async (method, invoke, queryPart, values) => {
    pool.query.mockResolvedValueOnce({ rowCount: 2, rows: [] });
    await expect(invoke()).resolves.toBe(2);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining(queryPart), values);
  });

  test('builds warning and overspending budget alerts', async () => {
    const spy = jest
      .spyOn(NotificationsModel, 'createNotification')
      .mockResolvedValue({ notification_id: 1 });

    await NotificationsModel.createBudgetAlert(7, 90, 100, 90, 80);
    expect(spy).toHaveBeenLastCalledWith(
      7,
      expect.objectContaining({
        type: 'WARNING',
        title: 'Budget Warning',
        message: expect.stringContaining('90.0%'),
      }),
    );

    await NotificationsModel.createBudgetAlert(7, 120, 100, 120, 80);
    expect(spy).toHaveBeenLastCalledWith(
      7,
      expect.objectContaining({
        type: 'EXCEEDED',
        title: 'Overspending Alert',
        message: expect.stringContaining('$120.00'),
      }),
    );
  });
});
