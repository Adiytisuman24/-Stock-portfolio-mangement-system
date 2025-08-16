CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    open NUMERIC(10, 2),
    high NUMERIC(10, 2),
    low NUMERIC(10, 2),
    close NUMERIC(10, 2),
    adjusted_close NUMERIC(10, 2),
    volume BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_stocks_date ON stocks(date);
CREATE INDEX IF NOT EXISTS idx_stocks_symbol_date ON stocks(symbol, date);

-- Create a view for latest stock prices
CREATE OR REPLACE VIEW latest_stock_prices AS
SELECT DISTINCT ON (symbol)
    symbol,
    date,
    open,
    high,
    low,
    close,
    adjusted_close,
    volume,
    updated_at
FROM stocks
ORDER BY symbol, date DESC;

-- Function to calculate price change percentage
CREATE OR REPLACE FUNCTION get_price_change_percentage(p_symbol VARCHAR(10))
RETURNS NUMERIC AS $$
DECLARE
    current_price NUMERIC;
    previous_price NUMERIC;
BEGIN
    -- Get current price
    SELECT close INTO current_price
    FROM stocks
    WHERE symbol = p_symbol
    ORDER BY date DESC
    LIMIT 1;

    -- Get previous price
    SELECT close INTO previous_price
    FROM stocks
    WHERE symbol = p_symbol
    ORDER BY date DESC
    OFFSET 1
    LIMIT 1;

    IF previous_price IS NULL OR previous_price = 0 THEN
        RETURN 0;
    END IF;

    RETURN ROUND(((current_price - previous_price) / previous_price) * 100, 2);
END;
$$ LANGUAGE plpgsql;