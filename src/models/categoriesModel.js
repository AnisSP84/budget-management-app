const pool = require('../services/db');

// Check exists with user_id
module.exports.checkCategoryExists = (data, callback) => {
  const SQL = `
        SELECT category_id FROM categories
        WHERE category_id = $1
    `;

  pool.query(SQL, [data.category_id], callback);
};

// Get all
module.exports.selectAll = (callback) => {
  const SQL = `
        SELECT * FROM categories
        ORDER BY category_id ASC
    `;

  pool.query(SQL, callback);
};

// Get one
module.exports.selectCategory = (data, callback) => {
  const SQL = `
        SELECT * FROM categories
        WHERE category_id = $1
    `;

  pool.query(SQL, [data.category_id], callback);
};

// Insert
module.exports.insertCategory = (data, callback) => {
  const SQL = `
        INSERT INTO categories (category_name, category_type)
        VALUES ($1, $2)
        RETURNING *
    `;

  pool.query(SQL, [data.category_name, data.category_type], callback);
};

// Update
module.exports.updateCategory = (data, callback) => {
  const SQL = `
        UPDATE categories
        SET category_name = $1, category_type = $2
        WHERE category_id = $3
    `;

  pool.query(SQL, [data.category_name, data.category_type, data.category_id], callback);
};

// Delete
module.exports.deleteCategory = (data, callback) => {
  const SQL = `
        DELETE FROM categories
        WHERE category_id = $1
    `;

  pool.query(SQL, [data.category_id], callback);
};
