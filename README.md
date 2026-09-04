# Metadata Crawler with Pagination

Production-grade [Crawlee](https://crawlee.dev/) + [Cheerio](https://cheerio.js.org/) Actor that turns a list of start URLs into structured page metadata: title, meta description, canonical URL, Open Graph tags, language, H1, word count and HTTP status - with resilient retries, same-site link discovery and optional pagination.

Actor: `stefano_seggio/primer-actor`

## Use cases

- **SEO / content audits.** Bulk-check title, meta description, canonical URL and Open Graph tags across a site to find missing or duplicated metadata before a migration or a launch.
- **Content inventory.** Word-count and H1 per page across a whole site or section, useful for finding thin-content pages.
- **Clean input for LLM/RAG pipelines.** Feed an LLM structured `{title, description, h1}` per URL instead of raw HTML - fewer tokens, less noise, no HTML parsing on your side.
- **Social preview monitoring.** Track `og:title` / `og:image` across your own or a competitor's pages to catch broken or stale share cards.
- **Site health checks.** `statusCode` per crawled URL surfaces broken internal links as a side effect of any of the above.

## Input

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `startUrls` | array | yes | `[{"url": "https://apify.com"}]` | URLs to start crawling from. |
| `maxRequestsPerCrawl` | integer | no | `100` | Hard cap on pages fetched this run, across start URLs, same-site link discovery and pagination. |
| `paginationSelector` | string | no | - | CSS selector for a "next page" link, e.g. `a[rel=next]` or `.pagination .next`. When set, the crawler follows it up to `maxPaginationDepth` pages per start URL, on top of normal same-site link discovery. |
| `maxPaginationDepth` | integer | no | `3` | Max paginated pages to follow per start URL. Ignored when `paginationSelector` is not set. |
| `proxyConfiguration` | object | no | Apify Proxy (datacenter) | Standard Apify proxy configuration object. |

Minimal example:

```json
{
    "startUrls": [{ "url": "https://crawlee.dev" }],
    "maxRequestsPerCrawl": 20
}
```

With pagination:

```json
{
    "startUrls": [{ "url": "https://example-blog.com/archive" }],
    "maxRequestsPerCrawl": 200,
    "paginationSelector": "a[rel=next]",
    "maxPaginationDepth": 10
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

A request that permanently fails after retries is recorded instead of silently dropped, as a dataset item with `url`, `error` and `failedAtRetry` fields, so failures are auditable from the same dataset rather than only visible in run logs.

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

Returns the dataset items as a JSON array once the run finishes.

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

This Actor is callable by any MCP-compatible agent (Claude Code, Claude Desktop, etc.) through Apify's MCP server, without writing any glue code.

Add the server (Claude Code CLI):

```bash
claude mcp add apify -- npx -y @apify/actors-mcp-server --tools stefano_seggio/primer-actor
```

Or manually:

```json
{
    "mcpServers": {
        "apify": {
            "command": "npx",
            "args": ["-y", "@apify/actors-mcp-server", "--tools", "stefano_seggio/primer-actor"]
        }
    }
}
```

Once connected, the agent sees this Actor as a callable tool with the input schema above and gets the dataset items back as the tool result - useful for letting an agent pull structured page metadata mid-conversation instead of fetching and parsing raw HTML itself.

## How it works

```text
.actor/
├── actor.json          # Actor metadata: name, version, memory limits
├── input_schema.json   # Input validation and the Console form
├── dataset_schema.json # Output shape and the dataset Overview table
└── output_schema.json  # Where the Actor's results live
src/
├── main.ts             # Reads input, configures CheerioCrawler, seeds requests
├── routes.ts            # Request handler: calls the parsers, enqueues links/pagination
├── types.ts             # Shared Input/PageMetadata types
└── parsers/
    ├── metadata.ts      # Pure function: HTML -> PageMetadata (unit-tested, framework-agnostic)
    └── pagination.ts    # Pure function: resolves a "next page" href
test/
├── main.test.ts         # Integration smoke test through the real router
└── parsers/             # Offline unit tests against static HTML fixtures
```

For each URL: fetch with retries (`maxRequestRetries: 4`, session rotation on suspected blocks), extract metadata via `parsers/metadata.ts`, optionally follow a configured pagination link, then enqueue same-hostname links up to `maxRequestsPerCrawl`. `parsers/metadata.ts` takes a Cheerio API instance and returns a plain object with no Crawlee/Actor dependency, so the same extraction logic is reusable from a future browser-based (Playwright) router without duplicating parsing code.

## Resources

- [Crawlee documentation](https://crawlee.dev)
- [Apify SDK for JavaScript](https://docs.apify.com/sdk/js)
- [Apify Actor input schema](https://docs.apify.com/platform/actors/development/input-schema)
- [Apify API reference](https://docs.apify.com/api/v2)
- [Apify MCP server](https://docs.apify.com/platform/integrations/mcp)
