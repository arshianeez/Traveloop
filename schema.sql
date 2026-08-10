-- Traveloop relational schema for a production implementation.
-- PostgreSQL syntax; portable to most relational databases with small type changes.

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  photo_url TEXT,
  language_preference VARCHAR(20) DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cities (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  country VARCHAR(120) NOT NULL,
  region VARCHAR(80) NOT NULL,
  cost_index NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
  popularity_score INTEGER NOT NULL DEFAULT 0 CHECK (popularity_score BETWEEN 0 AND 100),
  image_url TEXT,
  UNIQUE (name, country)
);

CREATE TABLE activities (
  id BIGSERIAL PRIMARY KEY,
  city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT,
  estimated_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  image_url TEXT
);

CREATE TABLE trips (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget_limit NUMERIC(12, 2),
  visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public')),
  public_slug VARCHAR(180) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE TABLE trip_stops (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  city_id BIGINT NOT NULL REFERENCES cities(id),
  position INTEGER NOT NULL,
  arrival_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  notes TEXT,
  UNIQUE (trip_id, position),
  CHECK (departure_date >= arrival_date)
);

CREATE TABLE trip_activities (
  id BIGSERIAL PRIMARY KEY,
  trip_stop_id BIGINT NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
  activity_id BIGINT REFERENCES activities(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  estimated_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  custom_notes TEXT
);

CREATE TABLE trip_expenses (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_stop_id BIGINT REFERENCES trip_stops(id) ON DELETE SET NULL,
  category VARCHAR(40) NOT NULL CHECK (category IN ('transport', 'stay', 'activities', 'meals', 'misc')),
  label VARCHAR(160) NOT NULL,
  estimated_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  expense_date DATE
);

CREATE TABLE packing_items (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  label VARCHAR(160) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'General',
  is_packed BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE trip_notes (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_stop_id BIGINT REFERENCES trip_stops(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE saved_destinations (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, city_id)
);

CREATE TABLE trip_shares (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  share_token VARCHAR(120) NOT NULL UNIQUE,
  permission VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'copy', 'edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_trips_user_dates ON trips(user_id, start_date, end_date);
CREATE INDEX idx_trip_stops_trip_position ON trip_stops(trip_id, position);
CREATE INDEX idx_trip_activities_stop_date ON trip_activities(trip_stop_id, scheduled_date);
CREATE INDEX idx_trip_expenses_trip_category ON trip_expenses(trip_id, category);
CREATE INDEX idx_cities_search ON cities(country, region, popularity_score);