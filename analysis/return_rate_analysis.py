"""
Step 5 - Return-Rate Calculation and Threshold Detection
========================================================

Reads the MapReduce output (category|week -> total_sold, total_returned),
calculates the return rate percentage per category per week:

    Return Rate (%) = (Total Returned Quantity / Total Sold Quantity) * 100

Classifies status:
    - Return rate > 10%:  "HIGH RETURNS"
    - Return rate <= 10%: "NORMAL"
    - Total sold == 0:    "Undefined" (safe division guard)

Compares categories, detects week-over-week upward trends, and outputs
a structured report ready for Task 6 backend consumption.

Usage:
    python analysis/return_rate_analysis.py
"""

import os
import numpy as np
import pandas as pd

MR_OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "output", "return_rate_mr.tsv"
)
REPORT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "output", "return_rate_report.csv"
)
FLAG_THRESHOLD = 10.0  # 10.0% threshold


def load_mr_output(path):
    rows = []
    with open(path) as f:
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            key, total_sold, total_returned = line.split("\t")
            category, week = key.split("|")
            rows.append(
                {
                    "category": category,
                    "week": week,
                    "total_sold": float(total_sold),
                    "total_returned": float(total_returned),
                }
            )
    return pd.DataFrame(rows)


def compute_rate_and_status(sold, returned):
    if sold is None or pd.isna(sold) or sold <= 0:
        return np.nan, "Undefined"
    rate = round((returned / sold) * 100.0, 2)
    status = "HIGH RETURNS" if rate > FLAG_THRESHOLD else "NORMAL"
    return rate, status


def main():
    df = load_mr_output(MR_OUTPUT_PATH)

    # --- Task 5: Return rate (%) and status classification ---
    rates = []
    statuses = []
    for _, row in df.iterrows():
        rate, status = compute_rate_and_status(row["total_sold"], row["total_returned"])
        rates.append(rate)
        statuses.append(status)

    df["return_rate"] = rates
    df["status"] = statuses
    df["flagged"] = df["status"] == "HIGH RETURNS"

    # Reorder columns to standard backend structure
    df = df.sort_values(["category", "week"]).reset_index(drop=True)
    df = df[["week", "category", "total_sold", "total_returned", "return_rate", "status", "flagged"]]

    # --- compare return rates between categories (overall) ---
    overall = (
        df.groupby("category")[["total_sold", "total_returned"]]
        .sum()
        .reset_index()
    )
    overall["return_rate"] = (overall["total_returned"] / overall["total_sold"] * 100.0).round(2)
    overall["status"] = overall["return_rate"].apply(
        lambda r: "HIGH RETURNS" if r > FLAG_THRESHOLD else "NORMAL"
    )
    overall = overall.sort_values("return_rate", ascending=False).reset_index(drop=True)

    print("=" * 70)
    print("Overall return rate by category (highest first):")
    print(overall.to_string(index=False, float_format=lambda x: f"{x:,.2f}"))

    # --- identify categories with increasing return rate (week over week) ---
    trend_rows = []
    for category, group in df.groupby("category"):
        group = group.sort_values("week")
        valid_rates = group.dropna(subset=["return_rate"])["return_rate"].tolist()
        if len(valid_rates) < 2:
            continue
        increases = sum(1 for a, b in zip(valid_rates, valid_rates[1:]) if b > a)
        decreases = sum(1 for a, b in zip(valid_rates, valid_rates[1:]) if b < a)
        net_change = round(valid_rates[-1] - valid_rates[0], 2)
        trend_rows.append(
            {
                "category": category,
                "first_week_rate_%": valid_rates[0],
                "last_week_rate_%": valid_rates[-1],
                "net_change_%_pts": net_change,
                "weeks_increased": increases,
                "weeks_decreased": decreases,
                "is_trending_up": net_change > 0 and increases > decreases,
            }
        )
    trend_df = pd.DataFrame(trend_rows).sort_values("net_change_%_pts", ascending=False)

    print("\n" + "=" * 70)
    print("Return-rate trend by category (first week -> last week):")
    print(trend_df.to_string(index=False, float_format=lambda x: f"{x:,.2f}"))

    trending_up = trend_df[trend_df["is_trending_up"]]["category"].tolist()
    print(f"\nCategories with an increasing return-rate trend: {trending_up}")

    # --- flag category/week combos above the 10% threshold ---
    high_returns = df[df["status"] == "HIGH RETURNS"].sort_values("return_rate", ascending=False)

    print("\n" + "=" * 70)
    print(f"Category/week combinations with status == HIGH RETURNS (> {FLAG_THRESHOLD}%):")
    if high_returns.empty:
        print("  (none)")
    else:
        print(high_returns.to_string(index=False, float_format=lambda x: f"{x:,.2f}"))

    flagged_categories_overall = overall[overall["status"] == "HIGH RETURNS"]
    print(f"\nCategories flagged on OVERALL return rate > {FLAG_THRESHOLD}%:")
    if flagged_categories_overall.empty:
        print("  (none)")
    else:
        print(flagged_categories_overall.to_string(index=False, float_format=lambda x: f"{x:,.2f}"))

    # --- write full report ---
    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    df.to_csv(REPORT_PATH, index=False)
    print(f"\nFull per-category/week report written to {REPORT_PATH}")


if __name__ == "__main__":
    main()
