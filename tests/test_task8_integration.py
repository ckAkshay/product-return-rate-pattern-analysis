"""
Comprehensive Integration Test Suite for Task 8: Integration and Testing
Covers:
- Test 1: Task 1 Dataset Validation
- Test 2: Task 2 Kafka Streaming Integration (in app container)
- Test 3: Task 3 Kafka to HDFS Storage Integration (in app container)
- Test 4: Task 4 MapReduce Aggregation with Isolated Fixture (Electronics / Clothing)
- Test 5: Task 5 Return-Rate Calculation & Strict 10% Threshold Matrix
- Test 6: Task 6 Backend REST APIs Verification
- Test 7: Task 7 Next.js Dashboard HTTP & API Contract Verification
- Test 8: End-to-End Controlled Pipeline Trace
- Test 9: Edge Cases & Error Handling Matrix
"""

import json
import os
import subprocess
import tempfile
import time
from pathlib import Path

import httpx
import numpy as np
import pandas as pd
import pytest

from analysis.return_rate_analysis import compute_rate_and_status
from backend.services.results_service import ResultsService, ResultsUnavailableException

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"


# ---------------------------------------------------------------------------
# Test 1: Task 1 Dataset Validation
# ---------------------------------------------------------------------------
def test_task1_dataset_validation():
    clean_csv = BASE_DIR / "data" / "raw" / "transactions_clean.csv"
    assert clean_csv.exists(), "Cleaned transactions dataset does not exist"

    df = pd.read_csv(clean_csv)
    assert len(df) > 0, "Dataset is empty"

    # Required columns
    expected_cols = [
        "order_id",
        "transaction_date",
        "product_id",
        "category",
        "quantity",
        "return_status",
        "transaction_week",
    ]
    for col in expected_cols:
        assert col in df.columns, f"Missing required column: {col}"

    # No null values in key fields
    assert df["order_id"].isna().sum() == 0, "Null order_ids found"
    assert df["category"].isna().sum() == 0, "Null categories found"
    assert df["quantity"].isna().sum() == 0, "Null quantities found"
    assert df["return_status"].isna().sum() == 0, "Null return_status found"
    assert df["transaction_week"].isna().sum() == 0, "Null transaction_week found"

    # Validity checks
    assert (df["quantity"] <= 0).sum() == 0, "Non-positive quantities found"
    assert df["order_id"].duplicated().sum() == 0, "Duplicate order_ids found"
    assert df["return_status"].isin(["Yes", "No"]).all(), "Invalid return_status values"

    # Date format validation
    parsed_dates = pd.to_datetime(df["transaction_date"], errors="coerce")
    assert parsed_dates.isna().sum() == 0, "Invalid transaction dates found"


# ---------------------------------------------------------------------------
# Test 2: Task 2 Kafka Streaming Integration (in app container)
# ---------------------------------------------------------------------------
def test_task2_kafka_streaming_isolated():
    snippet = """
from kafka import KafkaProducer, KafkaConsumer
import json, time

topic = "test_integration_events"
producer = KafkaProducer(
    bootstrap_servers="kafka:29092",
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    key_serializer=lambda k: str(k).encode("utf-8")
)

test_events = [
    {"order_id": 900001, "category": "Electronics", "quantity": 2, "return_status": "No", "transaction_week": "2025-W01"},
    {"order_id": 900002, "category": "Clothing", "quantity": 3, "return_status": "Yes", "transaction_week": "2025-W01"},
    {"order_id": 900003, "category": "Footwear", "quantity": 1, "return_status": "Yes", "transaction_week": "2025-W02"}
]

for ev in test_events:
    producer.send(topic, key=ev["order_id"], value=ev)
producer.flush()

consumer = KafkaConsumer(
    topic,
    bootstrap_servers="kafka:29092",
    auto_offset_reset="earliest",
    enable_auto_commit=True,
    consumer_timeout_ms=6000,
    value_deserializer=lambda v: json.loads(v.decode("utf-8"))
)

received = []
for msg in consumer:
    received.append(msg.value)
    if len(received) >= len(test_events):
        break
consumer.close()

assert len(received) >= len(test_events), f"Expected at least {len(test_events)} events, got {len(received)}"
print("KAFKA_STREAMING_SUCCESS")
"""
    cmd = ["docker", "compose", "exec", "-T", "app", "python", "-c", snippet]
    res = subprocess.run(cmd, capture_output=True, text=True, cwd=str(BASE_DIR))
    assert res.returncode == 0, f"Kafka test failed: {res.stderr}"
    assert "KAFKA_STREAMING_SUCCESS" in res.stdout


