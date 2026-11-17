const express = require('express');
const router = express.Router();
const controller = require('../controllers/exportController');
const { verifyToken } = require('../middleware/jwtMiddleware');

// Endpoint to download CSV summary
router.get('/csv', verifyToken, controller.exportFinancialSummaryCSV);

module.exports = router;
