const pool = require('../services/db');

class SettingsModel {
  // Get all user settings (combined users + user_settings)
  static async getAllUserSettings(userId) {
    const query = `
      SELECT 
        u.user_id as user_id,
        u.username,
        u.email,
        u.name,
        u.dob,
        u.occupation,
        us.dark_mode,
        us.country_code,
        us.budget_notification,
        us.warning_threshold
      FROM users u
      LEFT JOIN user_settings us ON u.user_id = us.user_id
      WHERE u.user_id = $1
    `;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  // Get user settings by user ID
  static async getUserSettings(userId) {
    const query = `
      SELECT user_id, dark_mode, country_code, budget_notification, warning_threshold
      FROM user_settings 
      WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  // Update user profile (username, email, password, name, dob, occupation)
  static async updateUserProfile(userId, updates) {
    const { username, email, passwordHash, name, dob, occupation } = updates;
    const updateFields = [];
    const values = [];
    let paramCounter = 1;

    if (username !== undefined) {
      updateFields.push(`username = $${paramCounter++}`);
      values.push(username);
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramCounter++}`);
      values.push(email);
    }

    if (passwordHash) {
      updateFields.push(`password = $${paramCounter++}`);
      values.push(passwordHash);
    }

    if (name !== undefined) {
      updateFields.push(`name = $${paramCounter++}`);
      values.push(name);
    }

    if (dob !== undefined) {
      updateFields.push(`dob = $${paramCounter++}`);
      values.push(dob);
    }

    if (occupation !== undefined) {
      updateFields.push(`occupation = $${paramCounter++}`);
      values.push(occupation);
    }

    if (updateFields.length === 0) return null;

    values.push(userId);

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramCounter}
      RETURNING user_id, username, email, name, dob, occupation
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Update user preferences
  static async updateUserPreferences(userId, preferences) {
    const { darkMode, countryCode, budgetNotification, warningThreshold } = preferences;
    const updateFields = [];
    const values = [];
    let paramCounter = 1;

    if (darkMode !== undefined) {
      updateFields.push(`dark_mode = $${paramCounter++}`);
      values.push(darkMode);
    }

    if (countryCode !== undefined) {
      updateFields.push(`country_code = $${paramCounter++}`);
      values.push(countryCode);
    }

    if (budgetNotification !== undefined) {
      updateFields.push(`budget_notification = $${paramCounter++}`);
      values.push(budgetNotification);
    }

    if (warningThreshold !== undefined) {
      updateFields.push(`warning_threshold = $${paramCounter++}`);
      values.push(warningThreshold);
    }

    if (updateFields.length === 0) return null;

    values.push(userId);

    const query = `
      UPDATE user_settings 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramCounter}
      RETURNING user_id, dark_mode, country_code, budget_notification, warning_threshold
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Delete user settings
  static async deleteUserSettings(userId) {
    const query = 'DELETE FROM user_settings WHERE user_id = $1 RETURNING user_id';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = SettingsModel;

module.exports.createUserSettingsCountry = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO user_settings (
      user_id,
      country_code,
      dark_mode,
      budget_notification,
      warning_threshold
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id)
    DO UPDATE SET
      country_code = EXCLUDED.country_code,
      dark_mode = EXCLUDED.dark_mode,
      budget_notification = EXCLUDED.budget_notification,
      warning_threshold = EXCLUDED.warning_threshold;
  `;

  const VALUES = [
    data.userId,
    data.country,
    data.dark_mode,
    data.budgetNotification,
    data.warningThreshold,
  ];

  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.queryCountries = (callback) => {
  const SQLSTATMENT = `
    SELECT * FROM countries
  `;

  pool.query(SQLSTATMENT, callback);
};
