# Page Metadata Extractor - SEO & LLM/RAG Data Pipeline Crawler (CleanMeta)

## Executive Value Proposition

Auditing page metadata by hand means opening each page, reading the source, and copying title, description, canonical, Open Graph and H1 values into a spreadsheet one URL at a time - and doing it again every time you need a refresh. CleanMeta Crawler does the same extraction across an entire site in a single run: point it at one or more start URLs and it follows same-hostname links (and pagination, if you configure a selector) on its own, handing back clean, typed metadata instead of raw HTML you'd otherwise have to fetch and parse yourself. Built-in retries and session rotation mean a handful of flaky pages don't stall or skew the audit, and a permanently failed page is recorded with its error rather than silently dropped. The output is the same seven-field metadata snapshot a manual audit produces - title, description, canonical, Open Graph, language, H1, word count - just without the manual part.

## Use Cases

- **SEO agencies auditing client sites at scale.** Crawl a client's domain in one run and get every page's title, meta description and canonical URL back as structured data, so missing or duplicated tags surface in a spreadsheet instead of a manual page-by-page check.
- **RAG / LLM pipeline builders needing clean structured page metadata.** Feed a model `{title, metaDescription, h1}` per URL instead of raw HTML - fewer tokens spent on markup, no HTML parsing on your side, and a `wordCount` field to gauge page substance before ingestion.
- **Content teams checking Open Graph tags before publish.** Run the crawler against a staging or production section of the site and check `ogTitle` / `ogImage` per URL to catch a broken or stale social preview before it ships.

## Input

```json
{
    "startUrls": [{ "url": "https://crawlee.dev" }],
    "maxRequestsPerCrawl": 20
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `startUrls` | array | yes | `[{"url": "https://apify.com"}]` | URLs to start crawling from. At least one is required. |
| `maxRequestsPerCrawl` | integer | no | `100` | Hard cap on pages fetched this run, across start URLs, same-hostname link discovery and pagination. |
| `paginationSelector` | string | no | - | CSS selector for a "next page" link, e.g. `a[rel=next]` or `.pagination .next`. When set, the crawler follows it up to `maxPaginationDepth` pages per start URL, on top of normal same-hostname link discovery. |
| `maxPaginationDepth` | integer | no | `3` | Max paginated pages to follow per start URL. Ignored when `paginationSelector` is not set. |
| `proxyConfiguration` | object | no | Apify Proxy (datacenter) | Standard Apify proxy configuration object. |
| `onlyChanged` | boolean | no | `false` | When `true`, only deliver (and get charged for) pages that are new or whose extracted metadata changed since the last time this Actor scraped that URL. Every visited page is still crawled and its links still followed either way. |

## Output

One dataset item per crawled page:

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
  "scrapedAt": "2026-09-04T11:04:27.177Z",
  "eventType": "NEW_URL",
  "contentHash": "3f9a1c2b8e7d4f0a1b2c3d4e5f60718293a4b5c",
  "previousScrapedAt": null
}
```

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
| `eventType` | string | `NEW_URL`, `CONTENT_CHANGED` or `UNCHANGED` - whether this URL's metadata is new, differs from the last scrape, or matches it. |
| `contentHash` | string | Fingerprint of the page's extracted content, used to detect `CONTENT_CHANGED` on later runs. |
| `previousScrapedAt` | string or null | Timestamp of the last scrape of this URL, or `null` if new. |

A request that permanently fails after retries is still recorded, as a dataset item with `url`, `error` and `failedAtRetry` fields instead of being silently dropped.

## Reliability

Every request goes through Crawlee's `CheerioCrawler` configured with `maxRequestRetries: 4` and `retryOnBlocked: true`, with `useSessionPool` and `persistCookiesPerSession` enabled so a suspected block rotates to a fresh session instead of hammering the same one. A page that still fails after its retries is not dropped silently - it's pushed to the dataset as an error record (`url`, `error`, `failedAtRetry`) so you can see exactly what didn't come back and why. `maxRequestsPerCrawl` is a hard ceiling checked across start URLs, same-hostname link discovery and pagination combined, so a run can't run away past what you asked for.

Pagination is opt-in and explicit: set `paginationSelector` to a CSS selector for a "next page" link (e.g. `a[rel=next]`), and the crawler follows it up to `maxPaginationDepth` pages per start URL, independently of normal same-hostname link discovery. Leave it unset and the crawler relies purely on same-hostname link discovery to find pages.

Change-detection state (one content fingerprint per URL) persists across runs in a dedicated key-value store, not the run's own temporary storage - so `onlyChanged` and the `eventType` field work correctly on a scheduled Actor task without any extra setup on your part.

## Pricing

CleanMeta Crawler runs on Apify's pay-per-event pricing: **$0.0005 per extracted result - $0.50 per 1,000 results** - plus a flat $0.00005 fee charged once when a run starts, regardless of how many pages it processes. You are not charged for requests that fail after retries; those are recorded as error items but never trigger a charge, so a flaky target site costs you nothing beyond the pages that actually came back. Set input `onlyChanged: true` to go further: pages are still crawled and their links still followed, but a page classified `UNCHANGED` since the last run is neither added to the dataset nor charged - the cheapest way to re-run a scheduled SEO audit or social-preview check and only pay for what's actually different this time. Beyond the once-per-run start fee, there's no idle-server cost, no proxy bill, and no charge tied to how many requests the crawler had to make to get there - pay only per result, never per wasted run.

## Support & Enterprise SLA

CleanMeta Crawler is built and maintained by an independent developer, not a vendor team with a formal enterprise support contract. Bug reports and feature requests go through the Issues tab on this Actor's Apify Store page and are typically triaged within about 48 hours. There's no guaranteed uptime commitment or dedicated account manager attached to this listing - if your use case needs a contractual SLA, custom extraction fields, or a Playwright-based variant for JavaScript-heavy sites, open an issue on the Store page to discuss what's realistic before relying on it in production.
