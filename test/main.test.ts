import { CheerioCrawler, purgeDefaultStorages } from 'crawlee';
import { beforeAll, describe, expect, it } from 'vitest';

import { router } from '../src/routes.js';

describe('CheerioCrawler router (the one main.ts actually wires in)', () => {
    beforeAll(async () => {
        await purgeDefaultStorages();
    });

    it('crawls a page and extracts enriched metadata to the dataset', async () => {
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
    }, 30_000);
});
