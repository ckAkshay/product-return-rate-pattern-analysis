"""
Configuration settings for the Product Return-Rate Pattern Analysis Backend.
All configuration parameters support environment variable overrides.
"""

import os
from pathlib import Path

# Base paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Task 5 results file path (defaults to data/output/return_rate_report.csv)
DEFAULT_RESULTS_PATH = PROJECT_ROOT / "data" / "output" / "return_rate_report.csv"
RESULTS_PATH = Path(os.environ.get("RESULTS_PATH", str(DEFAULT_RESULTS_PATH)))

# Fallback Task 4 MapReduce output path
DEFAULT_MR_PATH = PROJECT_ROOT / "data" / "output" / "return_rate_mr.tsv"
MR_OUTPUT_PATH = Path(os.environ.get("MR_OUTPUT_PATH", str(DEFAULT_MR_PATH)))

# Server configuration
BACKEND_HOST = os.environ.get("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.environ.get("BACKEND_PORT", 8000))

# Alert threshold (strictly greater than 10.0%)
ALERT_THRESHOLD = float(os.environ.get("ALERT_THRESHOLD", 10.0))

# CORS Allowed Origins
DEFAULT_CORS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
]
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", ",".join(DEFAULT_CORS)).split(",")
    if origin.strip()
]
