from datetime import datetime, timedelta
from airflow import DAG
import requests 
import httpx
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
import sys
import os

# Add the plugins directory to the Python path
sys.path.append('/opt/airflow/plugins')

# Import our custom stock fetcher
try:
    from fetch_and_upsert import StockDataFetcher
except ImportError:
    print("Could not import StockDataFetcher, will use alternative approach")

default_args = {
    'owner': 'stock-pipeline',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'catchup': False,
}

dag = DAG(
    'stock_data_pipeline',
    default_args=default_args,
    description='Fetch and store stock market data',
    schedule_interval='0 9 * * 1-5',  # Run at 9 AM on weekdays
    max_active_runs=1,
    tags=['stocks', 'finance', 'data-pipeline'],
)

def fetch_stock_data_task():
    """Task to fetch stock data using our Python worker."""
    try:
        fetcher = StockDataFetcher()
        result = fetcher.fetch_all_symbols()
        
        print(f"Stock data fetch completed:")
        print(f"Total records processed: {result['total_records']}")
        print(f"Successful symbols: {result['successful_symbols']}")
        print(f"Failed symbols: {result['failed_symbols']}")
        
        if result['failed_symbols']:
            raise Exception(f"Some symbols failed: {result['failed_symbols']}")
            
        return result
    except Exception as e:
        print(f"Error in fetch_stock_data_task: {e}")
        raise

def validate_data_task():
    """Task to validate the fetched data."""
    import psycopg2
    
    # Database configuration
    db_config = {
        'host': os.getenv('POSTGRES_HOST', 'postgres'),
        'port': os.getenv('POSTGRES_PORT', '5432'),
        'user': os.getenv('POSTGRES_USER', 'admin'),
        'password': os.getenv('POSTGRES_PASSWORD', 'adminpassword'),
        'database': os.getenv('POSTGRES_DB', 'stocks')
    }
    
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Check if we have recent data
        cursor.execute("""
            SELECT symbol, COUNT(*) as record_count, MAX(date) as latest_date
            FROM stocks
            WHERE date >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY symbol
            ORDER BY symbol
        """)
        
        results = cursor.fetchall()
        
        print("Data validation results:")
        for symbol, count, latest_date in results:
            print(f"  {symbol}: {count} records, latest: {latest_date}")
        
        if not results:
            raise Exception("No recent stock data found in database")
        
        conn.close()
        return len(results)
        
    except Exception as e:
        print(f"Error in validate_data_task: {e}")
        raise

def cleanup_old_data_task():
    """Task to clean up old data (optional - keep last 2 years)."""
    import psycopg2
    
    # Database configuration
    db_config = {
        'host': os.getenv('POSTGRES_HOST', 'postgres'),
        'port': os.getenv('POSTGRES_PORT', '5432'),
        'user': os.getenv('POSTGRES_USER', 'admin'),
        'password': os.getenv('POSTGRES_PASSWORD', 'adminpassword'),
        'database': os.getenv('POSTGRES_DB', 'stocks')
    }
    
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Delete data older than 2 years
        cursor.execute("""
            DELETE FROM stocks
            WHERE date < CURRENT_DATE - INTERVAL '2 years'
        """)
        
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        
        print(f"Cleaned up {deleted_count} old records")
        return deleted_count
        
    except Exception as e:
        print(f"Error in cleanup_old_data_task: {e}")
        # Don't raise exception for cleanup task
        return 0

# Define tasks
fetch_data = PythonOperator(
    task_id='fetch_stock_data',
    python_callable=fetch_stock_data_task,
    dag=dag,
)

validate_data = PythonOperator(
    task_id='validate_data',
    python_callable=validate_data_task,
    dag=dag,
)

cleanup_data = PythonOperator(
    task_id='cleanup_old_data',
    python_callable=cleanup_old_data_task,
    dag=dag,
)

# Set task dependencies
fetch_data >> validate_data >> cleanup_data

# Alternative task using BashOperator if Python import fails
fetch_data_bash = BashOperator(
    task_id='fetch_stock_data_bash',
    bash_command='cd /opt/airflow/plugins && python fetch_and_upsert.py',
    dag=dag,
)

# You can uncomment this line and comment the above dependencies if needed
# fetch_data_bash >> validate_data >> cleanup_data