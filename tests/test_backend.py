"""
Comprehensive test suite for Task 6 Backend & Results Management.
Covers Tests A through H as specified in the audit requirements:
- Test A: Health endpoint
- Test B: Summary calculation with isolated fixture (300 sold, 30 returned -> 10.0%)
- Test C: Category-wise results and field preservation
- Test D: Alert threshold (>10% strictly; 10% is NORMAL)
- Test E: Missing results handling (503 response, no fake zeros)
- Test F: Malformed results resilience
- Test G: Frontend integration (static files & CORS headers)
- Test H: Real integration test against actual Task 5 output
"""

import os
import tempfile
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.results_service import ResultsService


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# Test A: Health endpoint
# ---------------------------------------------------------------------------
def test_a_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "product-return-rate-backend"
    assert "data_source_available" in data
    assert "records_count" in data


# ---------------------------------------------------------------------------
# Test B: Summary calculation with isolated fixture
# Fixture: Total sold = 300, Total returned = 30 -> Expected rate = 10.0%
# ---------------------------------------------------------------------------
def test_b_summary_calculation_isolated():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write("week,category,total_sold,total_returned,return_rate,status\n")
        f.write("2025-W01,Electronics,100,10,10.0,NORMAL\n")
        f.write("2025-W01,Clothing,200,20,10.0,NORMAL\n")
        temp_path = Path(f.name)

    try:
        service = ResultsService(temp_path)
        summary = service.get_summary()

        assert summary["total_sold"] == 300.0
        assert summary["total_returned"] == 30.0
        assert summary["overall_return_rate"] == 10.0
        assert summary["high_return_records_count"] == 0
        assert summary["categories_count"] == 2
        assert summary["reporting_period"]["total_weeks"] == 1
    finally:
        if temp_path.exists():
            temp_path.unlink()


# ---------------------------------------------------------------------------
# Test C: Category-wise results preservation
# ---------------------------------------------------------------------------
def test_c_category_wise_results():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write("week,category,total_sold,total_returned,return_rate,status\n")
        f.write("2025-W01,Electronics,150,15,10.0,NORMAL\n")
        f.write("2025-W02,Footwear,200,40,20.0,HIGH RETURNS\n")
        temp_path = Path(f.name)

    try:
        service = ResultsService(temp_path)
        res = service.get_returns(page=1, page_size=10)

        assert res["total_records"] == 2
        data = res["data"]

        rec1 = next(r for r in data if r["category"] == "Electronics")
        assert rec1["week"] == "2025-W01"
        assert rec1["total_sold"] == 150.0
        assert rec1["total_returned"] == 15.0
        assert rec1["return_rate"] == 10.0
        assert rec1["status"] == "NORMAL"

        rec2 = next(r for r in data if r["category"] == "Footwear")
        assert rec2["week"] == "2025-W02"
        assert rec2["total_sold"] == 200.0
        assert rec2["total_returned"] == 40.0
        assert rec2["return_rate"] == 20.0
        assert rec2["status"] == "HIGH RETURNS"
    finally:
        if temp_path.exists():
            temp_path.unlink()


# ---------------------------------------------------------------------------
# Test D: Strict Alert threshold (>10% strictly)
# Test matrix:
#   5%   -> NORMAL
#   10%  -> NORMAL
#   12%  -> HIGH RETURNS
#   15%  -> HIGH RETURNS
# ---------------------------------------------------------------------------
def test_d_alert_threshold_strictly_greater_than_10():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write("week,category,total_sold,total_returned,return_rate,status\n")
        f.write("2025-W01,CatA,100,5,5.0,NORMAL\n")
        f.write("2025-W01,CatB,100,10,10.0,NORMAL\n")
        f.write("2025-W01,CatC,100,12,12.0,HIGH RETURNS\n")
        f.write("2025-W01,CatD,200,30,15.0,HIGH RETURNS\n")
        temp_path = Path(f.name)

    try:
        service = ResultsService(temp_path)
        alerts_res = service.get_alerts()

        # Only CatC (12%) and CatD (15%) should be in alerts. CatB (10%) MUST NOT be flagged.
        assert alerts_res["alert_count"] == 2
        alert_cats = [a["category"] for a in alerts_res["alerts"]]
        assert "CatC" in alert_cats
        assert "CatD" in alert_cats
        assert "CatB" not in alert_cats  # 10.0% is NORMAL
        assert "CatA" not in alert_cats  # 5.0% is NORMAL
    finally:
        if temp_path.exists():
            temp_path.unlink()


