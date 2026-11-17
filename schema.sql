CREATE TABLE IF NOT EXISTS leads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  INTEGER NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  course      TEXT NOT NULL,
  university  TEXT,
  state       TEXT NOT NULL,
  district    TEXT NOT NULL,
  source      TEXT,
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone, created_at);
