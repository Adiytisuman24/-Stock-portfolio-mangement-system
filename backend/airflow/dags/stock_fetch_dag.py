
import os, sys
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

if "/opt/airflow" not in sys.path:
    sys.path.append("/opt/airflow")
from app import etl
import psycopg2

def _schedule():
    f = (os.getenv("FREQUENCY", "hourly") or "hourly").lower()
    if f in {"10min", "10m", "10-minute"}:
        return "*/10 * * * *"
    if f in {"hourly", "1h"}:
        return "0 * * * *"
    return "0 1 * * *"

def _pg_cfg():
    return {
        "host": os.getenv("POSTGRES_HOST", "postgres"),
        "port": int(os.getenv("POSTGRES_PORT", "5432")),
        "dbname": os.getenv("POSTGRES_DB", "stocks"),
        "user": os.getenv("POSTGRES_USER", "admin"),
        "password": os.getenv("POSTGRES_PASSWORD", "adminpassword"),
    }

def _symbols():
    return [s.strip().upper() for s in (os.getenv("SYMBOLS", "AAPL")).split(",") if s.strip()]

def _run_then_validate():
    if not os.getenv("ALPHA_VANTAGE_API_KEY"):
        raise RuntimeError("ALPHA_VANTAGE_API_KEY missing")
    etl.run()
    conn = psycopg2.connect(**_pg_cfg())
    try:
        with conn.cursor() as cur:
            syms = _symbols()
            cur.execute(
                "SELECT symbol, COUNT(*) FROM stock_prices WHERE ts >= NOW() - INTERVAL '7 days' AND symbol = ANY(%s) GROUP BY symbol",
                (syms,)
            )
            rows = cur.fetchall()
            seen = {s: 0 for s in syms}
            for s, c in rows:
                seen[s] = c
            if all(c == 0 for c in seen.values()):
                raise RuntimeError(f"No recent data found for symbols: {syms}")
            print({"validated": seen})
    finally:
        conn.close()

default_args = {
    "owner": "data-eng",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="stock_fetch",
    start_date=datetime(2025, 1, 1),
    schedule_interval=_schedule(),
    catchup=False,
    max_active_runs=1,
    default_args=default_args,
    tags=["stocks", "etl", "postgres"],
) as dag:
    run = PythonOperator(task_id="run_etl_and_validate", python_callable=_run_then_validate)
    run
