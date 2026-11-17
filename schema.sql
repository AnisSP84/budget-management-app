-- ─────────────────────────────────────────────────────────
--  Database Schema
-- ─────────────────────────────────────────────────────────
--  Single source of truth for the database structure.
--  Update this file whenever you add, remove, or change
--  tables, columns, or indexes.
--
--  Used by: scripts/reset.js
-- ─────────────────────────────────────────────────────────

-- Drop existing tables
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS recurring_transactions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS goals CASCADE;

DROP TYPE IF EXISTS sex_enum;
DROP TYPE IF EXISTS category_enum;
DROP TYPE IF EXISTS notification_enum;
DROP TYPE IF EXISTS frequency_enum;
-- ─────────────────────────────────────────────────────────
-- ENUM TYPES
-- ─────────────────────────────────────────────────────────

CREATE TYPE sex_enum AS ENUM ('M', 'F');
CREATE TYPE category_enum AS ENUM ('Expenses', 'Income');
CREATE TYPE notification_enum AS ENUM ('WARNING', 'EXCEEDED');
CREATE TYPE frequency_enum AS ENUM ('Daily', 'Weekly', 'Monthly', 'Yearly');

-- ─────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  dob VARCHAR(50),
  occupation VARCHAR(100),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE categories (
  category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL,
  category_type category_enum NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (category_name, category_type)
);

CREATE TABLE transactions (
  transaction_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  transaction_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE budgets (
  budget_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  message VARCHAR(255),
  type notification_enum NOT NULL,
  title TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT (false),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE recurring_transactions (
  recurring_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  frequency frequency_enum NOT NULL,
  next_date DATE NOT NULL,
  end_date DATE NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE countries (
    code CHAR(2) PRIMARY KEY,
    name TEXT NOT NULL,
    currency_code CHAR(3) NOT NULL
);

CREATE TABLE user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  dark_mode BOOLEAN DEFAULT FALSE NOT NULL,
  country_code CHAR(2) REFERENCES countries(code) ON DELETE CASCADE DEFAULT 'SG',
  budget_notification BOOLEAN DEFAULT TRUE NOT NULL,
  warning_threshold INTEGER DEFAULT 80
);


CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE goals (
  goal_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  target_amount NUMERIC(10,2) NOT NULL,
  current_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  target_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
-- ─────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────

-- transactions
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_user_date 
  ON transactions(user_id, transaction_date DESC);

-- budgets
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- recurring transactions
CREATE INDEX idx_recurring_user_id ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_next_date ON recurring_transactions(next_date);

-- Create function
CREATE OR REPLACE FUNCTION create_user_settings_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (
        user_id, 
        dark_mode, 
        country_code, 
        budget_notification, 
        warning_threshold
    )
    VALUES (
        NEW.user_id, 
        FALSE, 
        'SG', 
        TRUE, 
        80
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_user_settings ON users;
CREATE TRIGGER trigger_create_user_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_user_settings_on_signup();

CREATE INDEX idx_goals_user_id ON goals(user_id);