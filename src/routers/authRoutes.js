const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
// const userController = require('../controllers/userController');
const bcryptMiddleware = require('../middleware/bcryptMiddleware');
const jwtMiddleware = require('../middleware/jwtMiddleware');
// const response = require('../middleware/response');

router.post(
  '/login',
  authController.login,
  bcryptMiddleware.comparePassword,
  jwtMiddleware.generateToken,
  jwtMiddleware.generateRefreshToken,
  authController.issueRefreshToken,
  jwtMiddleware.sendToken,
);

// Create User.
router.post(
  '/register',
  authController.VerifyCaptcha,
  authController.checkUsernameOrEmailExist,
  bcryptMiddleware.hashPassword,
  authController.createNewUser,
  jwtMiddleware.generateToken,
  jwtMiddleware.generateRefreshToken,
  authController.issueRefreshToken,
  jwtMiddleware.sendToken,
);

router.post(
  '/refresh',
  jwtMiddleware.verifyExpiredToken,
  authController.checkRefreshToken,
  jwtMiddleware.verifyRefreshToken,
  jwtMiddleware.generateToken,
  jwtMiddleware.sendToken,
);

module.exports = router;
