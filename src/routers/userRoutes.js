const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// Get user by local userId
router.get(
  '/',
  jwtMiddleware.verifyToken,
  userController.readUserById,
  userController.returnUserDetails,
);

module.exports = router;
