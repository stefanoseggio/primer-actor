import { createCheerioRouter } from 'crawlee';

import { extractMetadata } from './parsers/metadata.js';
import { findNextPageUrl } from './parsers/pagination.js';

export const router = createCheerioRouter();

router.addDefaultHandler(async ({ $, request, response, enqueueLinks, pushData, log }) => {
    const userData = request.userData ?? {};
    const crawlDepth = typeof userData.depth === 'number' ? userData.depth : 0;
    const paginationDepth = typeof userData.paginationDepth === 'number' ? userData.paginationDepth : 0;
    const paginationSelector = typeof userData.paginationSelector === 'string' ? userData.paginationSelector : undefined;
    const maxPaginationDepth = typeof userData.maxPaginationDepth === 'number' ? userData.maxPaginationDepth : 0;

    const pageUrl = request.loadedUrl ?? request.url;
    const metadata = extractMetadata($, pageUrl, crawlDepth, response?.statusCode ?? null);

    log.info(`Extracted "${metadata.title}"`, { url: pageUrl });
    await pushData(metadata);

    // Dynamic pagination: only follows a "next page" link when the caller
    // configured one via input; capped independently of maxRequestsPerCrawl
    // so a paginated listing can't run away past what the user asked for.
    if (paginationSelector && paginationDepth < maxPaginationDepth) {
        const nextUrl = findNextPageUrl($, pageUrl, paginationSelector);
        if (nextUrl) {
            await enqueueLinks({
                urls: [nextUrl],
                userData: { ...userData, depth: crawlDepth + 1, paginationDepth: paginationDepth + 1 },
            });
        }
    }

    // Same-hostname link discovery (explicit strategy, matches the crawler's
    // previous implicit default so this isn't a silent behavior change).
    await enqueueLinks({
        strategy: 'same-hostname',
        userData: { ...userData, depth: crawlDepth + 1, paginationDepth: 0 },
    });
});
