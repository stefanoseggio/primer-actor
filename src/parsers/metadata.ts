import type { CheerioCrawlingContext } from 'crawlee';

import type { PageMetadata } from '../types.js';

type CheerioAPI = CheerioCrawlingContext['$'];

// Pure function on purpose: no network, no Actor/Crawlee state, so it can be
// unit-tested against a static HTML fixture and reused from a future
// PlaywrightCrawler router (page.content() -> cheerio.load() -> same parser).
export function extractMetadata(
    $: CheerioAPI,
    url: string,
    crawlDepth: number,
    statusCode: number | null,
): PageMetadata {
    const bodyText = $('body').text();

    return {
        url,
        title: $('title').first().text().trim(),
        metaDescription: $('meta[name="description"]').attr('content')?.trim() ?? null,
        canonicalUrl: $('link[rel="canonical"]').attr('href')?.trim() ?? null,
        ogTitle: $('meta[property="og:title"]').attr('content')?.trim() ?? null,
        ogImage: $('meta[property="og:image"]').attr('content')?.trim() ?? null,
        language: $('html').attr('lang')?.trim() ?? null,
        h1: $('h1').first().text().trim() || null,
        wordCount: bodyText.split(/\s+/).filter(Boolean).length,
        statusCode,
        crawlDepth,
        scrapedAt: new Date().toISOString(),
    };
}
