const controller = require('../../../src/controllers/goalsController');
const model = require('../../../src/models/goalsModel');

// Explicitly mock model methods used in goalsController.js
jest.mock('../../../src/models/goalsModel', () => ({
  createGoal: jest.fn(),
  getGoalsByUserId: jest.fn(),
  updateGoalProgress: jest.fn(),
}));

describe('goalsController Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = {
      locals: { userId: 1 },
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  // 1. getGoals
  describe('getGoals', () => {
    it('should return 401 if res.locals.userId is missing', () => {
      res.locals.userId = null;
      controller.getGoals(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return goals list (200)', () => {
      const mockGoals = [{ id: 1, title: 'Save for Laptop' }];
      model.getGoalsByUserId.mockImplementation((userId, cb) => cb(null, { rows: mockGoals }));

      controller.getGoals(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockGoals);
    });

    it('should return 500 on model error', () => {
      model.getGoalsByUserId.mockImplementation((userId, cb) => cb(new Error('DB Error'), null));

      controller.getGoals(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // 2. createGoal
  describe('createGoal', () => {
    it('should return 401 if res.locals.userId is missing', () => {
      res.locals.userId = null;
      controller.createGoal(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 if required fields are missing', () => {
      req.body = { title: 'Trip' }; // Missing target_amount and target_date
      controller.createGoal(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create goal successfully (201)', () => {
      req.body = { title: 'Trip', target_amount: 1000, target_date: '2026-12-31' };
      model.createGoal.mockImplementation((data, cb) =>
        cb(null, { rows: [{ id: 2, ...req.body }] }),
      );

      controller.createGoal(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 500 on database error', () => {
      req.body = { title: 'Trip', target_amount: 1000, target_date: '2026-12-31' };
      model.createGoal.mockImplementation((data, cb) => cb(new Error('DB Error'), null));

      controller.createGoal(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // 3. depositToGoal
  describe('depositToGoal', () => {
    it('should return 401 if res.locals.userId is missing', () => {
      res.locals.userId = null;
      controller.depositToGoal(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid or non-positive amount', () => {
      req.body = { goal_id: 1, amount: -50 };
      controller.depositToGoal(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should deposit to goal successfully (200)', () => {
      req.body = { goal_id: 1, amount: 100 };
      model.updateGoalProgress.mockImplementation((data, cb) =>
        cb(null, { rows: [{ id: 1, current_amount: 100 }] }),
      );

      controller.depositToGoal(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if goal is not found', () => {
      req.body = { goal_id: 99, amount: 100 };
      model.updateGoalProgress.mockImplementation((data, cb) => cb(null, { rows: [] }));

      controller.depositToGoal(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on DB error', () => {
      req.body = { goal_id: 1, amount: 100 };
      model.updateGoalProgress.mockImplementation((data, cb) => cb(new Error('DB Error'), null));

      controller.depositToGoal(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
