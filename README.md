## Why CleanMeta Crawler

Most scrapers hand you raw HTML and leave the parsing to you. CleanMeta Crawler
hands you the seven fields that actually matter — title, meta description,
canonical URL, Open Graph tags, H1 and word count — already parsed, already
typed, already deduplicated by URL. Point it at a start URL and it follows
same-site links and pagination on its own, with retries and session rotation
built in, so a single flaky page never kills your whole run.

## Built for

- **SEO audits** — find missing or duplicated titles, descriptions and
  canonicals across an entire site in one run.
- **LLM / RAG ingestion** — feed a model `{title, description, h1}` per URL
  instead of raw HTML. Fewer tokens, no parsing on your side.
- **Lead & market research** — pull structured page data at scale without
  building and maintaining your own crawler.
- **Social preview monitoring** — catch broken or stale `og:title` / `og:image`
  tags before your traffic does.

## Output — one clean object per page

```json
{
  "title": "How We Cut Page Load Time by 40%",
  "metaDescription": "A breakdown of the changes that moved the needle.",
  "wordCount": 1284,
  "statusCode": 200
}
```

## Why not just scrape it yourself

- **Maintenance.** Sites change markup. This Actor is watched and fixed when
  extraction breaks — your own script silently starts returning nulls until
  someone notices.
- **Cost control by design.** You set a max spend per run; the crawler checks
  it after every single result and stops cleanly the moment it's reached —
  it does not keep burning your compute budget past what you agreed to pay.
- **Production-grade retries.** Automatic retries, session rotation and
  same-site link discovery out of the box — the boring 80% of a scraper
  that eats a weekend to get right and years to keep right.
- **$0.50 per 1,000 results, nothing else.** No idle server, no proxy bill,
  no scaling to think about.
