#  Dockerized Stock Data Pipeline with Airflow

This project is a **containerized data pipeline** for fetching, processing, and storing stock market data.  
It’s built for **robustness**, **ease of deployment**, and **full automation** using Apache Airflow, PostgreSQL, and Docker Compose.

---

##  Key Features

- **Automated Data Fetching** — Intraday U.S. stock data from Alpha Vantage.
- **Processing & Storage** — Normalized, relational format stored in PostgreSQL.
- **Workflow Orchestration** — Apache Airflow DAGs for scheduling.
- **Error-Resilient** — Retries, backoff, and per-symbol fault isolation.
- **Scalable** — Batch upserts with conflict handling for idempotency.
- **Secure** — All secrets stored in a `.env` file (not committed to repo).

---

## Project Structure
```plaintext
backend/
├── airflow/
│   ├── app/
│   │   └── etl.py              # ETL
│   └── dags/
│       └── stock_fetch_dag.py  # Airflow DAG definition
├── sql/
│   └── init.sql                # Database schema definition
├── docker-compose.yml          # Service orchestration
└── .env.example                # Safe public environment variables
```

## Configure Environment Variables

Before running, copy .env.example → .env and replace with your actual values.

# PostgreSQL Database

POSTGRES_USER=admin
POSTGRES_PASSWORD=change_this_password
POSTGRES_DB=stocks
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

#API Keys
ALPHA_VANTAGE_API_KEY=replace_with_your_alpha_vantage_key

#Stock Symbols (comma-separated)
SYMBOLS=AAPL,MSFT,GOOGL,TSLA

#App Config
JWT_SECRET=change_this_jwt_secret
FREQUENCY=10min  # Options: 10min, hourly, daily

#Optional ETL Settings
AV_SYMBOL_SLEEP_SEC=12
HTTP_RETRIES=2
HTTP_TIMEOUT_SEC=30


## Initialize Airflow
docker compose run --rm airflow-webserver airflow db init

Create an Airflow account to run on localhost 8081:

docker compose run --rm airflow-webserver \
  airflow users create \
  --username admin \
  --firstname Admin \
  --lastname User \
  --role Admin \
  --email yourusername@example.com \
  --password change_this_airflow_password

## How to Use
- Go to http://localhost:8081 and log in to Airflow.
- Locate stock_fetch_dag.
- Unpause the DAG.
- Optionally trigger a manual run.
- Verify data in PostgreSQL:


docker exec -it <postgres_container> \
  psql -U admin -d stocks -c \
  "SELECT symbol, COUNT(*) AS rows, MAX(ts) AS latest
   FROM stock_prices
   GROUP BY symbol
   ORDER BY symbol;"

## Database Schema

Table: stock_prices
Columns: id, symbol, ts (TIMESTAMPTZ), open, high, low, close, volume
Constraints:

Unique: (symbol, ts) — prevents duplicates

Index: (symbol, ts DESC) — speeds up latest-record lookups

## Errors and FIXES IN THE PROJECT
- Removed the stale go.sum and regenerated it with go mod tidy to fix checksum/version mismatches
- Moved RUN go mod tidy after COPY . . in the Dockerfile so it runs with the project files present and resolves modules correctly.
- Updated stock_fetch_dag.py to set a valid dag_id and default_args (start_date, retries), put everything inside with DAG(...):, wire a PythonOperator to call main() with a unique task_id, set schedule_interval and catchup=False, fix imports/paths so Airflow can parse it, and remove stray top-level code so the DAG actually runs.




# Stock Pipeline (AlphaVantage → Apify fallback) + Frontend

## Run
1) `cp .env.example .env` and edit as needed  
2) `docker compose up --build`  
3) Airflow UI: http://localhost:8081 (DAG `stock_fetch` runs every 10min)  
4) Frontend: http://localhost:3000  
   - Register, Login, then view Dashboard / Portfolio

## Notes
- Symbols include Indian (`.NS`) and US tickers.
- Fetch order: Alpha Vantage → Apify fallback (Actor: $APIFY_ACTOR_ID).
- Backend API: `POST /auth/register`, `POST /auth/login`, `GET /stocks`, `GET /stocks/{symbol}`, `GET/POST /portfolio`.

# Stock Pipeline (AlphaVantage → Apify fallback) + Frontend


## Run
1) `cp .env.example .env` and edit as needed  
2) `docker compose up --build`  
3) Airflow UI: http://localhost:8081 (DAG `stock_fetch` runs every 10min)  
4) Frontend: http://localhost:3000  
   - Register, Login, then view Dashboard / Portfolio
     

## Notes
- Symbols include Indian (`.NS`) and US tickers.
- Fetch order: Alpha Vantage → Apify fallback (Actor: $APIFY_ACTOR_ID).
- Backend API: `POST /auth/register`, `POST /auth/login`, `GET /stocks`, `GET /stocks/{symbol}`, `GET/POST /portfolio`.
