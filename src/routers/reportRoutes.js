const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

//summary report(weekly/monthly/yearly)
router.get('/summary', jwtMiddleware.verifyToken, reportController.getSummaryReport);

router.get('/category', jwtMiddleware.verifyToken, reportController.getCategoryBreakdown);

//summary for spending and income
router.get('/dashboard-summary', jwtMiddleware.verifyToken, reportController.getDashboardSummary);

//download report
router.get('/export/csv', jwtMiddleware.verifyToken, reportController.exportCSV);

module.exports = router;