# ---------------------------------------------------------------------------
# Test E: Missing results handling (503 response, no fake zeros)
# ---------------------------------------------------------------------------
def test_e_missing_results():
    non_existent = Path("data/output/non_existent_results_file_12345.csv")
    service = ResultsService(non_existent)

    with pytest.raises(Exception) as exc_info:
        service.get_summary()
    assert "not found" in str(exc_info.value).lower()


# ---------------------------------------------------------------------------
# Test F: Malformed results handling
# ---------------------------------------------------------------------------
def test_f_malformed_results():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write("week,category,total_sold,total_returned,return_rate,status\n")
        f.write("2025-W01,GoodCat,100,5,5.0,NORMAL\n")
        f.write(",EmptyCat,100,5,5.0,NORMAL\n")             # Missing week -> skipped
        f.write("2025-W01,,100,5,5.0,NORMAL\n")             # Missing category -> skipped
        f.write("2025-W01,ZeroSold,0,0,,Undefined\n")        # Zero sold -> handled safely
        temp_path = Path(f.name)

    try:
        service = ResultsService(temp_path)
        returns = service.get_returns()

        # Only GoodCat and ZeroSold should be valid
        assert returns["total_records"] == 2
        zero_rec = next(r for r in returns["data"] if r["category"] == "ZeroSold")
        assert zero_rec["status"] == "Undefined"
        assert zero_rec["return_rate"] is None
    finally:
        if temp_path.exists():
            temp_path.unlink()


# ---------------------------------------------------------------------------
# Test G: Frontend integration (static files & CORS headers)
# ---------------------------------------------------------------------------
def test_g_frontend_static_and_cors(client):
    # Test dashboard HTML served at root
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "Product Return-Rate Pattern Analysis" in res_root.text

    # Test CSS asset
    res_css = client.get("/static/css/dashboard.css")
    assert res_css.status_code == 200

    # Test JS asset
    res_js = client.get("/static/js/dashboard.js")
    assert res_js.status_code == 200

    # Test CORS headers on API
    res_api = client.get(
        "/api/health", headers={"Origin": "http://localhost:3000"}
    )
    assert res_api.status_code == 200
    assert res_api.headers.get("access-control-allow-origin") == "http://localhost:3000"


# ---------------------------------------------------------------------------
# Test H: Real integration test against actual Task 5 output
# ---------------------------------------------------------------------------
def test_h_real_task_5_integration(client):
    # Verify health
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    health_data = res_health.json()
    assert health_data["data_source_available"] is True
    assert health_data["records_count"] == 96

    # Verify summary
    res_sum = client.get("/api/summary")
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert sum_data["total_sold"] > 10000
    assert sum_data["total_returned"] > 1000
    assert sum_data["categories_count"] == 8
    assert sum_data["high_return_categories_count"] == 2  # Footwear & Clothing

    # Verify returns
    res_ret = client.get("/api/returns?category=Footwear&page=1&page_size=20")
    assert res_ret.status_code == 200
    ret_data = res_ret.json()
    assert ret_data["total_records"] == 12  # 12 weeks for Footwear

    # Verify alerts (>10%)
    res_alt = client.get("/api/alerts")
    assert res_alt.status_code == 200
    alt_data = res_alt.json()
    assert alt_data["alert_count"] == 30
    for a in alt_data["alerts"]:
        assert a["return_rate"] > 10.0
        assert a["status"] == "HIGH RETURNS"
