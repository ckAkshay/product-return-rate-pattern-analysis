"""
FastAPI application for Product Return-Rate Pattern Analysis.
Exposes endpoints for health, metrics summary, category-week returns,
and high-return alerts (>10%).
"""

import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.config import (
    BACKEND_HOST,
    BACKEND_PORT,
    CORS_ORIGINS,
    PROJECT_ROOT,
    RESULTS_PATH,
)
from backend.services.results_service import (
    InvalidFilterException,
    ResultsService,
    ResultsUnavailableException,
)

app = FastAPI(
    title="Product Return-Rate Pattern Analysis API",
    description="REST API exposing e-commerce product return rates, trend detection, and alerts.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service instance
results_service = ResultsService(RESULTS_PATH)

# Static files directory
STATIC_DIR = Path(__file__).resolve().parent / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# Global Exception Handlers
@app.exception_handler(ResultsUnavailableException)
async def results_unavailable_handler(request: Request, exc: ResultsUnavailableException):
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "RESULTS_UNAVAILABLE",
            "detail": str(exc),
            "status_code": 503,
        },
    )


@app.exception_handler(InvalidFilterException)
async def invalid_filter_handler(request: Request, exc: InvalidFilterException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "INVALID_FILTER",
            "detail": str(exc),
            "status_code": 400,
        },
    )


# Root route - serves the dashboard UI
@app.get("/", include_in_schema=False)
async def serve_dashboard():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return JSONResponse(
        content={
            "message": "Product Return-Rate Pattern Analysis API is running.",
            "docs_url": "/docs",
            "health_url": "/api/health",
        }
    )


@app.get("/api/health", summary="Health Check")
def get_health():
    """
    Returns backend service status and verifies accessibility of the Task 5 results.
    """
    return results_service.get_health()


@app.get("/api/summary", summary="Return-Rate Summary Metrics")
def get_summary():
    """
    Returns aggregated business metrics:
    - Total sold quantity
    - Total returned quantity
    - Overall return rate percentage: (Total Returned / Total Sold) * 100
    - Count of high-return categories and weekly anomalies
    - Reporting period coverage
    """
    return results_service.get_summary()


@app.get("/api/returns", summary="Weekly Category Return Rates")
def get_returns(
    category: Optional[str] = Query(None, description="Filter by product category (e.g. Footwear)"),
    week: Optional[str] = Query(None, description="Filter by transaction week (e.g. 2025-W11)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status ('NORMAL' or 'HIGH RETURNS')"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=0, description="Items per page (0 returns all records)"),
):
    """
    Returns structured category-week return rate records with optional filtering
    and pagination.
    """
    return results_service.get_returns(
        category=category,
        week=week,
        status=status_filter,
        page=page,
        page_size=page_size,
    )


@app.get("/api/alerts", summary="High Return Rate Alerts (>10%)")
def get_alerts(
    category: Optional[str] = Query(None, description="Filter alerts by category"),
    week: Optional[str] = Query(None, description="Filter alerts by week"),
):
    """
    Returns all category-week instances where return rate strictly exceeds the 10.0% threshold.
    Records with exactly 10.0% or lower are excluded.
    """
    return results_service.get_alerts(category=category, week=week)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host=BACKEND_HOST, port=BACKEND_PORT, reload=True)
