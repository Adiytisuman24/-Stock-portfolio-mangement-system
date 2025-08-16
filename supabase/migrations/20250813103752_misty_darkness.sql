-- Initialize database schema and default admin user
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolios (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    quantity NUMERIC DEFAULT 0,
    avg_buy_price NUMERIC DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, symbol)
);

CREATE TABLE IF NOT EXISTS stock_prices (
    symbol TEXT NOT NULL,
    ts TIMESTAMP NOT NULL,
    open NUMERIC, 
    high NUMERIC, 
    low NUMERIC, 
    close NUMERIC,
    adjusted_close NUMERIC, 
    volume BIGINT,
    PRIMARY KEY (symbol, ts)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    preferred_markets TEXT[] DEFAULT '{}',
    watchlist TEXT[] DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO users (email, password_hash, role)
VALUES ('admin@example.com', crypt('AdminPass123', gen_salt('bf')), 'admin')
ON CONFLICT (email) TRUE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_symbol ON portfolios(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol ON stock_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_prices_ts ON stock_prices(ts);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);