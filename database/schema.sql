-- ============================================================================
-- Campus Bites - database schema
-- Target database: PostgreSQL 13+ (this is what the n8n workflow uses)
--
-- Run the files in this order:
--   1. schema.sql   (creates the tables)
--   2. seed.sql     (adds placeholder outlets, items and a few reviews)
--
-- Why PostgreSQL and not SQLite?
-- The n8n SQLite node can only run a raw query string, so it cannot bind
-- parameters ($1, $2, ...). Parameterized queries are a hard requirement,
-- therefore the backend uses the n8n Postgres node. See README.md.
--
-- A SQLite translation of this schema is included at the bottom of the file
-- for anyone who only wants a local copy of the data.
-- ============================================================================

-- Drop in reverse dependency order so the script can be re-run safely.
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS outlets;

-- ---------------------------------------------------------------------------
-- outlets: a physical place on campus where food is sold
-- ---------------------------------------------------------------------------
CREATE TABLE outlets (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(80)  NOT NULL,
  type     VARCHAR(20)  NOT NULL CHECK (type IN ('cafeteria', 'dhaba', 'kiosk')),
  location VARCHAR(120) NOT NULL
);

-- ---------------------------------------------------------------------------
-- items: one sellable thing on one outlet's menu
-- Prices are stored as NUMERIC so we never get floating point rounding errors
-- on money (e.g. 0.1 + 0.2 problems).
-- ---------------------------------------------------------------------------
CREATE TABLE items (
  id        SERIAL PRIMARY KEY,
  outlet_id INTEGER      NOT NULL REFERENCES outlets (id) ON DELETE CASCADE,
  name      VARCHAR(80)  NOT NULL,
  category  VARCHAR(30)  NOT NULL,
  price     NUMERIC(8, 2) NOT NULL CHECK (price >= 0)
);

-- ---------------------------------------------------------------------------
-- reviews: one student's rating + optional written review for one item
--
-- Constraints do the security work that JavaScript cannot be trusted to do:
--   * rating must be a whole number from 1 to 5
--   * name 2-30 characters, review 0-300 characters
--   * one device can review the same item only once (UNIQUE below)
-- ---------------------------------------------------------------------------
CREATE TABLE reviews (
  id            SERIAL PRIMARY KEY,
  item_id       INTEGER      NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  reviewer_name VARCHAR(30)  NOT NULL CHECK (char_length(reviewer_name) BETWEEN 2 AND 30),
  rating        SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text   VARCHAR(300) NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  device_id     VARCHAR(64)  NOT NULL CHECK (char_length(device_id) BETWEEN 8 AND 64),
  CONSTRAINT uq_reviews_item_device UNIQUE (item_id, device_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- The UNIQUE constraint above already creates an index on (item_id, device_id),
-- which also speeds up "all reviews for an item" lookups.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_items_outlet_id     ON items (outlet_id);
CREATE INDEX idx_items_category      ON items (category);
-- Used by the POST /reviews rate limit ("how many reviews did this device send
-- in the last hour?") and by the duplicate check.
CREATE INDEX idx_reviews_device_time ON reviews (device_id, created_at DESC);

-- ============================================================================
-- Reference queries
-- These are the exact queries used by the n8n workflow. Kept here so the team
-- can test them in psql / pgAdmin without opening n8n.
-- ============================================================================

-- 1) Items by outlet (pass 0 for "every outlet").
--    LEFT JOIN keeps items that have no reviews yet (average 0, count 0).
--
-- SELECT i.id, i.name, i.category, i.price,
--        o.id AS outlet_id, o.name AS outlet_name,
--        COUNT(r.id)::int AS review_count,
--        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float8 AS average_rating
-- FROM items i
-- JOIN outlets o ON o.id = i.outlet_id
-- LEFT JOIN reviews r ON r.item_id = i.id
-- WHERE (0 = 0 OR i.outlet_id = 0)          -- replace both 0s with the outlet id
-- GROUP BY i.id, o.id
-- ORDER BY i.name;

-- 2) Average rating per item (same shape as query 1, no outlet filter).
--
-- SELECT i.id, i.name,
--        COUNT(r.id)::int AS review_count,
--        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float8 AS average_rating
-- FROM items i
-- LEFT JOIN reviews r ON r.item_id = i.id
-- GROUP BY i.id
-- ORDER BY average_rating DESC;

-- 3) Top rated items (only items that actually have a review).
--
-- SELECT i.id, i.name, i.category, i.price,
--        o.id AS outlet_id, o.name AS outlet_name,
--        COUNT(r.id)::int AS review_count,
--        ROUND(AVG(r.rating)::numeric, 1)::float8 AS average_rating
-- FROM items i
-- JOIN outlets o ON o.id = i.outlet_id
-- JOIN reviews r ON r.item_id = i.id
-- GROUP BY i.id, o.id
-- HAVING COUNT(r.id) >= 1
-- ORDER BY average_rating DESC, review_count DESC, i.name
-- LIMIT 5;

-- ============================================================================
-- Appendix: SQLite translation (optional, for local experiments only)
--
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   price REAL NOT NULL CHECK (price >= 0),
--   created_at TEXT NOT NULL DEFAULT (datetime('now'))
--   and drop the SERIAL / VARCHAR(...) / TIMESTAMPTZ types (SQLite ignores
--   length limits anyway, so CHECK constraints are the real guard).
-- The rest of the file works unchanged, including UNIQUE and the queries.
-- ============================================================================
