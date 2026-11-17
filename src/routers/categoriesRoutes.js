const express = require('express');
const router = express.Router();

const controller = require('../controllers/categoriesController');

// GET ALL CATEGORIES
router.get('/', controller.getAllCategories);

// GET CATEGORY BY ID
router.get('/:category_id', controller.getCategoryById);

// CREATE CATEGORY
router.post('/', controller.createCategory);

// UPDATE CATEGORY
router.put('/:category_id', controller.updateCategory);

// DELETE CATEGORY
router.delete('/:category_id', controller.deleteCategory);

router.use((req, res, next) => {
  console.log('Categories route:', req.method, req.originalUrl);
  next();
});

module.exports = router;
