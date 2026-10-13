#!/usr/bin/env python3
"""
Step 4 - MapReduce Data Processing (Mapper)
=============================================

Reads JSON transaction-event lines from stdin (one event per line, as
stored in HDFS by Step 3) and emits:

    <category>|<week>\t<quantity>\t<returned_flag>

Hadoop Streaming groups records by everything before the first tab, so
"<category>|<week>" is the effective map-reduce key.
"""

import json
import sys


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue

        category = event.get("category", "UNKNOWN")
        week = event.get("transaction_week", "UNKNOWN")
        quantity = event.get("quantity") or 0
        returned = 1 if str(event.get("return_status", "No")) == "Yes" else 0

        print("{0}|{1}\t{2}\t{3}".format(category, week, quantity, returned))


if __name__ == "__main__":
    main()
