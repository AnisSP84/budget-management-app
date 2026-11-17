const SettingsModel = require('../models/settingsModel');
const bcrypt = require('bcrypt');

const pepper = process.env.BCRYPT_PEPPER;
const saltRounds = 10;

// Currency data
const currencyData = {
  SG: { symbol: 'SGD $', code: 'SGD', display: 'SGD ($)' },
  MY: { symbol: 'MYR RM', code: 'MYR', display: 'MYR (RM)' },
  CN: { symbol: 'CNY ¥', code: 'CNY', display: 'CNY (¥)' },
  ID: { symbol: 'IDR Rp', code: 'IDR', display: 'IDR (Rp)' },
  KR: { symbol: 'KRW ₩', code: 'KRW', display: 'KRW (₩)' },
  JP: { symbol: 'JPY ¥', code: 'JPY', display: 'JPY (¥)' },
  TH: { symbol: 'THB ฿', code: 'THB', display: 'THB (฿)' },
  VN: { symbol: 'VND ₫', code: 'VND', display: 'VND (₫)' },
  PH: { symbol: 'PHP ₱', code: 'PHP', display: 'PHP (₱)' },
  HK: { symbol: 'HKD HK$', code: 'HKD', display: 'HKD (HK$)' },
};

const exchangeRates = {
  SG: 1.0,
  MY: 3.48,
  CN: 5.35,
  ID: 11850.0,
  KR: 1010.0,
  JP: 112.0,
  TH: 26.5,
  VN: 18500.0,
  PH: 43.0,
  HK: 5.8,
};

class SettingsController {
  // Get all settings for a user (combined users + user_settings)
  async getAllSettings(req, res) {
    try {
      const userId = res.locals.userId;

      const settings = await SettingsModel.getAllUserSettings(userId);

      if (!settings) {
        return res.status(404).json({
          success: false,
          message: 'Settings not found for this user',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          ...settings,
          currencyData,
          exchangeRates,
        },
      });
    } catch (error) {
      console.error('Error fetching all settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch settings',
        error: error.message,
      });
    }
  }

  // Get all settings for a user
  async getSettings(req, res) {
    try {
      const userId = res.locals.userId || req.params.userId;

      const settings = await SettingsModel.getUserSettings(userId);

      if (!settings) {
        return res.status(404).json({
          success: false,
          message: 'Settings not found for this user',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          ...settings,
          currencyData,
          exchangeRates,
        },
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch settings',
        error: error.message,
      });
    }
  }

  // Update user profile (username, email, password, name, dob, occupation)
  async updateProfile(req, res) {
    try {
      const userId = res.locals.userId;
      const { username, email, password, name, dob, occupation } = req.body;

      // Validate email if provided
      if (email && !email.includes('@')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address. Email must contain @ symbol',
        });
      }

      // Hash password if provided
      let passwordHash = null;
      if (password) {
        passwordHash = await bcrypt.hash(password + pepper, saltRounds);
      }

      const updates = {};
      if (username !== undefined) updates.username = username;
      if (email !== undefined) updates.email = email;
      if (passwordHash !== null) updates.passwordHash = passwordHash;
      if (name !== undefined) updates.name = name;
      if (dob !== undefined) updates.dob = dob;
      if (occupation !== undefined) updates.occupation = occupation;

      await SettingsModel.updateUserProfile(userId, updates);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message,
      });
    }
  }

  // Update user preferences
  async updatePreferences(req, res) {
    try {
      const userId = res.locals.userId;
      const { darkMode, countryCode, budgetNotification, warningThreshold } = req.body;

      const preferences = {};
      if (darkMode !== undefined) preferences.darkMode = darkMode;
      if (countryCode !== undefined) preferences.countryCode = countryCode;
      if (budgetNotification !== undefined) preferences.budgetNotification = budgetNotification;
      if (warningThreshold !== undefined) preferences.warningThreshold = warningThreshold;

      const updatedSettings = await SettingsModel.updateUserPreferences(userId, preferences);

      if (!updatedSettings) {
        return res.status(404).json({
          success: false,
          message: 'No updates provided or settings not found',
        });
      }

      const updatedExchangeRate = countryCode ? exchangeRates[countryCode] : null;

      res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        data: {
          ...updatedSettings,
          exchangeRate: updatedExchangeRate,
          currencyInfo: countryCode ? currencyData[countryCode] : null,
        },
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update preferences',
        error: error.message,
      });
    }
  }

  // Delete user settings
  async deleteSettings(req, res) {
    try {
      const userId = res.locals.userId || req.params.userId;
      const deletedSettings = await SettingsModel.deleteUserSettings(userId);

      if (!deletedSettings) {
        return res.status(404).json({
          success: false,
          message: 'Settings not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Settings deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete settings',
        error: error.message,
      });
    }
  }

  // Get currency and exchange rate data
  getCurrencyData(req, res) {
    try {
      res.status(200).json({
        success: true,
        data: {
          currencies: currencyData,
          exchangeRates: exchangeRates,
        },
      });
    } catch (error) {
      console.error('Error fetching currency data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch currency data',
        error: error.message,
      });
    }
  }
}

module.exports = new SettingsController();

module.exports.createUserSettingsCountry = (req, res, next) => {
  const data = {
    userId: res.locals.userId,
    country: req.body.country,
    dark_mode: req.body.dark_mode ?? false,
    budgetNotification: req.body.budgetNotification ?? true,
    warningThreshold: req.body.warningThreshold ?? 80,
  };

  const callback = (error, results, fields) => {
    if (error) {
      console.error('Error createUserSettingsCountry: ', error);
      return res.status(500).json(error);
    }
    next();
  };

  SettingsModel.createUserSettingsCountry(data, callback);
};

module.exports.queryCountries = (req, res, next) => {
  const callback = (error, results, fields) => {
    if (error) {
      console.error('Error queryCountries: ', error);
      return res.status(500).json(error);
    }

    res.locals.result = results.rows;

    next();
  };

  SettingsModel.queryCountries(callback);
};
