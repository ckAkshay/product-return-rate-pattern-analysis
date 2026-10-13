"""
Step 5 - Return-Rate Calculation
===================================

Reads the MapReduce output (category|week -> total_sold, total_returned),
calculates the return rate per category per week, compares categories,
detects which ones are trending upward, and flags any category/week with
a return rate above 10%.

Usage:
    python analysis/return_rate_analysis.py
"""

import os

import pandas as pd

MR_OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "output", "return_rate_mr.tsv"
)
REPORT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "output", "return_rate_report.csv"
)
FLAG_THRESHOLD = 0.10  # 10%


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


def main():
    df = load_mr_output(MR_OUTPUT_PATH)
    df["return_rate"] = df["total_returned"] / df["total_sold"]
    df = df.sort_values(["category", "week"]).reset_index(drop=True)

    # --- compare return rates between categories (overall) ---
    overall = (
        df.groupby("category")[["total_sold", "total_returned"]]
        .sum()
        .assign(return_rate=lambda d: d["total_returned"] / d["total_sold"])
        .sort_values("return_rate", ascending=False)
    )

    print("=" * 70)
    print("Overall return rate by category (highest first):")
    print(overall.to_string(float_format=lambda x: f"{x:,.3f}"))

    # --- identify categories with increasing return rate (week over week) ---
    trend_rows = []
    for category, group in df.groupby("category"):
        group = group.sort_values("week")
        rates = group["return_rate"].tolist()
        if len(rates) < 2:
            continue
        increases = sum(1 for a, b in zip(rates, rates[1:]) if b > a)
        decreases = sum(1 for a, b in zip(rates, rates[1:]) if b < a)
        net_change = rates[-1] - rates[0]
        trend_rows.append(
            {
                "category": category,
                "first_week_rate": rates[0],
                "last_week_rate": rates[-1],
                "net_change": net_change,
                "weeks_increased": increases,
                "weeks_decreased": decreases,
                "is_trending_up": net_change > 0 and increases > decreases,
            }
        )
    trend_df = pd.DataFrame(trend_rows).sort_values("net_change", ascending=False)

    print("\n" + "=" * 70)
    print("Return-rate trend by category (first week -> last week):")
    print(trend_df.to_string(index=False, float_format=lambda x: f"{x:,.3f}"))

    trending_up = trend_df[trend_df["is_trending_up"]]["category"].tolist()
    print(f"\nCategories with an increasing return-rate trend: {trending_up}")

    # --- flag category/week combos above the 10% threshold ---
    df["flagged"] = df["return_rate"] > FLAG_THRESHOLD
    flagged = df[df["flagged"]].sort_values("return_rate", ascending=False)

    print("\n" + "=" * 70)
    print(f"Category/week combinations with return rate > {FLAG_THRESHOLD:.0%}:")
    if flagged.empty:
        print("  (none)")
    else:
        print(flagged.to_string(index=False, float_format=lambda x: f"{x:,.3f}"))

    flagged_categories_overall = overall[overall["return_rate"] > FLAG_THRESHOLD]
    print(f"\nCategories flagged on OVERALL return rate > {FLAG_THRESHOLD:.0%}:")
    if flagged_categories_overall.empty:
        print("  (none)")
    else:
        print(flagged_categories_overall.to_string(float_format=lambda x: f"{x:,.3f}"))

    # --- write full report ---
    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    df.to_csv(REPORT_PATH, index=False)
    print(f"\nFull per-category/week report written to {REPORT_PATH}")


if __name__ == "__main__":
    main()
