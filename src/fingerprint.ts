import { createHash } from 'node:crypto';

import type { PageMetadata } from './types.js';

// Fingerprint over the fields that represent a page's actual SEO-relevant
// content. Deliberately excludes statusCode, crawlDepth and scrapedAt -
// none of those describe "what the page says", so a re-crawl that hits the
// same title/description/etc. through a different link path (different
// crawlDepth) must still be classified as UNCHANGED.
export function contentFingerprintOf(metadata: PageMetadata): string {
    const stable = {
        title: metadata.title,
        metaDescription: metadata.metaDescription,
        canonicalUrl: metadata.canonicalUrl,
        ogTitle: metadata.ogTitle,
        ogImage: metadata.ogImage,
        language: metadata.language,
        h1: metadata.h1,
        wordCount: metadata.wordCount,
    };
    return createHash('sha1').update(JSON.stringify(stable)).digest('hex');
}
