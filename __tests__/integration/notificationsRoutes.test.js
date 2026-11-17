const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const pool = require('../../src/services/db');
const NotificationsController = require('../../src/controllers/notificationsController');
const NotificationsModel = require('../../src/models/notificationsModel');

const notificationsUserId = 1;
const testTitlePrefix = 'Integration test: notifications';

function authToken() {
  return jwt.sign({ userId: notificationsUserId }, process.env.JWT_SECRET_KEY, {
    algorithm: process.env.JWT_ALGORITHM,
    expiresIn: '1h',
  });
}

function authenticated(requestBuilder) {
  return requestBuilder.set('Authorization', `Bearer ${authToken()}`);
}

async function insertNotification({ title, message = 'Integration test message', read = false }) {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, read)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING notification_id, read`,
    [notificationsUserId, 'WARNING', title, message, read],
  );
  return result.rows[0];
}

beforeEach(async () => {
  await pool.query(
    `INSERT INTO users (user_id, username, email, password)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id)
     DO UPDATE SET username = EXCLUDED.username, email = EXCLUDED.email, password = EXCLUDED.password`,
    [
      notificationsUserId,
      'notification-coverage-user',
      'notification-coverage@example.com',
      'not-used-by-this-test',
    ],
  );
  await pool.query('DELETE FROM notifications WHERE title LIKE $1', [`${testTitlePrefix}%`]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await pool.query('DELETE FROM notifications WHERE title LIKE $1', [`${testTitlePrefix}%`]);
  await pool.end();
});

describe('notifications routes', () => {
  test('GET /api/notifications/unread rejects a request without a JWT', async () => {
    const response = await request(app).get('/api/notifications/unread');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'No token provided' });
  });

  test('GET /api/notifications/unread returns unread notifications and counts', async () => {
    const title = `${testTitlePrefix}: unread`;
    await insertNotification({ title });

    const response = await authenticated(request(app).get('/api/notifications/unread'));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.notifications).toEqual(
      expect.arrayContaining([expect.objectContaining({ title, read: false })]),
    );
    expect(response.body.data.counts).toEqual(
      expect.objectContaining({ total: expect.any(Number), unread: expect.any(Number) }),
    );
  });

  test('GET /api/notifications/all returns paginated notifications and counts', async () => {
    await insertNotification({ title: `${testTitlePrefix}: paginated` });

    const response = await authenticated(
      request(app).get('/api/notifications/all?limit=1&offset=0'),
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          notifications: expect.any(Array),
          counts: expect.objectContaining({ total: expect.any(Number) }),
          pagination: { limit: 1, offset: 0 },
        }),
      }),
    );
  });

  test('GET /api/notifications/counts returns the authenticated user notification totals', async () => {
    await insertNotification({ title: `${testTitlePrefix}: counts`, read: false });

    const response = await authenticated(request(app).get('/api/notifications/counts'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({ total: expect.any(Number), unread: expect.any(Number) }),
    });
  });

  test('POST /api/notifications creates and persists a valid notification', async () => {
    const title = `${testTitlePrefix}: created`;
    const response = await authenticated(request(app).post('/api/notifications')).send({
      type: 'WARNING',
      title,
      message: 'Created through the real notifications route',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Notification created successfully',
        data: expect.objectContaining({ title, user_id: notificationsUserId, read: false }),
      }),
    );

    const result = await pool.query(
      'SELECT title, message, type, read FROM notifications WHERE notification_id = $1',
      [response.body.data.notification_id],
    );
    expect(result.rows[0]).toEqual({
      title,
      message: 'Created through the real notifications route',
      type: 'WARNING',
      read: false,
    });
  });

  test('POST /api/notifications rejects an unsupported notification type', async () => {
    const response = await authenticated(request(app).post('/api/notifications')).send({
      type: 'INFO',
      title: `${testTitlePrefix}: invalid`,
      message: 'This type is not supported by the controller',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid type. Must be warning or exceeded',
    });
  });

  test('POST /api/notifications validates required fields', async () => {
    const response = await authenticated(request(app).post('/api/notifications')).send({
      type: 'WARNING',
      title: `${testTitlePrefix}: incomplete`,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Missing required fields: type, title, message',
    });
  });

  test('POST /api/notifications/budget-alert validates spending information', async () => {
    const response = await authenticated(request(app).post('/api/notifications/budget-alert')).send(
      {
        spent: 75,
      },
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Missing required fields: spent, total',
    });
  });

  test('POST /api/notifications/budget-alert does not create an alert below its threshold', async () => {
    const response = await authenticated(request(app).post('/api/notifications/budget-alert')).send(
      {
        spent: 40,
        total: 100,
        threshold: 80,
      },
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'No alert needed at this time' });
  });

  test('POST /api/notifications/budget-alert creates warning and overspending alerts', async () => {
    const warning = await authenticated(request(app).post('/api/notifications/budget-alert')).send({
      spent: 90,
      total: 100,
      threshold: 80,
    });
    const exceeded = await authenticated(request(app).post('/api/notifications/budget-alert')).send(
      {
        spent: 120,
        total: 100,
        threshold: 80,
      },
    );

    expect(warning.status).toBe(201);
    expect(warning.body.data).toEqual(
      expect.objectContaining({ type: 'WARNING', title: 'Budget Warning' }),
    );
    expect(exceeded.status).toBe(201);
    expect(exceeded.body.data).toEqual(
      expect.objectContaining({ type: 'EXCEEDED', title: 'Overspending Alert' }),
    );
  });

  test('PUT /api/notifications/:id/read marks an owned notification as read', async () => {
    const notification = await insertNotification({ title: `${testTitlePrefix}: mark-read` });
    const response = await authenticated(
      request(app).put(`/api/notifications/${notification.notification_id}/read`),
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Notification marked as read',
        data: expect.objectContaining({
          notification_id: notification.notification_id,
          read: true,
        }),
      }),
    );

    const result = await pool.query('SELECT read FROM notifications WHERE notification_id = $1', [
      notification.notification_id,
    ]);
    expect(result.rows[0].read).toBe(true);
  });

  test('PUT /api/notifications/:id/read returns 404 for a notification the user does not own', async () => {
    const response = await authenticated(request(app).put('/api/notifications/999999/read'));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Notification not found' });
  });

  test('DELETE /api/notifications/:id returns 404 for a notification the user does not own', async () => {
    const response = await authenticated(request(app).delete('/api/notifications/999999'));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Notification not found' });
  });

  test('DELETE /api/notifications/:id removes an owned notification', async () => {
    const notification = await insertNotification({ title: `${testTitlePrefix}: delete-one` });

    const response = await authenticated(
      request(app).delete(`/api/notifications/${notification.notification_id}`),
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Notification deleted successfully',
    });
  });

  test('PUT /api/notifications/read-all marks every unread notification as read', async () => {
    const first = await insertNotification({ title: `${testTitlePrefix}: read-all-one` });
    const second = await insertNotification({ title: `${testTitlePrefix}: read-all-two` });

    const response = await authenticated(request(app).put('/api/notifications/read-all'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ count: expect.any(Number) }),
      }),
    );

    const result = await pool.query(
      'SELECT notification_id, read FROM notifications WHERE notification_id = ANY($1::int[]) ORDER BY notification_id',
      [[first.notification_id, second.notification_id]],
    );
    expect(result.rows).toEqual([
      { notification_id: first.notification_id, read: true },
      { notification_id: second.notification_id, read: true },
    ]);
  });

  test('DELETE /api/notifications/read/clear removes only read notifications', async () => {
    const readNotification = await insertNotification({
      title: `${testTitlePrefix}: clear-read`,
      read: true,
    });
    const unreadNotification = await insertNotification({
      title: `${testTitlePrefix}: keep-unread`,
      read: false,
    });

    const response = await authenticated(request(app).delete('/api/notifications/read/clear'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({ success: true, data: { count: expect.any(Number) } }),
    );

    const result = await pool.query(
      'SELECT notification_id FROM notifications WHERE notification_id = ANY($1::int[])',
      [[readNotification.notification_id, unreadNotification.notification_id]],
    );
    expect(result.rows).toEqual([{ notification_id: unreadNotification.notification_id }]);
  });

  test('DELETE /api/notifications/all removes every notification owned by the user', async () => {
    await insertNotification({ title: `${testTitlePrefix}: delete-all-one` });
    await insertNotification({ title: `${testTitlePrefix}: delete-all-two`, read: true });

    const response = await authenticated(request(app).delete('/api/notifications/all'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({ success: true, data: { count: expect.any(Number) } }),
    );

    const result = await pool.query(
      'SELECT notification_id FROM notifications WHERE user_id = $1',
      [notificationsUserId],
    );
    expect(result.rows).toEqual([]);
  });

  test.each([
    ['GET /unread', () => authenticated(request(app).get('/api/notifications/unread')), 200],
    ['GET /all', () => authenticated(request(app).get('/api/notifications/all')), 200],
    ['GET /counts', () => authenticated(request(app).get('/api/notifications/counts')), 200],
    [
      'POST /',
      () =>
        authenticated(request(app).post('/api/notifications')).send({
          type: 'WARNING',
          title: `${testTitlePrefix}: database-error`,
          message: 'Database error coverage',
        }),
      500,
    ],
    ['PUT /:id/read', () => authenticated(request(app).put('/api/notifications/999999/read')), 500],
    ['PUT /read-all', () => authenticated(request(app).put('/api/notifications/read-all')), 500],
    ['DELETE /:id', () => authenticated(request(app).delete('/api/notifications/999999')), 500],
    ['DELETE /all', () => authenticated(request(app).delete('/api/notifications/all')), 500],
    [
      'DELETE /read/clear',
      () => authenticated(request(app).delete('/api/notifications/read/clear')),
      500,
    ],
    [
      'POST /budget-alert',
      () =>
        authenticated(request(app).post('/api/notifications/budget-alert')).send({
          spent: 90,
          total: 100,
          threshold: 80,
        }),
      500,
    ],
  ])(
    '%s returns its documented fallback when the database is unavailable',
    async (route, send, status) => {
      jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Database unavailable'));

      const response = await send();

      expect(response.status).toBe(status);
    },
  );

  test.each([
    [
      'GET /unread',
      'getUnreadNotifications',
      () => authenticated(request(app).get('/api/notifications/unread')),
    ],
    [
      'GET /all',
      'getAllNotifications',
      () => authenticated(request(app).get('/api/notifications/all')),
    ],
    [
      'GET /counts',
      'getNotificationCounts',
      () => authenticated(request(app).get('/api/notifications/counts')),
    ],
  ])('%s returns a safe response when %s rejects', async (route, modelMethod, send) => {
    jest
      .spyOn(NotificationsModel, modelMethod)
      .mockRejectedValueOnce(new Error('Database unavailable'));

    const response = await send();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test.each([
    'getUnreadNotifications',
    'getAllNotifications',
    'createNotification',
    'markAsRead',
    'markAllAsRead',
    'deleteNotification',
    'deleteAllNotifications',
    'deleteReadNotifications',
    'getNotificationCounts',
    'createBudgetAlert',
  ])('%s returns 401 when the controller has no authenticated user', async (method) => {
    const req = { body: {}, params: {}, query: {} };
    const res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await NotificationsController[method](req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('notification model applies its default pagination values', async () => {
    await expect(NotificationsModel.getAllNotifications(notificationsUserId)).resolves.toEqual(
      expect.any(Array),
    );
  });

  test('controller returns the delete-success response for an owned notification', async () => {
    const deleteNotification = jest
      .spyOn(NotificationsModel, 'deleteNotification')
      .mockResolvedValueOnce({ notification_id: 1 });
    const res = {
      locals: { userId: notificationsUserId },
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await NotificationsController.deleteNotification({ params: { id: '1' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Notification deleted successfully',
    });
    deleteNotification.mockRestore();
  });

  test('controller returns the create-success response for a valid notification', async () => {
    const notification = { notification_id: 1, title: 'Created notification' };
    const createNotification = jest
      .spyOn(NotificationsModel, 'createNotification')
      .mockResolvedValueOnce(notification);
    const res = {
      locals: { userId: notificationsUserId },
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const req = {
      body: {
        type: 'WARNING',
        title: notification.title,
        message: 'Created by the controller test',
      },
    };

    await NotificationsController.createNotification(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Notification created successfully',
      data: notification,
    });
    createNotification.mockRestore();
  });
});
