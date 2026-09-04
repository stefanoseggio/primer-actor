# CleanMeta Crawler

Production-grade [Crawlee](https://crawlee.dev/) + [Cheerio](https://cheerio.js.org/) Actor that turns a list of start URLs into structured page metadata: title, meta description, canonical URL, Open Graph tags, language, H1, word count and HTTP status - with resilient retries, same-site link discovery and optional pagination.

Actor: `stefano_seggio/primer-actor` - $0.50 per 1,000 extracted results, nothing else. No idle server, no proxy bill, no scaling to think about.

Most scrapers hand you raw HTML and leave the parsing to you. CleanMeta Crawler hands you the seven fields that actually matter, already parsed, already typed, already deduplicated by URL. Point it at a start URL and it follows same-site links and pagination on its own, with retries and session rotation built in, so a single flaky page never kills your whole run.

## Built for

- **SEO audits.** Find missing or duplicated titles, descriptions and canonicals across an entire site in one run.
- **LLM / RAG ingestion.** Feed a model `{title, description, h1}` per URL instead of raw HTML - fewer tokens, no parsing on your side.
- **Lead & market research.** Pull structured page data at scale without building and maintaining your own crawler.
- **Social preview monitoring.** Catch broken or stale `og:title` / `og:image` tags before your traffic does.
- **Site health checks.** `statusCode` per crawled URL surfaces broken internal links as a side effect of any of the above.

## Input

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `startUrls` | array | yes | `[{"url": "https://apify.com"}]` | URLs to start crawling from. At least one is required. |
| `maxRequestsPerCrawl` | integer | no | `100` | Hard cap on pages fetched this run, across start URLs, same-site link discovery and pagination. |
| `paginationSelector` | string | no | - | CSS selector for a "next page" link, e.g. `a[rel=next]` or `.pagination .next`. When set, the crawler follows it up to `maxPaginationDepth` pages per start URL, on top of normal same-site link discovery. |
| `maxPaginationDepth` | integer | no | `3` | Max paginated pages to follow per start URL. Ignored when `paginationSelector` is not set. |
| `proxyConfiguration` | object | no | Apify Proxy (datacenter) | Standard Apify proxy configuration object. |

```json
{
    "startUrls": [{ "url": "https://crawlee.dev" }],
    "maxRequestsPerCrawl": 20
}
```

## Output

One dataset item per crawled page:

| Field | Type | Description |
|---|---|---|
| `url` | string | The page's final (loaded) URL. |
| `title` | string | Page `<title>`. |
| `metaDescription` | string or null | `meta[name=description]` content. |
| `canonicalUrl` | string or null | `link[rel=canonical]` href. |
| `ogTitle` | string or null | `og:title` meta content. |
| `ogImage` | string or null | `og:image` meta content. |
| `language` | string or null | `html[lang]` attribute. |
| `h1` | string or null | Text of the first `<h1>`, if any. |
| `wordCount` | integer | Approximate visible body word count. |
| `statusCode` | integer or null | HTTP status code of the response. |
| `crawlDepth` | integer | Link-hops from the nearest start URL (0 for a start URL itself). |
| `scrapedAt` | string | ISO timestamp of extraction. |

```json
{
  "url": "https://example.com/blog/post",
  "title": "How We Cut Page Load Time by 40%",
  "metaDescription": "A breakdown of the changes that moved the needle.",
  "canonicalUrl": "https://example.com/blog/post",
  "ogTitle": "How We Cut Page Load Time by 40%",
  "ogImage": "https://example.com/og/post.png",
  "language": "en",
  "h1": "How We Cut Page Load Time by 40%",
  "wordCount": 1284,
  "statusCode": 200,
  "crawlDepth": 1,
  "scrapedAt": "2026-09-04T11:04:27.177Z"
}
```

A request that permanently fails after retries is recorded instead of silently dropped, as a dataset item with `url`, `error` and `failedAtRetry` fields.

## Why not just scrape it yourself

- **Maintenance.** Sites change markup. This Actor is watched and fixed when extraction breaks - your own script silently starts returning nulls until someone notices.
- **Cost control by design.** You set a max spend per run; the crawler checks it after every single result and stops cleanly the moment it's reached - it does not keep burning your compute budget past what you agreed to pay.
- **Production-grade retries.** Automatic retries, session rotation and same-site link discovery out of the box - the boring 80% of a scraper that eats a weekend to get right and years to keep right.
- **$0.50 per 1,000 results, nothing else.** No idle server, no proxy bill, no scaling to think about.

## Run it

### Apify Console

Open the Actor page, fill in the input form, click Start.

### cURL

```bash
curl -X POST "https://api.apify.com/v2/actors/stefano_seggio~primer-actor/run-sync-get-dataset-items?token=$APIFY_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "startUrls": [{ "url": "https://crawlee.dev" }],
        "maxRequestsPerCrawl": 10
    }'
```

### Python (apify-client)

```python
from apify_client import ApifyClient

client = ApifyClient("<APIFY_TOKEN>")

run = client.actor("stefano_seggio/primer-actor").call(run_input={
    "startUrls": [{"url": "https://crawlee.dev"}],
    "maxRequestsPerCrawl": 10,
})

for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(item["url"], item["title"], item["wordCount"])
```

### JavaScript (apify-client)

```javascript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: '<APIFY_TOKEN>' });

const run = await client.actor('stefano_seggio/primer-actor').call({
    startUrls: [{ url: 'https://crawlee.dev' }],
    maxRequestsPerCrawl: 10,
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items);
```

## Using it from an LLM agent (MCP)

Callable by any MCP-compatible agent (Claude Code, Claude Desktop, etc.) through Apify's MCP server, without writing glue code:

```bash
claude mcp add apify -- npx -y @apify/actors-mcp-server --tools stefano_seggio/primer-actor
```

Once connected, the agent sees this Actor as a callable tool with the input schema above and gets the dataset items back as the result - useful for letting an agent pull structured page metadata mid-conversation instead of fetching and parsing raw HTML itself.

## How it works

For each URL: fetch with retries (`maxRequestRetries: 4`, session rotation on suspected blocks), extract metadata via a pure `parsers/metadata.ts` function, optionally follow a configured pagination link, then enqueue same-hostname links up to `maxRequestsPerCrawl`. The parser takes a Cheerio API instance and returns a plain object with no Crawlee/Actor dependency, so the same extraction logic is reusable from a future browser-based (Playwright) router without duplicating parsing code.

## Resources

- [Crawlee documentation](https://crawlee.dev)
- [Apify SDK for JavaScript](https://docs.apify.com/sdk/js)
- [Apify API reference](https://docs.apify.com/api/v2)
- [Apify MCP server](https://docs.apify.com/platform/integrations/mcp)
