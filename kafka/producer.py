"""
Step 2 - Kafka-Based Data Streaming (producer side)
=====================================================

Reads the cleaned transactions CSV and publishes each row as a JSON
"transaction/return event" to the Kafka topic `transactions_events`,
simulating a live stream of sales and return events.

Usage (inside the `app` container, once Kafka is up):
    python kafka/producer.py
    python kafka/producer.py --delay 0.01   # slow it down to watch it stream
"""

import argparse
import json
import os
import time

import pandas as pd
from kafka import KafkaProducer

CLEAN_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "transactions_clean.csv")
TOPIC = "transactions_events"
BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:29092")


def make_producer():
    return KafkaProducer(
        bootstrap_servers=BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: str(k).encode("utf-8"),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--delay", type=float, default=0.0, help="seconds to sleep between events")
    args = parser.parse_args()

    df = pd.read_csv(CLEAN_PATH)
    producer = make_producer()

    sent = 0
    for _, row in df.iterrows():
        event = row.where(pd.notna(row), None).to_dict()
        producer.send(TOPIC, key=event["order_id"], value=event)
        sent += 1
        if args.delay:
            time.sleep(args.delay)
        if sent % 1000 == 0:
            print(f"Sent {sent:,} events...")

    producer.flush()
    print(f"Done. Published {sent:,} events to topic '{TOPIC}' on {BOOTSTRAP_SERVERS}.")


if __name__ == "__main__":
    main()
