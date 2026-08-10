-- Traveloop relational schema adapted for SQLite

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  photo_url TEXT,
  language_preference VARCHAR(20) DEFAULT 'en',
  is_admin BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(120) NOT NULL,
  country VARCHAR(120) NOT NULL,
  region VARCHAR(80) NOT NULL,
  cost_index REAL NOT NULL DEFAULT 1.00,
  popularity_score INTEGER NOT NULL DEFAULT 0 CHECK (popularity_score BETWEEN 0 AND 100),
  image_url TEXT,
  UNIQUE (name, country)
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT,
  estimated_cost REAL NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget_limit REAL,
  visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public')),
  public_slug VARCHAR(180) UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS trip_stops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  city_id INTEGER NOT NULL REFERENCES cities(id),
  position INTEGER NOT NULL,
  arrival_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  notes TEXT,
  UNIQUE (trip_id, position),
  CHECK (departure_date >= arrival_date)
);

CREATE TABLE IF NOT EXISTS trip_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_stop_id INTEGER NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
  activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  estimated_cost REAL NOT NULL DEFAULT 0,
  custom_notes TEXT
);

CREATE TABLE IF NOT EXISTS trip_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_stop_id INTEGER REFERENCES trip_stops(id) ON DELETE SET NULL,
  category VARCHAR(40) NOT NULL CHECK (category IN ('transport', 'stay', 'activities', 'meals', 'misc')),
  label VARCHAR(160) NOT NULL,
  estimated_amount REAL NOT NULL DEFAULT 0,
  expense_date DATE
);

CREATE TABLE IF NOT EXISTS packing_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  label VARCHAR(160) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'General',
  is_packed BOOLEAN NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trip_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_stop_id INTEGER REFERENCES trip_stops(id) ON DELETE CASCADE,
  scope VARCHAR(120),
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_destinations (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  saved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, city_id)
);

CREATE TABLE IF NOT EXISTS trip_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  share_token VARCHAR(120) NOT NULL UNIQUE,
  permission VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'copy', 'edit')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);
