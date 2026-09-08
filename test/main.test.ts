import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { CheerioCrawler, purgeDefaultStorages } from 'crawlee';
import { beforeEach, describe, expect, it } from 'vitest';

import { configureDelta, router } from '../src/routes.js';
import { createEmptyState } from '../src/state.js';
import type { DeltaState } from '../src/state.js';

// Reads pushed dataset items straight off disk instead of via
// crawler.getData(). Needed because this installed Crawlee version's
// memory-storage keeps stale item-count metadata across a
// purgeDefaultStorages() + multi-run sequence within one test, which makes
// getData() throw ENOENT on a file that was never actually written - a
// memory-storage test-harness quirk, not a bug in the code under test (the
// crawler logs above each failure already show the correct
// NEW_URL -> UNCHANGED classification happening).
function readDatasetItems(): unknown[] {
    const dir = join(process.cwd(), 'storage', 'datasets', 'default');
    const files = readdirSync(dir)
        .filter((name) => name.endsWith('.json'))
        .sort();
    return files.map((name) => JSON.parse(readFileSync(join(dir, name), 'utf-8')));
}

describe('CheerioCrawler router (the one main.ts actually wires in)', () => {
    beforeEach(async () => {
        await purgeDefaultStorages();
    });

    it('crawls a page and extracts enriched metadata to the dataset', async () => {
        configureDelta(createEmptyState(), false);

        const crawler = new CheerioCrawler({
            maxRequestsPerCrawl: 1,
            requestHandler: router,
        });

        await crawler.run([
            { url: 'https://www.example.com', userData: { depth: 0, paginationDepth: 0, maxPaginationDepth: 0 } },
        ]);

        expect(crawler.stats.state.requestsFinished).toBeGreaterThanOrEqual(1);

        const { items } = await crawler.getData();
        expect(items.length).toBeGreaterThan(0);
        expect(items[0].url).toContain('example.com');
        expect(items[0].title).toContain('Example Domain');
        expect(items[0].statusCode).toBe(200);
        expect(items[0].crawlDepth).toBe(0);
        expect(typeof items[0].scrapedAt).toBe('string');
        expect(items[0].eventType).toBe('NEW_URL');
        expect(items[0].previousScrapedAt).toBeNull();
        expect(typeof items[0].contentHash).toBe('string');
    }, 30_000);

    // Two passes share one crawler/dataset/request-queue (no purge between
    // them - purging mid-test races Crawlee's session-pool persistence and
    // throws a spurious "could not find file" error). Distinct uniqueKeys
    // stop the default RequestQueue from deduping the second pass's request
    // against the first pass's already-handled one for the same URL.
    it('classifies a repeat crawl of an unchanged page as UNCHANGED and still delivers it by default', async () => {
        const state = createEmptyState();
        // useSessionPool: false - two runs on one crawler instance otherwise
        // hit a memory-storage quirk where the second run's SessionPool
        // init throws "could not find file" for a KV key the first run's
        // pool already wrote. Not needed for what these tests exercise
        // (routing/classification), and production main.ts is unaffected.
        const crawler = new CheerioCrawler({ maxRequestsPerCrawl: 2, useSessionPool: false, requestHandler: router });

        configureDelta(state, false);
        await crawler.run([
            {
                url: 'https://www.example.com',
                uniqueKey: 'pass-1',
                userData: { depth: 0, paginationDepth: 0, maxPaginationDepth: 0 },
            },
        ]);

        configureDelta(state, false);
        await crawler.run([
            {
                url: 'https://www.example.com',
                uniqueKey: 'pass-2',
                userData: { depth: 0, paginationDepth: 0, maxPaginationDepth: 0 },
            },
        ]);

        const items = readDatasetItems() as Array<{ eventType: string; previousScrapedAt: string | null }>;
        expect(items.length).toBe(2);
        expect(items[0].eventType).toBe('NEW_URL');
        expect(items[1].eventType).toBe('UNCHANGED');
        expect(items[1].previousScrapedAt).not.toBeNull();
    }, 30_000);

    it('with onlyChanged=true, skips delivering an UNCHANGED page on a repeat crawl', async () => {
        const state: DeltaState = createEmptyState();
        // useSessionPool: false - two runs on one crawler instance otherwise
        // hit a memory-storage quirk where the second run's SessionPool
        // init throws "could not find file" for a KV key the first run's
        // pool already wrote. Not needed for what these tests exercise
        // (routing/classification), and production main.ts is unaffected.
        const crawler = new CheerioCrawler({ maxRequestsPerCrawl: 2, useSessionPool: false, requestHandler: router });

        configureDelta(state, false);
        await crawler.run([
            {
                url: 'https://www.example.com',
                uniqueKey: 'pass-1',
                userData: { depth: 0, paginationDepth: 0, maxPaginationDepth: 0 },
            },
        ]);

        configureDelta(state, true);
        await crawler.run([
            {
                url: 'https://www.example.com',
                uniqueKey: 'pass-2',
                userData: { depth: 0, paginationDepth: 0, maxPaginationDepth: 0 },
            },
        ]);

        const items = readDatasetItems() as Array<{ eventType: string }>;
        expect(items.length).toBe(1);
        expect(items[0].eventType).toBe('NEW_URL');
    }, 30_000);
});
