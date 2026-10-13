"""
Step 3 - Hadoop HDFS Data Storage
===================================

Creates the HDFS storage location for incoming transaction data and
uploads the Kafka-consumed JSON-Lines buffer into it, then verifies the
data landed correctly (size + a sample read-back).

Usage:
    python hdfs/store_to_hdfs.py
"""

import os

from hdfs import InsecureClient

WEBHDFS_URL = os.environ.get("WEBHDFS_URL", "http://namenode:9870")
HDFS_USER = os.environ.get("HDFS_USER", "root")

LOCAL_STREAM_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "streamed", "transactions_stream.jsonl"
)
HDFS_DIR = "/data/transactions"
HDFS_PATH = f"{HDFS_DIR}/transactions_stream.jsonl"


def main():
    client = InsecureClient(WEBHDFS_URL, user=HDFS_USER)

    client.makedirs(HDFS_DIR)
    print(f"Ensured HDFS directory exists: {HDFS_DIR}")

    client.upload(HDFS_PATH, LOCAL_STREAM_PATH, overwrite=True)
    print(f"Uploaded {LOCAL_STREAM_PATH} -> hdfs://{HDFS_PATH}")

    # --- verify ---
    status = client.status(HDFS_PATH)
    print(f"Verified file on HDFS: size={status['length']} bytes, replication={status['replication']}")

    with client.read(HDFS_PATH, encoding="utf-8") as reader:
        first_line = reader.readline()
    print("Sample line read back from HDFS:", first_line.strip())

    listing = client.list(HDFS_DIR, status=True)
    print(f"\nContents of {HDFS_DIR}:")
    for name, meta in listing:
        print(f"  {name}  ({meta['length']} bytes)")


if __name__ == "__main__":
    main()
