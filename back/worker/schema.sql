CREATE TABLE telegram_users (
  telegram_username TEXT PRIMARY KEY,
  telegram_chat_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_username TEXT NOT NULL,
  tournament_key TEXT NOT NULL,
  tournament_name TEXT NOT NULL,
  circuit_code TEXT NOT NULL, -- MT, WT
  notify_last_match BOOLEAN NOT NULL DEFAULT 0,
  notify_order_of_play BOOLEAN NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE(telegram_username, tournament_key)
);

CREATE TABLE tournament_state (
  tournament_key TEXT PRIMARY KEY,
  last_match_status TEXT,
  order_of_play_status TEXT,
  last_checked_at INTEGER NOT NULL
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  last_request_at INTEGER NOT NULL
);
