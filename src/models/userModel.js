const pool = require('../services/db');

// Select row where user_id = placeholder
module.exports.readUserById = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT * FROM users
    WHERE user_id = $1;
  `;

  const VALUES = [data.userId];
  pool.query(SQLSTATEMENT, VALUES, callback);
};