# ---------------------------------------------------------------------------
# Test 3: Task 3 Kafka to HDFS Storage Integration (in app container)
# ---------------------------------------------------------------------------
def test_task3_hdfs_storage_isolated():
    snippet = """
from hdfs import InsecureClient
import json

client = InsecureClient("http://namenode:9870", user="root")
test_dir = "/data/test_integration"
client.makedirs(test_dir)
test_file = f"{test_dir}/test_stream.jsonl"

data = json.dumps({"order_id": 999, "category": "Beauty", "quantity": 2, "return_status": "Yes"}) + "\\n"
client.write(test_file, data=data, overwrite=True)

status = client.status(test_file)
assert status["length"] > 0, "Uploaded HDFS file has 0 bytes"

with client.read(test_file, encoding="utf-8") as r:
    line = r.readline().strip()
    rec = json.loads(line)
    assert rec["order_id"] == 999
    assert rec["category"] == "Beauty"

client.delete(test_file)
print("HDFS_STORAGE_SUCCESS")
"""
    cmd = ["docker", "compose", "exec", "-T", "app", "python", "-c", snippet]
    res = subprocess.run(cmd, capture_output=True, text=True, cwd=str(BASE_DIR))
    assert res.returncode == 0, f"HDFS test failed: {res.stderr}"
    assert "HDFS_STORAGE_SUCCESS" in res.stdout


# ---------------------------------------------------------------------------
# Test 4: Task 4 MapReduce Aggregation with Isolated Fixture
# Input fixture:
#   - Electronics, Week 1: 40 sold, 4 returned
#   - Electronics, Week 1: 60 sold, 8 returned
#   - Clothing, Week 1: 100 sold, 5 returned
# Expected aggregate:
#   - Electronics|2025-W01: 100 sold, 12 returned
#   - Clothing|2025-W01: 100 sold, 5 returned
# ---------------------------------------------------------------------------
def test_task4_mapreduce_isolated_fixture():
    raw_events = [
        {"category": "Electronics", "transaction_week": "2025-W01", "quantity": 36, "return_status": "No"},
        {"category": "Electronics", "transaction_week": "2025-W01", "quantity": 4, "return_status": "Yes"},
        {"category": "Electronics", "transaction_week": "2025-W01", "quantity": 52, "return_status": "No"},
        {"category": "Electronics", "transaction_week": "2025-W01", "quantity": 8, "return_status": "Yes"},
        {"category": "Clothing", "transaction_week": "2025-W01", "quantity": 95, "return_status": "No"},
        {"category": "Clothing", "transaction_week": "2025-W01", "quantity": 5, "return_status": "Yes"},
    ]

    mapper_input = "\n".join(json.dumps(e) for e in raw_events) + "\n"
    p_map = subprocess.Popen(
        ["python", str(BASE_DIR / "mapreduce" / "mapper.py")],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True,
    )
    map_out, _ = p_map.communicate(input=mapper_input)

    # Sort
    sorted_lines = sorted(map_out.strip().split("\n"))
    sorted_input = "\n".join(sorted_lines) + "\n"

    # Reducer
    p_red = subprocess.Popen(
        ["python", str(BASE_DIR / "mapreduce" / "reducer.py")],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True,
    )
    red_out, _ = p_red.communicate(input=sorted_input)

    res_map = {}
    for line in red_out.strip().split("\n"):
        if not line:
            continue
        key, sold, ret = line.split("\t")
        res_map[key] = (float(sold), float(ret))

    assert "Electronics|2025-W01" in res_map
    assert "Clothing|2025-W01" in res_map

    elec_sold, elec_ret = res_map["Electronics|2025-W01"]
    assert elec_sold == 100.0, f"Expected 100.0 sold for Electronics, got {elec_sold}"
    assert elec_ret == 12.0, f"Expected 12.0 returned for Electronics, got {elec_ret}"

    cloth_sold, cloth_ret = res_map["Clothing|2025-W01"]
    assert cloth_sold == 100.0, f"Expected 100.0 sold for Clothing, got {cloth_sold}"
    assert cloth_ret == 5.0, f"Expected 5.0 returned for Clothing, got {cloth_ret}"


# ---------------------------------------------------------------------------
# Test 5: Task 5 Return-Rate Calculation & Strict 10% Threshold Matrix
# ---------------------------------------------------------------------------
def test_task5_threshold_matrix():
    matrix = [
        {"sold": 100, "returned": 5, "exp_rate": 5.0, "exp_status": "NORMAL"},
        {"sold": 100, "returned": 10, "exp_rate": 10.0, "exp_status": "NORMAL"},
        {"sold": 100, "returned": 12, "exp_rate": 12.0, "exp_status": "HIGH RETURNS"},
        {"sold": 200, "returned": 30, "exp_rate": 15.0, "exp_status": "HIGH RETURNS"},
        {"sold": 0, "returned": 0, "exp_rate": None, "exp_status": "Undefined"},
    ]

    for item in matrix:
        rate, status = compute_rate_and_status(item["sold"], item["returned"])
        assert status == item["exp_status"], (
            f"Status mismatch for sold={item['sold']}, ret={item['returned']}: expected {item['exp_status']}, got {status}"
        )
        if item["exp_rate"] is not None:
            assert rate == item["exp_rate"], (
                f"Rate mismatch for sold={item['sold']}, ret={item['returned']}: expected {item['exp_rate']}, got {rate}"
            )
        else:
            assert rate is None or np.isnan(rate), "Expected undefined/NaN rate for 0 sold"


