import { Actor } from 'apify';
import { createCheerioRouter } from 'crawlee';

import { extractMetadata } from './parsers/metadata.js';
import { findNextPageUrl } from './parsers/pagination.js';

export const router = createCheerioRouter();

// Paid event name. Must match the event name configured in Apify Console
// (Actor > Publication > Monetization) exactly, or Actor.charge() throws once
// the Actor is actually on the pay-per-event pricing model. Before that
// Console setup lands (and takes effect - new paid events have a 14-day
// notice period), this call is a safe no-op: it logs one warning and
// returns { eventChargeLimitReached: false }.
const RESULT_EVENT_NAME = 'result';

router.addDefaultHandler(async ({ $, request, response, crawler, enqueueLinks, pushData, log }) => {
    const userData = request.userData ?? {};
    const crawlDepth = typeof userData.depth === 'number' ? userData.depth : 0;
    const paginationDepth = typeof userData.paginationDepth === 'number' ? userData.paginationDepth : 0;
    const paginationSelector = typeof userData.paginationSelector === 'string' ? userData.paginationSelector : undefined;
    const maxPaginationDepth = typeof userData.maxPaginationDepth === 'number' ? userData.maxPaginationDepth : 0;

    const pageUrl = request.loadedUrl ?? request.url;
    const metadata = extractMetadata($, pageUrl, crawlDepth, response?.statusCode ?? null);

    log.info(`Extracted "${metadata.title}"`, { url: pageUrl });
    await pushData(metadata);

    const { eventChargeLimitReached } = await Actor.charge({ eventName: RESULT_EVENT_NAME, count: 1 });
    if (eventChargeLimitReached) {
        log.info('Charge limit reached for this run - stopping further extraction.');
        await crawler.autoscaledPool?.abort();
        return;
    }

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
