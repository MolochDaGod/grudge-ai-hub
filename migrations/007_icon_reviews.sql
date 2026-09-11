-- ICON-* PNG reviews (index only — binaries stay on R2).
-- PK is the deterministic ObjectStore ICON UUID. Never autoincrement. Never player bag.
-- Apply: wrangler d1 execute grudge-ai-hub --remote --file=migrations/007_icon_reviews.sql

CREATE TABLE IF NOT EXISTS icon_reviews (
  grudge_uuid TEXT PRIMARY KEY,
  r2_key      TEXT NOT NULL DEFAULT '',
  icon_path   TEXT,
  name        TEXT,
  category    TEXT,
  cdn_url     TEXT,
  look        TEXT,
  name_match  TEXT NOT NULL DEFAULT 'unclear',
  quality     TEXT NOT NULL DEFAULT 'ok',
  issues      TEXT NOT NULL DEFAULT '[]',
  model       TEXT,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
  version     INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_icon_reviews_category ON icon_reviews(category);
CREATE INDEX IF NOT EXISTS idx_icon_reviews_match    ON icon_reviews(name_match);
CREATE INDEX IF NOT EXISTS idx_icon_reviews_quality  ON icon_reviews(quality);
CREATE INDEX IF NOT EXISTS idx_icon_reviews_reviewed ON icon_reviews(reviewed_at);
