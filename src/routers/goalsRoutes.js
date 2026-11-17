const express = require('express');
const router = express.Router();
const controller = require('../controllers/goalsController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

router.post('/', jwtMiddleware.verifyToken, controller.createGoal);
router.get('/', jwtMiddleware.verifyToken, controller.getGoals);
router.put('/deposit', jwtMiddleware.verifyToken, controller.depositToGoal);

module.exports = router;
