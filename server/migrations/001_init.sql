CREATE TABLE posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  read_time     TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  is_featured   INTEGER NOT NULL DEFAULT 0,
  cover_color   TEXT,
  published_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  sort  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE RESTRICT,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE media_items (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  type   TEXT NOT NULL CHECK (type IN ('music','book','movie')),
  title  TEXT NOT NULL,
  author TEXT NOT NULL,
  sort   INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE about (
  id     INTEGER PRIMARY KEY CHECK (id = 1),
  avatar TEXT NOT NULL,
  name   TEXT NOT NULL,
  bio    TEXT NOT NULL,
  links  TEXT NOT NULL
);

CREATE INDEX idx_posts_status_published_at ON posts(status, published_at DESC);
CREATE INDEX idx_posts_featured            ON posts(is_featured) WHERE is_featured = 1;
