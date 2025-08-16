import os, time, requests, json
import psycopg2
from psycopg2.extras import execute_values

ALPHA = "https://www.alphavantage.co/query"
APIFY_RUN = "https://api.apify.com/v2/acts/{actorId}/runs?token={token}"
APIFY_ITEMS = "https://api.apify.com/v2/datasets/{datasetId}/items?token={token}"

def db():
    return psycopg2.connect(
        host=os.getenv("POSTGRES_HOST","postgres"),
        port=int(os.getenv("POSTGRES_PORT","5432")),
        user=os.getenv("POSTGRES_USER","admin"),
        password=os.getenv("POSTGRES_PASSWORD","adminpassword"),
        dbname=os.getenv("STOCKS_DB","stocks"),
    )

def ensure_table():
    with db() as conn, conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS stock_prices(
            symbol TEXT NOT NULL, ts TIMESTAMP NOT NULL,
            open NUMERIC, high NUMERIC, low NUMERIC, close NUMERIC,
            adjusted_close NUMERIC, volume BIGINT,
            PRIMARY KEY(symbol, ts));""")
        conn.commit()

def upsert(rows):
    if not rows: return
    sql = """INSERT INTO stock_prices(symbol,ts,open,high,low,close,adjusted_close,volume)
             VALUES %s ON CONFLICT(symbol,ts) DO UPDATE SET
             open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low, close=EXCLUDED.close,
             adjusted_close=EXCLUDED.adjusted_close, volume=EXCLUDED.volume;"""
    with db() as conn, conn.cursor() as cur:
        execute_values(cur, sql, rows, page_size=500); conn.commit()

def fetch_alpha(symbol):
    key=os.environ["ALPHA_VANTAGE_API_KEY"]
    r=requests.get(ALPHA, params={"function":"TIME_SERIES_INTRADAY","interval":"5min","symbol":symbol,"apikey":key})
    p=r.json()
    if "Note" in p or "Error Message" in p: raise RuntimeError(str(p))
    ts=p.get("Time Series (5min)") or {}
    rows=[]
    for t,v in ts.items():
        rows.append((symbol,t, _f(v.get("1. open")),_f(v.get("2. high")),_f(v.get("3. low")),
                     _f(v.get("4. close")),_f(v.get("4. close")), _i(v.get("5. volume"))))
    return rows

def fetch_apify(symbol):
    actor=os.getenv("APIFY_ACTOR_ID"); token=os.getenv("APIFY_API_TOKEN")
    run=requests.post(APIFY_RUN.format(actorId=actor, token=token), json={"symbol":symbol}).json()
    datasetId=run.get("data",{}).get("defaultDatasetId")
    if not datasetId: raise RuntimeError("No dataset from Apify")
    time.sleep(3)
    items=requests.get(APIFY_ITEMS.format(datasetId=datasetId, token=token)).json()
    rows=[]
    for it in items:
        t=it.get("timestamp") or it.get("date") or it.get("time")
        rows.append((symbol,t,_f(it.get("open")),_f(it.get("high")),_f(it.get("low")),
                     _f(it.get("close") or it.get("price")), _f(it.get("adjClose")), _i(it.get("volume"))))
    return rows

def _f(x): 
    try: return float(x) if x not in (None,"") else None
    except: return None
def _i(x):
    try: return int(float(x)) if x not in (None,"") else None
    except: return None

def run_batch(symbols):
    ensure_table()
    out={}
    for s in symbols:
        try:
            rows=fetch_alpha(s)
        except Exception as e:
            try:
                rows=fetch_apify(s)
            except Exception as e2:
                out[s]={"status":"error","error":str(e2)}; continue
        upsert(rows); out[s]={"status":"ok","rows":len(rows)}
    return out

if __name__=="__main__":
    syms=[x.strip() for x in os.getenv("SYMBOLS","AAPL").split(",") if x.strip()]
    print(json.dumps(run_batch(syms), indent=2))