"""
Step 1 - Dataset Collection and Understanding (continued)
==========================================================

Loads the raw transactions CSV, reports field types and missing data, then
writes a cleaned copy used by the rest of the pipeline (Kafka producer,
HDFS, MapReduce).

Usage:
    python data/explore_dataset.py
"""

import os

import pandas as pd

RAW_PATH = os.path.join(os.path.dirname(__file__), "raw", "transactions.csv")
CLEAN_PATH = os.path.join(os.path.dirname(__file__), "raw", "transactions_clean.csv")


def main():
    df = pd.read_csv(RAW_PATH)

    print("=" * 60)
    print("Shape:", df.shape)
    print("\nColumns & dtypes:")
    print(df.dtypes)

    print("\nMissing values per column:")
    missing = df.isna().sum()
    missing_pct = (missing / len(df) * 100).round(2)
    print(pd.DataFrame({"missing_count": missing, "missing_pct": missing_pct}))

    print("\nReturn status value counts:")
    print(df["return_status"].value_counts(dropna=False))

    # --- prepare / clean ---
    # quantity: impute missing with per-category median
    df["quantity"] = df.groupby("category")["quantity"].transform(
        lambda s: s.fillna(s.median())
    )
    # unit_price: impute missing with per-product median
    df["unit_price"] = df.groupby("product_id")["unit_price"].transform(
        lambda s: s.fillna(s.median())
    )
    # region: unknown bucket rather than dropping rows
    df["region"] = df["region"].fillna("Unknown")

    # normalize return_status to a clean boolean-like string, fill missing as "No"
    df["return_status"] = df["return_status"].fillna("No")

    df["transaction_date"] = pd.to_datetime(df["transaction_date"])
    df["transaction_week"] = df["transaction_date"].dt.strftime("%G-W%V")

    # Drop any duplicate order IDs and ensure positive quantities
    df = df.drop_duplicates(subset=["order_id"])
    df = df[df["quantity"] > 0]

    df.to_csv(CLEAN_PATH, index=False)

    print("\n" + "=" * 60)
    print(f"Cleaned dataset written to {CLEAN_PATH}")
    print("Remaining missing values:\n", df.isna().sum())


if __name__ == "__main__":
    main()
