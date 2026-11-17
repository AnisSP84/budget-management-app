const pool = require('../services/db');

module.exports.createGoal = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO goals (user_id, title, target_amount, current_amount, target_date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const VALUES = [
    data.user_id,
    data.title,
    data.target_amount,
    data.current_amount || 0.0,
    data.target_date,
  ];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.getGoalsByUserId = (userId, callback) => {
  const SQLSTATEMENT = `
    SELECT 
      goal_id,
      title,
      target_amount,
      current_amount,
      target_date,
      ROUND((current_amount / NULLIF(target_amount, 0)) * 100, 1) AS progress_percentage
    FROM goals
    WHERE user_id = $1
    ORDER BY target_date ASC;
  `;
  pool.query(SQLSTATEMENT, [userId], callback);
};

module.exports.updateGoalProgress = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE goals 
    SET current_amount = current_amount + $1 
    WHERE goal_id = $2 AND user_id = $3
    RETURNING *;
  `;
  const VALUES = [data.amount_to_add, data.goal_id, data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};
