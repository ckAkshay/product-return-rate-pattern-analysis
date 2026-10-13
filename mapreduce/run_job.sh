#!/usr/bin/env bash
# Step 4 - MapReduce Data Processing (job submission)
#
# Run this FROM INSIDE the resourcemanager (or namenode) container, where
# the Hadoop client and YARN config live and /workspace is mounted:
#
#   docker exec -it resourcemanager bash /workspace/mapreduce/run_job.sh
#
set -euo pipefail

INPUT=/data/transactions/transactions_stream.jsonl
OUTPUT=/data/output/return_rate_mr
STREAMING_JAR=$(find "$HADOOP_HOME" -name 'hadoop-streaming*.jar' | head -n 1)

if [ -z "$STREAMING_JAR" ]; then
  echo "Could not locate hadoop-streaming jar under \$HADOOP_HOME ($HADOOP_HOME)" >&2
  exit 1
fi

echo "Using streaming jar: $STREAMING_JAR"

# clean any previous output dir (MapReduce refuses to overwrite)
hdfs dfs -rm -r -f "$OUTPUT" || true

hadoop jar "$STREAMING_JAR" \
  -D mapreduce.job.name="ReturnRatePatternAnalysis" \
  -files /workspace/mapreduce/mapper.py,/workspace/mapreduce/reducer.py \
  -mapper "python3 mapper.py" \
  -reducer "python3 reducer.py" \
  -input "$INPUT" \
  -output "$OUTPUT"

echo
echo "MapReduce job complete. Output in HDFS at: $OUTPUT"
hdfs dfs -cat "$OUTPUT/part-*" | head -n 20

# also merge the output down to the shared /workspace volume so Step 5
# (which runs in the plain-python `app` container, no Hadoop client) can
# read it as an ordinary local file.
mkdir -p /workspace/data/output
hdfs dfs -getmerge "$OUTPUT" /workspace/data/output/return_rate_mr.tsv
echo "Merged MapReduce output copied to /workspace/data/output/return_rate_mr.tsv"
