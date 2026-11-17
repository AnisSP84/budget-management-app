const express = require('express');
const router = express.Router();
const recurringController = require('../controllers/recurringController');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const categoryController = require('../controllers/categoriesController');

// All routes require token
router.use(jwtMiddleware.verifyToken);

//add new recurring transaction
router.post(
  '/',
  categoryController.checkCategoryExists,
  recurringController.createRecurringTransaction,
);

//get all recurring transactions
router.get('/', recurringController.getRecurringTransactions);

//get recurring transaction by id
router.get('/:id', recurringController.getRecurringTransactionById);

//update recurring transaction by id
router.put(
  '/:id',
  categoryController.checkCategoryExists,
  recurringController.updateRecurringTransaction,
);

//delete recurring transaction by id
router.delete('/:id', recurringController.deleteRecurringTransaction);

//process recurring transactions
router.post('/process', recurringController.processRecurringTransactions);

module.exports = router;
