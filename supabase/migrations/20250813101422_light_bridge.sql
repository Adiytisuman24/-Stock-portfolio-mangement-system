CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolios (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_prices (
  symbol TEXT NOT NULL,
  ts TIMESTAMP NOT NULL,
  open NUMERIC, high NUMERIC, low NUMERIC, close NUMERIC,
  adjusted_close NUMERIC, volume BIGINT,
  PRIMARY KEY (symbol, ts)
);