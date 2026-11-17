const model = require('../models/categoriesModel');

// Check if category exists and belongs to user (middleware)
module.exports.checkCategoryExists = (req, res, next) => {
  const category_id = req.params.category_id || req.body.category_id;
  const user_id = res.locals.userId; // Get user ID from token

  if (!category_id) {
    return res.status(400).json({
      message: 'Error: category_id is undefined',
    });
  }

  const data = { category_id, user_id };

  const callback = (error, results) => {
    if (error) {
      console.error('Error checkCategoryExists:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!results.rows || results.rows.length === 0) {
      return res.status(404).json({ message: 'Category Not Found.' });
    }

    next();
  };

  model.checkCategoryExists(data, callback);
};

// Get all categories
module.exports.getAllCategories = (req, res, next) => {
  const callback = (error, results) => {
    if (error) {
      console.error('Error getAllCategories:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
    return res.status(200).json(results);
  };

  model.selectAll(callback);
};

// Get category by ID
module.exports.getCategoryById = (req, res, next) => {
  const data = {
    category_id: req.params.category_id || req.body.category_id,
  };

  const callback = (error, results) => {
    if (error) {
      console.error('Error getCategoryById:', error);
      return res.status(500).json(error);
    }

    if (!results.rows || results.rows.length === 0) {
      return res.status(404).json({
        message: 'Category not found',
      });
    }

    return res.status(200).json(results.rows[0]);
  };

  model.selectCategory(data, callback);
};

// Create category
module.exports.createCategory = (req, res, next) => {
  if (req.body.category_name == undefined || req.body.category_type == undefined) {
    return res.status(400).json({
      message: 'Missing required data.',
    });
  }

  const data = {
    category_name: req.body.category_name,
    category_type: req.body.category_type,
  };

  const callback = (error, results) => {
    if (error) {
      console.error('Error createCategory:', error);
      return res.status(500).json(error);
    }

    return res.status(201).json({
      category_id: results.rows[0].category_id,
      category_name: data.category_name,
      category_type: data.category_type,
    });
  };

  model.insertCategory(data, callback);
};

// Update category
module.exports.updateCategory = (req, res, next) => {
  if (req.body.category_name == undefined || req.body.category_type == undefined) {
    return res.status(400).json({
      message: 'Missing required fields',
    });
  }

  const data = {
    category_id: req.params.category_id,
    category_name: req.body.category_name,
    category_type: req.body.category_type,
  };

  const callback = (error, results) => {
    if (error) {
      console.error('Error updateCategory:', error);
      return res.status(500).json(error);
    }

    if (results.rowCount === 0) {
      return res.status(404).json({
        message: 'Category not found',
      });
    }

    return res.status(200).json({
      message: 'Category updated successfully',
    });
  };

  model.updateCategory(data, callback);
};

// Delete category
module.exports.deleteCategory = (req, res, next) => {
  const data = {
    category_id: req.params.category_id,
  };

  const callback = (error, results) => {
    if (error) {
      console.error('Error deleteCategory:', error);
      return res.status(500).json(error);
    }

    if (results.rowCount === 0) {
      return res.status(404).json({
        message: 'Category not found',
      });
    }

    return res.status(204).json();
  };

  model.deleteCategory(data, callback);
};
