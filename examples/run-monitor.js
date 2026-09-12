// run-monitor.js
// Calls the Page Metadata Extractor Actor (page-metadata-extractor) via the Apify API
// and logs the resulting metadata records once the run finishes.

const { ApifyClient } = require('apify-client');

// Auth token is read from an env var - never hardcode it.
const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
});

async function main() {
    // Minimal, realistic input matching the Actor's real input schema.
    const input = {
        startUrls: [{ url: 'https://apify.com' }],
        maxRequestsPerCrawl: 20,
        onlyChanged: false,
    };

    console.log('Starting Page Metadata Extractor run...');

    // .call() starts the run on the platform and waits for it to finish.
    const run = await client.actor('U9fUBHDngX6IyjzzF').call(input);

    console.log(`Run ${run.id} finished with status: ${run.status}`);

    // Fetch the extracted metadata records from the run's default dataset.
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`Fetched ${items.length} metadata records:`);
    for (const item of items) {
        console.log(`- ${item.url} | "${item.title}" | ${item.wordCount} words | ${item.eventType}`);
    }
}

main().catch((err) => {
    console.error('Run failed:', err);
    process.exit(1);
});
