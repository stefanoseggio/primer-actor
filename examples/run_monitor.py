# run_monitor.py
# Calls the Page Metadata Extractor Actor (page-metadata-extractor) via the Apify API
# and prints the resulting metadata records once the run finishes.

import os
from apify_client import ApifyClient

# Auth token is read from an env var - never hardcode it.
client = ApifyClient(os.environ["APIFY_TOKEN"])

# Minimal, realistic input matching the Actor's real input schema.
run_input = {
    "startUrls": [{"url": "https://apify.com"}],
    "maxRequestsPerCrawl": 20,
    "onlyChanged": False,
}

print("Starting Page Metadata Extractor run...")

# .call() starts the run on the platform and blocks until it finishes.
run = client.actor("U9fUBHDngX6IyjzzF").call(run_input=run_input)

print(f"Run {run['id']} finished with status: {run['status']}")

# Fetch the extracted metadata records from the run's default dataset.
dataset_items = client.dataset(run["defaultDatasetId"]).list_items().items

print(f"Fetched {len(dataset_items)} metadata records:")
for item in dataset_items:
    print(f"- {item['url']} | \"{item['title']}\" | {item['wordCount']} words | {item['eventType']}")
