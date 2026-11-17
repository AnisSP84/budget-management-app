const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/services/db');
const controller = require('../../src/controllers/goalsController');
const model = require('../../src/models/goalsModel');

let userToken = '';
let userId = null;

describe('goals route integration tests', () => {
  beforeEach(async () => {
    const timestamp = Date.now() + Math.floor(Math.random() * 1000000);
    const testUser = {
      username: `goaluser_${timestamp}`,
      email: `goaluser_${timestamp}@example.com`,
      password: 'Password123!',
    };

    // 1. Register a fresh user through your API to let the app generate the exact token structure
    let regRes = await request(app).post('/api/auth/register').send(testUser);

    // Fallback to login if registration alone doesn't return a token
    if (regRes.status === 201 || regRes.status === 200) {
      userToken = regRes.body.token || regRes.body.accessToken;
    }

    if (!userToken) {
      const loginRes = await request(app).post('/api/auth/login').send({
        username: testUser.username,
        password: testUser.password,
      });
      userToken = loginRes.body.token || loginRes.body.accessToken;
    }

    // 2. Fetch the newly created user's ID for direct DB checks in tests
    const userQuery = await pool.query('SELECT user_id FROM users WHERE username = $1', [
      testUser.username,
    ]);

    if (userQuery.rows.length > 0) {
      userId = userQuery.rows[0].user_id;
    }
  });

  afterEach(async () => {
    // Clean up goals and user created during test run
    if (userId) {
      await pool.query('DELETE FROM goals WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
    }
  });

  describe('POST /api/goals', () => {
    test('should return 401 if token is missing', async () => {
      const res = await request(app).post('/api/goals').send({
        title: 'Japan Trip',
        target_amount: 3000,
        target_date: '2026-12-31',
      });

      expect(res.status).toBe(401);
    });

    test('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Incomplete Goal',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Missing required fields: title, target_amount, target_date.');
    });

    test('should create a goal successfully (201)', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Emergency Savings',
          target_amount: 5000,
          current_amount: 500,
          target_date: '2026-12-31',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Goal created successfully.');
      expect(res.body.goal).toHaveProperty('goal_id');
      expect(res.body.goal.title).toBe('Emergency Savings');
      expect(Number(res.body.goal.target_amount)).toBe(5000);

      const dbCheck = await pool.query('SELECT * FROM goals WHERE user_id = $1', [userId]);
      expect(dbCheck.rows).toHaveLength(1);
    });
  });

  describe('GET /api/goals', () => {
    test('should return 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/goals');
      expect(res.status).toBe(401);
    });

    test('should return 200 and empty list when user has no goals', async () => {
      const res = await request(app).get('/api/goals').set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('should return 200 and user goals with progress_percentage', async () => {
      await pool.query(
        `INSERT INTO goals (user_id, title, target_amount, current_amount, target_date)
       VALUES ($1, 'New Car', 20000, 5000, '2027-01-01')`,
        [userId],
      );

      const res = await request(app).get('/api/goals').set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('New Car');
      expect(Number(res.body[0].progress_percentage)).toBe(25);
    });
  });

  describe('PUT /api/goals/deposit', () => {
    test('should return 401 if token is missing', async () => {
      const res = await request(app).put('/api/goals/deposit').send({
        goal_id: 1,
        amount: 100,
      });

      expect(res.status).toBe(401);
    });

    test('should return 400 if goal_id or amount is missing/invalid', async () => {
      const res = await request(app)
        .put('/api/goals/deposit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          goal_id: 1,
          amount: -50,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Valid goal_id and positive deposit amount required.');
    });

    test('should return 404 if goal_id does not exist for the user', async () => {
      const res = await request(app)
        .put('/api/goals/deposit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          goal_id: 99999,
          amount: 200,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Goal not found or access denied.');
    });

    test('should deposit funds and update current_amount in DB (200)', async () => {
      const seedRes = await pool.query(
        `INSERT INTO goals (user_id, title, target_amount, current_amount, target_date)
       VALUES ($1, 'House Downpayment', 50000, 1000, '2028-12-31')
       RETURNING goal_id`,
        [userId],
      );
      const goalId = seedRes.rows[0].goal_id;

      const res = await request(app)
        .put('/api/goals/deposit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          goal_id: goalId,
          amount: 1500,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Deposit successful.');
      expect(Number(res.body.goal.current_amount)).toBe(2500);

      const dbCheck = await pool.query('SELECT current_amount FROM goals WHERE goal_id = $1', [
        goalId,
      ]);
      expect(Number(dbCheck.rows[0].current_amount)).toBe(2500);
    });
  });
});

describe('goals report coverage without a shared database fixture', () => {
  const coverageUserId = 5151;

  function responseStub(locals = { userId: coverageUserId }) {
    return {
      locals,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each(['createGoal', 'getGoals', 'depositToGoal'])(
    '%s rejects unauthenticated requests',
    (method) => {
      const res = responseStub({});

      controller[method]({ body: {} }, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
    },
  );

  test('goal creation covers validation, default values, success, and failure', () => {
    for (const body of [
      { target_amount: 100, target_date: '2027-01-01' },
      { title: 'Goal', target_date: '2027-01-01' },
      { title: 'Goal', target_amount: 100 },
    ]) {
      const res = responseStub();
      controller.createGoal({ body }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    }

    const create = jest.spyOn(model, 'createGoal');
    create.mockImplementationOnce((data, callback) => callback(null, { rows: [{ goal_id: 1 }] }));
    const success = responseStub();
    controller.createGoal(
      {
        body: {
          title: 'Goal',
          target_amount: '100',
          current_amount: '25',
          target_date: '2027-01-01',
        },
      },
      success,
      jest.fn(),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ target_amount: 100, current_amount: 25 }),
      expect.any(Function),
    );
    expect(success.status).toHaveBeenCalledWith(201);

    create.mockImplementationOnce((data, callback) => callback(null, { rows: [{ goal_id: 2 }] }));
    const defaultAmount = responseStub();
    controller.createGoal(
      { body: { title: 'Goal', target_amount: '100', target_date: '2027-01-01' } },
      defaultAmount,
      jest.fn(),
    );
    expect(defaultAmount.status).toHaveBeenCalledWith(201);

    create.mockImplementationOnce((data, callback) => callback(new Error('unavailable')));
    const failure = responseStub();
    controller.createGoal(
      { body: { title: 'Goal', target_amount: '100', target_date: '2027-01-01' } },
      failure,
      jest.fn(),
    );
    expect(failure.status).toHaveBeenCalledWith(500);
  });

  test('goal reads return data and report model errors', () => {
    const getGoals = jest.spyOn(model, 'getGoalsByUserId');
    getGoals.mockImplementationOnce((id, callback) => callback(null, { rows: [{ goal_id: 1 }] }));
    const success = responseStub();
    controller.getGoals({ body: {} }, success, jest.fn());
    expect(success.status).toHaveBeenCalledWith(200);

    getGoals.mockImplementationOnce((id, callback) => callback(new Error('unavailable')));
    const failure = responseStub();
    controller.getGoals({ body: {} }, failure, jest.fn());
    expect(failure.status).toHaveBeenCalledWith(500);
  });

  test('goal deposits cover validation, missing goals, success, and failure', () => {
    for (const body of [
      { amount: 10 },
      { goal_id: 1 },
      { goal_id: 1, amount: 0 },
      { goal_id: 1, amount: -1 },
    ]) {
      const res = responseStub();
      controller.depositToGoal({ body }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    }

    const update = jest.spyOn(model, 'updateGoalProgress');
    update.mockImplementationOnce((data, callback) => callback(null, { rows: [] }));
    const missing = responseStub();
    controller.depositToGoal({ body: { goal_id: 1, amount: 10 } }, missing, jest.fn());
    expect(missing.status).toHaveBeenCalledWith(404);

    update.mockImplementationOnce((data, callback) => callback(null, { rows: [{ goal_id: 1 }] }));
    const success = responseStub();
    controller.depositToGoal({ body: { goal_id: 1, amount: '10' } }, success, jest.fn());
    expect(success.status).toHaveBeenCalledWith(200);

    update.mockImplementationOnce((data, callback) => callback(new Error('unavailable')));
    const failure = responseStub();
    controller.depositToGoal({ body: { goal_id: 1, amount: 10 } }, failure, jest.fn());
    expect(failure.status).toHaveBeenCalledWith(500);
  });

  test('goal model covers populated and default current amounts', () => {
    const query = jest.spyOn(pool, 'query').mockImplementation(() => {});
    const callback = jest.fn();

    model.createGoal(
      {
        user_id: coverageUserId,
        title: 'Goal',
        target_amount: 100,
        current_amount: 25,
        target_date: '2027-01-01',
      },
      callback,
    );
    expect(query).toHaveBeenLastCalledWith(
      expect.any(String),
      [coverageUserId, 'Goal', 100, 25, '2027-01-01'],
      callback,
    );

    model.createGoal(
      {
        user_id: coverageUserId,
        title: 'Goal',
        target_amount: 100,
        current_amount: 0,
        target_date: '2027-01-01',
      },
      callback,
    );
    expect(query).toHaveBeenLastCalledWith(
      expect.any(String),
      [coverageUserId, 'Goal', 100, 0, '2027-01-01'],
      callback,
    );
  });

  test('goal model forwards retrieval and deposit queries with their callbacks', () => {
    const query = jest.spyOn(pool, 'query').mockImplementation(() => {});
    const callback = jest.fn();

    model.getGoalsByUserId(coverageUserId, callback);
    expect(query).toHaveBeenLastCalledWith(expect.any(String), [coverageUserId], callback);

    model.updateGoalProgress({ user_id: coverageUserId, goal_id: 7, amount_to_add: 25 }, callback);
    expect(query).toHaveBeenLastCalledWith(expect.any(String), [25, 7, coverageUserId], callback);
  });
});

afterAll(async () => {
  await pool.end();
});
