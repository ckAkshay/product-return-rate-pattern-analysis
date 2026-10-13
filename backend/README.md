# Backend and Results Management (Task 6)

FastAPI-powered REST backend and analytics dashboard for the **Product Return-Rate Pattern Analysis** pipeline.

---

## 1. Architecture Overview

The backend acts as the data-access and API presentation layer for the processed MapReduce and Task 5 analytics results. It bridges the Big Data offline pipeline with the frontend visualization dashboard.

```
+------------------------------------+
|  Hadoop HDFS MapReduce Output      |
|  (data/output/return_rate_mr.tsv)  |
+-----------------+------------------+
                  |
                  v
+------------------------------------+
|  Task 5 Return-Rate Analytics      |
|  (data/output/return_rate_report)  |
+-----------------+------------------+
                  |
                  v
+------------------------------------+
|  FastAPI Backend (backend/)        |
|  - ResultsService (Validation,     |
|    mtime cache, aggregation)       |
|  - Endpoints: /health, /summary,   |
|    /returns, /alerts               |
|  - CORS & Static Dashboard Host    |
+-----------------+------------------+
                  |
                  v
+------------------------------------+
|  Frontend Monitoring Dashboard     |
|  (Glassmorphic Dark UI / REST API) |
+------------------------------------+
```

---

## 2. API Endpoints

### `GET /api/health`
- **Description:** Verifies service availability and data source connectivity.
- **Sample Response:**
```json
{
  "status": "ok",
  "service": "product-return-rate-backend",
  "data_source_available": true,
  "data_source_name": "return_rate_report.csv",
  "records_count": 96,
  "last_modified": "2026-10-13T16:39:51+00:00"
}
```

---

### `GET /api/summary`
- **Description:** Aggregates overall business KPIs. Calculates overall return rate as:
  $$\text{Overall Return Rate} = \left(\frac{\text{Total Returned}}{\text{Total Sold}}\right) \times 100$$
- **Sample Response:**
```json
{
  "total_sold": 13737.0,
  "total_returned": 1194.0,
  "overall_return_rate": 8.69,
  "high_return_records_count": 30,
  "high_return_categories_count": 2,
  "high_return_categories": [
    {
      "category": "Footwear",
      "total_sold": 1701.0,
      "total_returned": 307.0,
      "return_rate": 18.05,
      "status": "HIGH RETURNS"
    },
    {
      "category": "Clothing",
      "total_sold": 1661.0,
      "total_returned": 217.0,
      "return_rate": 13.06,
      "status": "HIGH RETURNS"
    }
  ],
  "categories_count": 8,
  "reporting_period": {
    "start_week": "2025-W02",
    "end_week": "2025-W13",
    "total_weeks": 12
  },
  "threshold_percentage": 10.0,
  "last_updated": "2026-10-13T16:39:51+00:00"
}
```

---

### `GET /api/returns`
- **Description:** Returns weekly category-wise records with optional filters and pagination.
- **Query Parameters:**
  - `category` (string, optional): e.g., `Footwear`
  - `week` (string, optional): e.g., `2025-W11`
  - `status` (string, optional): `NORMAL` or `HIGH RETURNS`
  - `page` (int, default: 1)
  - `page_size` (int, default: 50, use 0 for all)
- **Sample Response:**
```json
{
  "total_records": 12,
  "page": 1,
  "page_size": 50,
  "total_pages": 1,
  "data": [
    {
      "week": "2025-W02",
      "category": "Footwear",
      "total_sold": 134.0,
      "total_returned": 16.0,
      "return_rate": 11.94,
      "status": "HIGH RETURNS",
      "flagged": true
    }
  ]
}
```

---

### `GET /api/alerts`
- **Description:** Returns only records strictly exceeding the 10.0% return rate threshold (`return_rate > 10.0`).
- **Query Parameters:** `category`, `week`
- **Sample Response:**
```json
{
  "alert_count": 30,
  "threshold_percentage": 10.0,
  "alerts": [
    {
      "week": "2025-W11",
      "category": "Footwear",
      "total_sold": 169.0,
      "total_returned": 53.0,
      "return_rate": 31.36,
      "status": "HIGH RETURNS",
      "flagged": true
    }
  ]
}
```

---

## 3. Configuration & Environment Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `RESULTS_PATH` | `data/output/return_rate_report.csv` | File path to Task 5 processed results |
| `ALERT_THRESHOLD`| `10.0` | Return rate threshold in percentage |
| `BACKEND_HOST` | `0.0.0.0` | Host binding address |
| `BACKEND_PORT` | `8000` | Port binding |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173,http://localhost:8000` | Allowed origins for cross-origin requests |

---

## 4. How to Run the Backend

### Local Execution
```powershell
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

- Open Dashboard: [http://localhost:8000](http://localhost:8000)
- Interactive Swagger API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Interactive ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 5. How to Run Tests

```powershell
python -m pytest -v tests/test_backend.py
```
Covers Tests A through H (health, summary calculations, category results, alert thresholds, missing file handling, malformed record resilience, frontend assets/CORS, and end-to-end integration against Task 5 output).
