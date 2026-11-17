const express = require('express');
const router = express.Router();

const reportRoutes = require('./reportRoutes');
const userRoutes = require('./userRoutes');
const recurringRoutes = require('./recurringTransaction');
const transactionsRoutes = require('./transactionsRoutes');
const settingsRoutes = require('./settingsRoutes');
const notificationsRoutes = require('./notificationsRoutes');
const budgetRoutes = require('./budgetRoutes');
const authRoutes = require('./authRoutes');
const categoriesRoutes = require('./categoriesRoutes');
const goalsRoutes = require('./goalsRoutes');
const exportRoutes = require('./exportRoutes');

router.use('/report', reportRoutes);
router.use('/users', userRoutes);
router.use('/recurringTransactions', recurringRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/settings', settingsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/budget', budgetRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoriesRoutes);
router.use('/goals', goalsRoutes);
router.use('/export', exportRoutes);

module.exports = router;
