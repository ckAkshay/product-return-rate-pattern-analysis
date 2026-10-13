"""
Data access and business logic service for Task 5 analysis results.
Handles file validation, caching with mtime detection, filtering,
and metrics aggregation.
"""

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from backend.config import ALERT_THRESHOLD, RESULTS_PATH


class ResultsUnavailableException(Exception):
    """Raised when the Task 5 results file is missing, empty, or inaccessible."""
    pass


class InvalidFilterException(Exception):
    """Raised when query parameters or filters are invalid."""
    pass


class ResultsService:
    def __init__(self, file_path: Optional[Path] = None):
        self.file_path = file_path or RESULTS_PATH
        self._cached_df: Optional[pd.DataFrame] = None
        self._last_mtime: Optional[float] = None

    def _load_data(self) -> pd.DataFrame:
        """
        Loads and parses the Task 5 CSV file with mtime-based cache invalidation.
        Performs validation and data sanitization.
        """
        if not self.file_path.exists():
            raise ResultsUnavailableException(
                f"Results file '{self.file_path.name}' not found. "
                "Ensure Task 5 (analysis/return_rate_analysis.py) has completed."
            )

        current_mtime = os.path.getmtime(self.file_path)
        if self._cached_df is not None and self._last_mtime == current_mtime:
            return self._cached_df

        try:
            df = pd.read_csv(self.file_path)
        except Exception as e:
            raise ResultsUnavailableException(
                f"Failed to read results file '{self.file_path.name}': {str(e)}"
            )

        if df.empty:
            raise ResultsUnavailableException(
                f"Results file '{self.file_path.name}' is empty."
            )

        # Validate required column presence
        required_cols = {"week", "category", "total_sold", "total_returned"}
        missing_cols = required_cols - set(df.columns)
        if missing_cols:
            raise ResultsUnavailableException(
                f"Results file is missing required fields: {sorted(list(missing_cols))}"
            )

        # Clean, validate and standardize records
        sanitized_rows = []
        for _, row in df.iterrows():
            week = str(row.get("week", "")).strip()
            category = str(row.get("category", "")).strip()
            if not week or not category or week.lower() == "nan" or category.lower() == "nan":
                continue

            try:
                sold = float(row.get("total_sold", 0.0))
            except (ValueError, TypeError):
                sold = 0.0

            try:
                returned = float(row.get("total_returned", 0.0))
            except (ValueError, TypeError):
                returned = 0.0

            # Safe zero-sold division guard
            if sold <= 0:
                rate = None
                status = "Undefined"
            else:
                # Calculate return rate percentage: (Total Returned / Total Sold) * 100
                rate = round((returned / sold) * 100.0, 2)
                # Strict threshold: strictly > 10.0% is HIGH RETURNS, <= 10.0% is NORMAL
                status = "HIGH RETURNS" if rate > ALERT_THRESHOLD else "NORMAL"

            sanitized_rows.append(
                {
                    "week": week,
                    "category": category,
                    "total_sold": sold,
                    "total_returned": returned,
                    "return_rate": rate,
                    "status": status,
                    "flagged": status == "HIGH RETURNS",
                }
            )

        if not sanitized_rows:
            raise ResultsUnavailableException("No valid records found in the results file.")

        clean_df = pd.DataFrame(sanitized_rows)
        self._cached_df = clean_df
        self._last_mtime = current_mtime
        return clean_df

    def get_health(self) -> Dict[str, Any]:
        """Provides service health and data accessibility status."""
        data_available = self.file_path.exists() and self.file_path.stat().st_size > 0
        records_count = 0
        last_modified = None

        if data_available:
            try:
                df = self._load_data()
                records_count = len(df)
                mtime = os.path.getmtime(self.file_path)
                last_modified = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()
            except Exception:
                data_available = False

        return {
            "status": "ok",
            "service": "product-return-rate-backend",
            "data_source_available": data_available,
            "data_source_name": self.file_path.name,
            "records_count": records_count,
            "last_modified": last_modified,
        }

    def get_summary(self) -> Dict[str, Any]:
        """
        Computes overall summary metrics.
        Calculates overall return rate as: (Total Returned / Total Sold) * 100.
        Never averages category percentages.
        """
        df = self._load_data()

        total_sold = float(df["total_sold"].sum())
        total_returned = float(df["total_returned"].sum())
        overall_rate = round((total_returned / total_sold) * 100.0, 2) if total_sold > 0 else 0.0

        # High-return records count (category-weeks > 10%)
        high_return_records = df[df["status"] == "HIGH RETURNS"]
        high_return_weeks_count = len(high_return_records)

        # Category overall aggregation
        cat_group = (
            df.groupby("category")[["total_sold", "total_returned"]]
            .sum()
            .reset_index()
        )
        cat_group["return_rate"] = cat_group.apply(
            lambda r: round((r["total_returned"] / r["total_sold"]) * 100.0, 2)
            if r["total_sold"] > 0
            else 0.0,
            axis=1,
        )
        cat_group["status"] = cat_group["return_rate"].apply(
            lambda r: "HIGH RETURNS" if r > ALERT_THRESHOLD else "NORMAL"
        )
        cat_group = cat_group.sort_values("return_rate", ascending=False)

        high_return_categories = cat_group[cat_group["status"] == "HIGH RETURNS"].to_dict(orient="records")

        all_weeks = sorted(df["week"].unique().tolist())
        reporting_period = {
            "start_week": all_weeks[0] if all_weeks else None,
            "end_week": all_weeks[-1] if all_weeks else None,
            "total_weeks": len(all_weeks),
        }

        mtime = os.path.getmtime(self.file_path) if self.file_path.exists() else None
        last_updated = (
            datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()
            if mtime
            else None
        )

        return {
            "total_sold": total_sold,
            "total_returned": total_returned,
            "overall_return_rate": overall_rate,
            "high_return_records_count": high_return_weeks_count,
            "high_return_categories_count": len(high_return_categories),
            "high_return_categories": high_return_categories,
            "category_summary": cat_group.to_dict(orient="records"),
            "categories_count": len(df["category"].unique()),
            "reporting_period": reporting_period,
            "threshold_percentage": ALERT_THRESHOLD,
            "last_updated": last_updated,
        }

    def get_returns(
        self,
        category: Optional[str] = None,
        week: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """Returns filtered, paginated category-wise weekly return rate records."""
        df = self._load_data()

        if page < 1:
            raise InvalidFilterException("Page number must be >= 1.")
        if page_size < 0:
            raise InvalidFilterException("Page size must be >= 0.")

        filtered = df.copy()

        if category:
            cat_clean = category.strip().lower()
            filtered = filtered[filtered["category"].str.lower() == cat_clean]

        if week:
            wk_clean = week.strip().upper()
            filtered = filtered[filtered["week"].str.upper() == wk_clean]

        if status:
            stat_clean = status.strip().upper()
            if stat_clean not in ["NORMAL", "HIGH RETURNS", "UNDEFINED"]:
                raise InvalidFilterException("Status filter must be 'NORMAL', 'HIGH RETURNS', or 'Undefined'.")
            filtered = filtered[filtered["status"].str.upper() == stat_clean]

        total_records = len(filtered)
        sorted_df = filtered.sort_values(["week", "category"]).reset_index(drop=True)

        # Pagination: page_size=0 returns all records
        if page_size > 0:
            total_pages = max(1, (total_records + page_size - 1) // page_size)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            paged_data = sorted_df.iloc[start_idx:end_idx]
        else:
            total_pages = 1
            paged_data = sorted_df

        # Clean NaN values for JSON compatibility
        records = paged_data.to_dict(orient="records")
        for rec in records:
            if rec["return_rate"] is not None and np.isnan(rec["return_rate"]):
                rec["return_rate"] = None

        return {
            "total_records": total_records,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "data": records,
        }

    def get_alerts(
        self, category: Optional[str] = None, week: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Returns only category-week records with return rates strictly greater than 10%.
        A rate equal to or less than 10% is NEVER flagged as an alert.
        """
        df = self._load_data()

        # Strict greater-than filter
        alerts_df = df[df["status"] == "HIGH RETURNS"].copy()

        if category:
            alerts_df = alerts_df[alerts_df["category"].str.lower() == category.strip().lower()]

        if week:
            alerts_df = alerts_df[alerts_df["week"].str.upper() == week.strip().upper()]

        alerts_df = alerts_df.sort_values("return_rate", ascending=False).reset_index(drop=True)
        records = alerts_df.to_dict(orient="records")

        return {
            "alert_count": len(records),
            "threshold_percentage": ALERT_THRESHOLD,
            "alerts": records,
        }
