import os 
import time
import json
from typing import Dict, Iterable, List, Tuple
from datetime import datetime, timezone
import requests
import psycopg2
from psycopg2.extras import execute_values
from airflow.providers.postgres.hooks.postgres import PostgresHook

from airflow.models import DAG




def _env(name: str, default: str | None = None) -> str:
    val = os.getenv(name, default)
    if val is None:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val


def load_settings() -> Dict:
    return {
        "pg": {
            "host": _env("POSTGRES_HOST", "postgres"),
            "port": int(_env("POSTGRES_PORT", "5432")),
            "dbname": _env("POSTGRES_DB", "stocks"),
            "user": _env("POSTGRES_USER", "admin"),
            "password": _env("POSTGRES_PASSWORD", "adminpassword"),
        },
        "alpha_vantage_key": _env("ALPHA_VANTAGE_API_KEY"),
        "symbols": [s.strip().upper() for s in _env("SYMBOLS", "AAPL").split(",") if s.strip()],
        "per_symbol_pause_sec": float(_env("AV_SYMBOL_SLEEP_SEC", "12")),
        "retries": int(_env("HTTP_RETRIES", "2")),
        "timeout": int(_env("HTTP_TIMEOUT_SEC", "30")),
    }


def _ts_to_utc(ts_string: str) -> datetime:
    dt = datetime.strptime(ts_string, "%Y-%m-%d %H:%M:%S")
    return dt.replace(tzinfo=timezone.utc)



def fetch_intraday_series(symbol: str, api_key: str, timeout: int, retries: int) -> Dict[str, Dict[str, str]]:
    url = "https://www.alphavantage.co/query"
    params = {
        "function": "TIME_SERIES_INTRADAY",
        "symbol": symbol,
        "interval": "60min",
        "apikey": api_key,
    }

    last_err = None
    for attempt in range(retries + 1):
        try:
            resp = requests.get(url, params=params, timeout=timeout)
            resp.raise_for_status()
            payload = resp.json()

            if "Note" in payload:
                raise RuntimeError(f"Alpha Vantage notice for {symbol}: {payload.get('Note')}")
            if "Error Message" in payload:
                raise RuntimeError(f"Alpha Vantage error for {symbol}: {payload.get('Error Message')}")

            series = payload.get("Time Series (60min)")
            if not isinstance(series, dict) or not series:
                raise RuntimeError(f"No intraday data returned for {symbol}: {json.dumps(payload)[:500]}")

            return series

        except Exception as e:
            last_err = e
            if attempt < retries:
                time.sleep(2 * (attempt + 1))
            else:
                raise RuntimeError(f"Failed fetching {symbol} after {retries+1} attempts: {last_err}") from last_err
    return {}


def normalize_rows(series: Dict[str, Dict[str, str]]) -> List[Dict]:
    rows: List[Dict] = []
    for ts_str, vals in series.items():
        try:
            rows.append(
                {
                    "ts": _ts_to_utc(ts_str),
                    "open": float(vals.get("1. open", 0) or 0),
                    "high": float(vals.get("2. high", 0) or 0),
                    "low": float(vals.get("3. low", 0) or 0),
                    "close": float(vals.get("4. close", 0) or 0),
                    "volume": int(float(vals.get("5. volume", 0) or 0)),
                }
            )
        except Exception:
            continue
    return rows



UPSERT_SQL = """
INSERT INTO stock_prices (symbol, ts, open, high, low, close, volume)
VALUES %s
ON CONFLICT (symbol, ts) DO UPDATE SET
  open = EXCLUDED.open,
  high = EXCLUDED.high,
  low = EXCLUDED.low,
  close = EXCLUDED.close,
  volume = EXCLUDED.volume;
"""

def _values_for_execute_values(symbol: str, rows: Iterable[Dict]) -> List[Tuple]:
    return [
        (
            symbol,
            r["ts"],
            r["open"],
            r["high"],
            r["low"],
            r["close"],
            r["volume"],
        )
        for r in rows
    ]


def upsert_prices(pg_cfg: Dict, symbol: str, rows: List[Dict]) -> None:
    if not rows:
        return

    conn = psycopg2.connect(**pg_cfg)
    try:
        with conn:
            with conn.cursor() as cur:
                psycopg2.extras.execute_values(
                    cur,
                    UPSERT_SQL,
                    _values_for_execute_values(symbol, rows),
                    page_size=500,
                )
    finally:
        conn.close()



def run() -> None:
    cfg = load_settings()

    for sym in cfg["symbols"]:
        try:
            series = fetch_intraday_series(
                symbol=sym,
                api_key=cfg["alpha_vantage_key"],
                timeout=cfg["timeout"],
                retries=cfg["retries"],
            )
            rows = normalize_rows(series)
            if rows:
                upsert_prices(cfg["pg"], sym, rows)
                print(f"[ETL] Upserted {len(rows)} rows for {sym}")
            else:
                print(f"[ETL] No rows to upsert for {sym}")
        except Exception as e:
            print(f"[ETL] {sym} failed: {e}")

        time.sleep(cfg["per_symbol_pause_sec"])


if __name__ == "__main__":
    run()
