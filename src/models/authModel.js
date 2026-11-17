const pool = require('../services/db');

// Get row where username = placeholder if it exists
module.exports.checkExistingUsernames = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT * FROM users 
    WHERE username = $1;  
  `;

  const VALUES = [data.username];

  pool.query(SQLSTATEMENT, VALUES, callback);
};

// function to check if username or email exists
module.exports.checkUsernameOrEmailExist = (data, callback) => {
  const SQLSTATMENT = `
    SELECT * FROM users
    WHERE username = $1 OR email = $2
  `;

  const VALUES = [data.username, data.email];

  pool.query(SQLSTATMENT, VALUES, callback);
};

//function to create user
module.exports.createNewUser = (data, callback) => {
  const SQLSTATMENT = `
    INSERT INTO users (username, email, password)
    VALUES ($1, $2, $3)
    RETURNING user_id
    `;

  const VALUES = [data.username, data.email, data.password];

  pool.query(SQLSTATMENT, VALUES, callback);
};

//function to save refresh token in db
module.exports.saveRefreshToken = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO refresh_tokens(user_id,token,expires_at,created_at)
    VALUES ($1,$2,$3,$4)
    RETURNING token
    `;

  const VALUES = [data.userId, data.refreshToken, data.expiresAt, data.createdAt];

  pool.query(SQLSTATEMENT, VALUES, callback);
};

//function to query refresh token in db
module.exports.checkRefreshToken = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT *
    FROM refresh_tokens
    WHERE token = $1
  `;

  const VALUES = [data.refreshToken];

  pool.query(SQLSTATEMENT, VALUES, callback);
};
