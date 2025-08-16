import os
import sys
import requests
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
import time
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class StockDataFetcher:
    def __init__(self):
        self.api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        self.symbols = os.getenv('SYMBOLS', 'AAPL,MSFT,GOOGL').split(',')
        
        # Database configuration
        self.db_config = {
            'host': os.getenv('POSTGRES_HOST', 'localhost'),
            'port': os.getenv('POSTGRES_PORT', '5432'),
            'user': os.getenv('POSTGRES_USER', 'admin'),
            'password': os.getenv('POSTGRES_PASSWORD', 'adminpassword'),
            'database': os.getenv('POSTGRES_DB', 'stocks')
        }
        
        if not self.api_key or self.api_key == 'your_api_key_here':
            logger.error("Alpha Vantage API key not configured!")
            sys.exit(1)

    def get_db_connection(self):
        """Create and return a database connection with retry logic."""
        max_retries = 5
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                conn = psycopg2.connect(**self.db_config)
                logger.info("Successfully connected to database")
                return conn
            except psycopg2.Error as e:
                logger.error(f"Database connection attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    raise

    def fetch_stock_data(self, symbol):
        """Fetch stock data from Alpha Vantage API."""
        url = f"https://www.alphavantage.co/query"
        params = {
            'function': 'TIME_SERIES_DAILY_ADJUSTED',
            'symbol': symbol,
            'outputsize': 'full',
            'apikey': self.api_key
        }
        
        max_retries = 3
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Fetching data for {symbol}, attempt {attempt + 1}")
                response = requests.get(url, params=params, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                
                # Check for API error messages
                if 'Error Message' in data:
                    logger.error(f"Alpha Vantage API error for {symbol}: {data['Error Message']}")
                    return None
                
                if 'Note' in data:
                    logger.warning(f"Alpha Vantage API note for {symbol}: {data['Note']}")
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay * (attempt + 1))
                        continue
                    return None
                
                if 'Time Series (Daily)' not in data:
                    logger.error(f"Unexpected response format for {symbol}: {list(data.keys())}")
                    return None
                
                return data['Time Series (Daily)']
                
            except requests.RequestException as e:
                logger.error(f"HTTP request failed for {symbol}, attempt {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    raise
            except Exception as e:
                logger.error(f"Unexpected error fetching {symbol}: {e}")
                return None
        
        return None

    def upsert_stock_data(self, symbol, time_series):
        """Insert or update stock data in the database."""
        if not time_series:
            logger.warning(f"No time series data for {symbol}")
            return 0

        conn = None
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            upsert_query = """
                INSERT INTO stocks (symbol, date, open, high, low, close, adjusted_close, volume, updated_at)
                VALUES (%(symbol)s, %(date)s, %(open)s, %(high)s, %(low)s, %(close)s, %(adjusted_close)s, %(volume)s, %(updated_at)s)
                ON CONFLICT (symbol, date)
                DO UPDATE SET
                    open = EXCLUDED.open,
                    high = EXCLUDED.high,
                    low = EXCLUDED.low,
                    close = EXCLUDED.close,
                    adjusted_close = EXCLUDED.adjusted_close,
                    volume = EXCLUDED.volume,
                    updated_at = EXCLUDED.updated_at
            """
            
            records_processed = 0
            for date_str, daily_data in time_series.items():
                try:
                    record = {
                        'symbol': symbol,
                        'date': date_str,
                        'open': float(daily_data['1. open']),
                        'high': float(daily_data['2. high']),
                        'low': float(daily_data['3. low']),
                        'close': float(daily_data['4. close']),
                        'adjusted_close': float(daily_data['5. adjusted close']),
                        'volume': int(daily_data['6. volume']),
                        'updated_at': datetime.now()
                    }
                    
                    cursor.execute(upsert_query, record)
                    records_processed += 1
                    
                except (ValueError, KeyError) as e:
                    logger.error(f"Error processing record for {symbol} on {date_str}: {e}")
                    continue
            
            conn.commit()
            logger.info(f"Successfully upserted {records_processed} records for {symbol}")
            return records_processed
            
        except psycopg2.Error as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error upserting data for {symbol}: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def fetch_all_symbols(self):
        """Fetch data for all configured symbols."""
        total_records = 0
        successful_symbols = []
        failed_symbols = []
        
        for symbol in self.symbols:
            symbol = symbol.strip()
            if not symbol:
                continue
                
            try:
                logger.info(f"Processing symbol: {symbol}")
                time_series = self.fetch_stock_data(symbol)
                
                if time_series:
                    records = self.upsert_stock_data(symbol, time_series)
                    total_records += records
                    successful_symbols.append(symbol)
                else:
                    logger.error(f"Failed to fetch data for {symbol}")
                    failed_symbols.append(symbol)
                
                # Rate limiting - Alpha Vantage has 5 API requests per minute limit
                time.sleep(12)  # Wait 12 seconds between requests
                
            except Exception as e:
                logger.error(f"Error processing {symbol}: {e}")
                failed_symbols.append(symbol)
        
        logger.info(f"Data fetch completed. Total records: {total_records}")
        logger.info(f"Successful symbols: {successful_symbols}")
        if failed_symbols:
            logger.warning(f"Failed symbols: {failed_symbols}")
        
        return {
            'total_records': total_records,
            'successful_symbols': successful_symbols,
            'failed_symbols': failed_symbols
        }

def main():
    """Main function to run the stock data fetcher."""
    fetcher = StockDataFetcher()
    result = fetcher.fetch_all_symbols()
    
    # Return appropriate exit code
    if result['failed_symbols']:
        logger.warning("Some symbols failed to process")
        sys.exit(1)
    else:
        logger.info("All symbols processed successfully")
        sys.exit(0)

if __name__ == "__main__":
    main()