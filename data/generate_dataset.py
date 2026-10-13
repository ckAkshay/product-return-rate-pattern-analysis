"""
Step 1 - Dataset Collection and Understanding
==============================================

Kaggle's "E-commerce Transactions" style datasets do not reliably ship a
`return_status` column, and pulling a specific Kaggle dataset requires a
personal Kaggle API token (KAGGLE_USERNAME / KAGGLE_KEY) that this machine
does not have configured.

So this script *simulates* a realistic E-commerce transactions dataset with
the fields the assignment asks for:

    order_id, transaction_date, product_id, product_name, category,
    quantity, unit_price, customer_id, region, return_status, return_date,
    return_reason

It also deliberately injects missing values (quantity / unit_price / region)
so Step 1's "identify missing data" requirement has something real to find,
and injects a rising return-rate trend into a couple of categories so Step 5
("identify categories with increasing return rates") has a real signal to
detect.

If you have a real Kaggle dataset you'd rather use instead, drop its CSV at
data/raw/transactions.csv with (at least) these columns and skip this
script entirely - everything downstream only depends on that file existing.

Usage (inside the `app` container):
    python data/generate_dataset.py
"""

import os
import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from faker import Faker

random.seed(42)
np.random.seed(42)
fake = Faker()
Faker.seed(42)

OUT_DIR = os.path.join(os.path.dirname(__file__), "raw")
OUT_PATH = os.path.join(OUT_DIR, "transactions.csv")

NUM_WEEKS = 12
START_DATE = datetime(2025, 1, 6)  # a Monday
REGIONS = ["North", "South", "East", "West"]

CATEGORIES = {
    # category: (base_return_rate, weekly_drift)
    "Electronics": (0.06, 0.0),
    "Clothing": (0.14, 0.0),
    "Home & Kitchen": (0.05, 0.0),
    "Beauty": (0.07, 0.0),
    "Toys": (0.04, 0.0),
    "Sports": (0.08, 0.0),
    "Footwear": (0.09, 0.010),     # trending UP each week -> should get flagged
    "Furniture": (0.03, 0.007),    # trending UP each week -> should get flagged
}

PRODUCTS_PER_CATEGORY = 6
RETURN_REASONS = [
    "Defective/Damaged",
    "Wrong item delivered",
    "Not as described",
    "Changed mind",
    "Better price found",
    "Late delivery",
]


def build_product_catalog():
    products = []
    pid = 1000
    for category in CATEGORIES:
        for _ in range(PRODUCTS_PER_CATEGORY):
            pid += 1
            products.append(
                {
                    "product_id": f"P{pid}",
                    "product_name": f"{category.split(' ')[0]} Item {pid}",
                    "category": category,
                    "unit_price": round(np.random.uniform(5, 500), 2),
                }
            )
    return pd.DataFrame(products)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    catalog = build_product_catalog()

    rows = []
    order_id = 500000

    for week in range(NUM_WEEKS):
        week_start = START_DATE + timedelta(weeks=week)
        # organic growth in weekly volume
        n_transactions = int(np.random.normal(loc=350 + week * 5, scale=25))
        n_transactions = max(n_transactions, 150)

        for _ in range(n_transactions):
            order_id += 1
            product = catalog.sample(1).iloc[0]
            category = product["category"]
            base_rate, drift = CATEGORIES[category]
            week_return_rate = min(base_rate + drift * week, 0.6)

            tx_date = week_start + timedelta(days=random.randint(0, 6))
            quantity = random.randint(1, 5)
            is_returned = np.random.rand() < week_return_rate

            return_date, return_reason, return_status = None, None, "No"
            if is_returned:
                return_status = "Yes"
                return_date = tx_date + timedelta(days=random.randint(1, 14))
                return_reason = random.choice(RETURN_REASONS)

            rows.append(
                {
                    "order_id": order_id,
                    "transaction_date": tx_date.strftime("%Y-%m-%d"),
                    "product_id": product["product_id"],
                    "product_name": product["product_name"],
                    "category": category,
                    "quantity": quantity,
                    "unit_price": product["unit_price"],
                    "customer_id": f"C{random.randint(1, 5000):05d}",
                    "region": random.choice(REGIONS),
                    "return_status": return_status,
                    "return_date": return_date.strftime("%Y-%m-%d") if return_date else None,
                    "return_reason": return_reason,
                }
            )

    df = pd.DataFrame(rows)

    # --- inject realistic missing data for Step 1's "identify missing data" task ---
    missing_frac = 0.02
    for col in ["quantity", "unit_price", "region"]:
        idx = df.sample(frac=missing_frac, random_state=42).index
        df.loc[idx, col] = np.nan

    df.to_csv(OUT_PATH, index=False)
    print(f"Wrote {len(df):,} simulated transactions to {OUT_PATH}")
    print(df.head())


if __name__ == "__main__":
    main()