# ---------------------------------------------------------------------------
# Test 6: Task 6 Backend REST APIs Verification
# ---------------------------------------------------------------------------
def test_task6_backend_api_integration():
    with httpx.Client(base_url=BACKEND_URL, timeout=10.0) as client:
        # Health
        res_health = client.get("/api/health")
        assert res_health.status_code == 200
        health_data = res_health.json()
        assert health_data["status"] == "ok"
        assert health_data["data_source_available"] is True

        # Summary
        res_sum = client.get("/api/summary")
        assert res_sum.status_code == 200
        sum_data = res_sum.json()
        assert sum_data["total_sold"] > 10000
        assert sum_data["total_returned"] > 1000
        assert sum_data["overall_return_rate"] > 0
        assert sum_data["high_return_categories_count"] >= 1

        # Check that overall rate is NOT an unweighted average of category percentages
        cat_avg = np.mean([c["return_rate"] for c in sum_data["category_summary"]])
        assert abs(sum_data["overall_return_rate"] - cat_avg) > 0.01, (
            "Overall return rate must be weighted (Total Returned / Total Sold), not simple unweighted average"
        )

        # Returns with filters
        res_ret = client.get("/api/returns?category=Footwear&page=1&page_size=15")
        assert res_ret.status_code == 200
        ret_data = res_ret.json()
        assert ret_data["total_records"] == 12
        for r in ret_data["data"]:
            assert r["category"] == "Footwear"

        # Alerts (strictly > 10.0%)
        res_alt = client.get("/api/alerts")
        assert res_alt.status_code == 200
        alt_data = res_alt.json()
        assert alt_data["alert_count"] == 30
        for alert in alt_data["alerts"]:
            assert alert["return_rate"] > 10.0
            assert alert["status"] == "HIGH RETURNS"


# ---------------------------------------------------------------------------
# Test 7: Task 7 Next.js Frontend Integration
# ---------------------------------------------------------------------------
def test_task7_frontend_integration():
    urls = [FRONTEND_URL, "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"]
    last_err = None
    with httpx.Client(timeout=10.0) as client:
        for u in urls:
            try:
                res = client.get(u)
                if res.status_code == 200 and "Product Return Analytics" in res.text:
                    assert "Weekly product-category return analysis and high-return alerts" in res.text
                    return
            except Exception as e:
                last_err = e
    if last_err:
        raise last_err
    pytest.fail("Could not connect to Next.js frontend on port 3000 or 3001")


# ---------------------------------------------------------------------------
# Test 8: End-to-End Trace Verification
# ---------------------------------------------------------------------------
def test_task8_e2e_reconciliation():
    # Compare ground truth from Task 5 CSV with Backend API responses
    report_csv = BASE_DIR / "data" / "output" / "return_rate_report.csv"
    assert report_csv.exists()

    df = pd.read_csv(report_csv)
    total_sold_expected = float(df["total_sold"].sum())
    total_returned_expected = float(df["total_returned"].sum())
    overall_rate_expected = round((total_returned_expected / total_sold_expected) * 100.0, 2)
    alert_count_expected = (df["return_rate"] > 10.0).sum()

    with httpx.Client(base_url=BACKEND_URL, timeout=10.0) as client:
        summary = client.get("/api/summary").json()
        alerts = client.get("/api/alerts").json()

        assert summary["total_sold"] == total_sold_expected
        assert summary["total_returned"] == total_returned_expected
        assert summary["overall_return_rate"] == overall_rate_expected
        assert alerts["alert_count"] == alert_count_expected


# ---------------------------------------------------------------------------
# Test 9: Edge Cases & Error Handling Matrix
# ---------------------------------------------------------------------------
def test_task9_edge_cases():
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
        f.write("week,category,total_sold,total_returned,return_rate,status\n")
        f.write("2025-W01,ExactTen,100,10,10.0,NORMAL\n")
        f.write("2025-W01,ZeroSold,0,0,,Undefined\n")
        f.write("2025-W01,HighRet,100,10.01,10.01,HIGH RETURNS\n")
        temp_path = Path(f.name)

    try:
        service = ResultsService(temp_path)
        returns = service.get_returns()
        alerts = service.get_alerts()

        # ExactTen (10.0%) must remain NORMAL and NOT in alerts
        exact_ten = next(r for r in returns["data"] if r["category"] == "ExactTen")
        assert exact_ten["status"] == "NORMAL"
        assert not any(a["category"] == "ExactTen" for a in alerts["alerts"])

        # HighRet (10.01%) must be HIGH RETURNS and in alerts
        high_ret = next(r for r in returns["data"] if r["category"] == "HighRet")
        assert high_ret["status"] == "HIGH RETURNS"
        assert any(a["category"] == "HighRet" for a in alerts["alerts"])

        # ZeroSold must be Undefined
        zero_sold = next(r for r in returns["data"] if r["category"] == "ZeroSold")
        assert zero_sold["status"] == "Undefined"
        assert zero_sold["return_rate"] is None

        # Missing file test
        service_missing = ResultsService(Path("non_existent_file.csv"))
        with pytest.raises(ResultsUnavailableException):
            service_missing.get_summary()
    finally:
        if temp_path.exists():
            temp_path.unlink()
