"""
Step 2 - Kafka-Based Data Streaming (consumer side)
=====================================================

Subscribes to `transactions_events`, verifies events are being received
(counts + sample printout), and writes every consumed event to a local
JSON-Lines buffer file that Step 3 loads into HDFS.

Usage:
    python kafka/consumer.py                 # run until --max-events reached
    python kafka/consumer.py --max-events 0   # run forever (ctrl-C to stop)
"""

import argparse
import json
import os

from kafka import KafkaConsumer

TOPIC = "transactions_events"
BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:29092")

STREAM_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "streamed")
STREAM_PATH = os.path.join(STREAM_DIR, "transactions_stream.jsonl")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-events", type=int, default=100000, help="stop after N events (0 = run forever)")
    parser.add_argument("--timeout-ms", type=int, default=15000, help="give up after this much idle time")
    args = parser.parse_args()

    os.makedirs(STREAM_DIR, exist_ok=True)

    consumer = KafkaConsumer(
        TOPIC,
        bootstrap_servers=BOOTSTRAP_SERVERS,
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        group_id="return-rate-pipeline",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        consumer_timeout_ms=args.timeout_ms,
    )

    received = 0
    with open(STREAM_PATH, "w") as f:
        for message in consumer:
            event = message.value
            f.write(json.dumps(event) + "\n")
            received += 1

            if received <= 3:
                print("Sample event:", event)
            if received % 1000 == 0:
                print(f"Consumed {received:,} events...")

            if args.max_events and received >= args.max_events:
                break

    print(f"Done. Verified {received:,} events consumed from '{TOPIC}'.")
    print(f"Buffered to {STREAM_PATH}")

    if received == 0:
        print("WARNING: no events were received - is the producer running and the topic correct?")


if __name__ == "__main__":
    main()
