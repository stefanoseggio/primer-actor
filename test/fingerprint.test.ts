import { describe, expect, it } from 'vitest';

import { contentFingerprintOf } from '../src/fingerprint.js';
import type { PageMetadata } from '../src/types.js';

function makeMetadata(overrides: Partial<PageMetadata> = {}): PageMetadata {
    return {
        url: 'https://example.com/page',
        title: 'A title',
        metaDescription: 'A description',
        canonicalUrl: 'https://example.com/page',
        ogTitle: 'OG title',
        ogImage: 'https://example.com/og.png',
        language: 'en',
        h1: 'A heading',
        wordCount: 120,
        statusCode: 200,
        crawlDepth: 0,
        scrapedAt: '2026-09-08T00:00:00.000Z',
        ...overrides,
    };
}

describe('contentFingerprintOf', () => {
    it('is stable for identical content', () => {
        expect(contentFingerprintOf(makeMetadata())).toBe(contentFingerprintOf(makeMetadata()));
    });

    it('changes when a content field changes', () => {
        const a = contentFingerprintOf(makeMetadata());
        const b = contentFingerprintOf(makeMetadata({ title: 'A different title' }));
        expect(a).not.toBe(b);
    });

    it('ignores statusCode, crawlDepth and scrapedAt - not content', () => {
        const a = contentFingerprintOf(makeMetadata());
        const b = contentFingerprintOf(
            makeMetadata({ statusCode: 304, crawlDepth: 3, scrapedAt: '2026-09-09T00:00:00.000Z' }),
        );
        expect(a).toBe(b);
    });
});
