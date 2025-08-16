CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_markets TEXT[] DEFAULT '{}',
    watchlist TEXT[] DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT FALSE
);


CREATE TABLE IF NOT EXISTS stock_prices (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    ts TIMESTAMP NOT NULL,
    open DOUBLE PRECISION,
    high DOUBLE PRECISION,
    low DOUBLE PRECISION,
    close DOUBLE PRECISION,
    volume BIGINT
);


CREATE TABLE IF NOT EXISTS portfolios (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    quantity DOUBLE PRECISION DEFAULT 0,
    avg_buy_price DOUBLE PRECISION DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, symbol)
);


CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_ts
    ON stock_prices(symbol, ts DESC);
