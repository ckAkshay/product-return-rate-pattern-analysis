#!/usr/bin/env python3
"""
Step 4 - MapReduce Data Processing (Reducer)
===============================================

Hadoop Streaming sorts mapper output by key and feeds it to the reducer
line-by-line, with identical keys appearing consecutively (it does NOT
group them into a list for you). This reducer tracks the current key
itself and emits one aggregated line per key once the key changes:

    <category>|<week>\t<total_products_sold>\t<total_products_returned>
"""

import sys


def emit(key, total_sold, total_returned):
    print("{0}\t{1}\t{2}".format(key, total_sold, total_returned))


def main():
    current_key = None
    total_sold = 0
    total_returned = 0

    for line in sys.stdin:
        line = line.rstrip("\n")
        if not line:
            continue
        try:
            key, quantity, returned = line.split("\t")
            quantity = float(quantity)
            returned = int(returned)
        except ValueError:
            continue

        if current_key is not None and key != current_key:
            emit(current_key, total_sold, total_returned)
            total_sold = 0
            total_returned = 0

        current_key = key
        total_sold += quantity
        if returned:
            total_returned += quantity

    if current_key is not None:
        emit(current_key, total_sold, total_returned)


if __name__ == "__main__":
    main()
