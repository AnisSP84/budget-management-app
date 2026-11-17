const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const settingsController = require('../controllers/settingsController');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const response = require('../middleware/response');

// Routes with JWT verification

// Initialize settings for a new user
router.post(
  '/initSettings',
  jwtMiddleware.verifyToken,
  userController.readUserById,
  settingsController.createUserSettingsCountry,
  response.withMessage('Successfully Initialized Settings', 201),
  response.sendResponse,
);

// Get all countries
router.get(
  '/countries',
  settingsController.queryCountries,
  response.withMessage('Successfully Queried Countries', 200),
  response.sendResponse,
);

// NEW: Get all settings (combined users + user_settings data) - for initial page load
router.get(
  '/all',
  jwtMiddleware.verifyToken,
  settingsController.getAllSettings.bind(settingsController),
);

// Get all settings for a user (legacy)
router.get(
  '/:userId',
  jwtMiddleware.verifyToken,
  settingsController.getSettings.bind(settingsController),
);

// Update profile only
router.patch(
  '/profile',
  jwtMiddleware.verifyToken,
  settingsController.updateProfile.bind(settingsController),
);

// Update preferences only
router.patch(
  '/preferences',
  jwtMiddleware.verifyToken,
  settingsController.updatePreferences.bind(settingsController),
);

// Delete settings
router.delete(
  '/:userId',
  jwtMiddleware.verifyToken,
  settingsController.deleteSettings.bind(settingsController),
);

// Get currency data (public route)
router.get('/currency/data', settingsController.getCurrencyData.bind(settingsController));

module.exports = router;
