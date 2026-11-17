const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactionsController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// --- Transaction Routes ---

// Create Transaction
router.post('/', jwtMiddleware.verifyToken, transactionsController.createTransaction);

// Get all Transactions
router.get('/', jwtMiddleware.verifyToken, transactionsController.getAllTransactions);

// Update Transaction
router.put('/:id', jwtMiddleware.verifyToken, transactionsController.updateTransaction);

// Delete Multiple Transactions
router.delete('/bulk', jwtMiddleware.verifyToken, transactionsController.deleteBulk);

// Delete Single Transaction
router.delete('/:id', jwtMiddleware.verifyToken, transactionsController.deleteTransaction);

// --- Budget Routes ---

// Get User Budget
router.get('/budget', jwtMiddleware.verifyToken, transactionsController.getUserBudget);

// Update or Create User Budget
router.post('/budget', jwtMiddleware.verifyToken, transactionsController.updateBudget);

module.exports = router;
