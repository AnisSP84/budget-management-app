const express = require('express');
const router = express.Router();
const controller = require('../controllers/budgetController');
const { verifyToken } = require('../middleware/jwtMiddleware');

router.put('/', verifyToken, controller.updateBudget);
router.get('/', verifyToken, controller.getBudget);
router.get('/summary', verifyToken, controller.getCombinedBudgetData);
router.get('/analytics', verifyToken, controller.getCategoryAnalytics);
router.post('/notifications', verifyToken, controller.createAlertNotification);

module.exports = router;
