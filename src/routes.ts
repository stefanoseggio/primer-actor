import { Actor } from 'apify';
import { createCheerioRouter } from 'crawlee';

import { classifyPage } from './delta.js';
import { contentFingerprintOf } from './fingerprint.js';
import { extractMetadata } from './parsers/metadata.js';
import { findNextPageUrl } from './parsers/pagination.js';
import type { DeltaState } from './state.js';
import { createEmptyState } from './state.js';

export const router = createCheerioRouter();

// Paid event name. Must match the event name configured in Apify Console
// (Actor > Publication > Monetization) exactly, or Actor.charge() throws once
// the Actor is actually on the pay-per-event pricing model. Before that
// Console setup lands (and takes effect - new paid events have a 14-day
// notice period), this call is a safe no-op: it logs one warning and
// returns { eventChargeLimitReached: false }.
const RESULT_EVENT_NAME = 'result';

// The router is a shared singleton with no closure access to run()'s own
// locals, so cross-run delta state lives here at module scope, set once by
// main.ts via configureDelta() before crawler.run() starts. Safe because
// each Actor run is a single, fresh Node process - no concurrent-run state
// leakage risk. Defaults to an empty state so tests that call the router
// directly without configureDelta() still get well-defined (all-NEW_URL)
// behavior instead of a crash.
let deltaState: DeltaState = createEmptyState();
let onlyChanged = false;

export function configureDelta(state: DeltaState, onlyChangedInput: boolean): void {
    deltaState = state;
    onlyChanged = onlyChangedInput;
}

router.addDefaultHandler(async ({ $, request, response, crawler, enqueueLinks, pushData, log }) => {
    const userData = request.userData ?? {};
    const crawlDepth = typeof userData.depth === 'number' ? userData.depth : 0;
    const paginationDepth = typeof userData.paginationDepth === 'number' ? userData.paginationDepth : 0;
    const paginationSelector = typeof userData.paginationSelector === 'string' ? userData.paginationSelector : undefined;
    const maxPaginationDepth = typeof userData.maxPaginationDepth === 'number' ? userData.maxPaginationDepth : 0;

    const pageUrl = request.loadedUrl ?? request.url;
    const metadata = extractMetadata($, pageUrl, crawlDepth, response?.statusCode ?? null);
    const contentHash = contentFingerprintOf(metadata);
    const { eventType, previousScrapedAt } = classifyPage(pageUrl, contentHash, deltaState);

    // Record this URL's fingerprint regardless of onlyChanged - the point of
    // tracking it is precisely so the *next* run can classify it correctly,
    // even if this run chose not to deliver it.
    deltaState.entries[pageUrl] = { contentHash, lastSeenAt: metadata.scrapedAt };

    if (onlyChanged && eventType === 'UNCHANGED') {
        log.debug(`Unchanged since last scrape, skipping delivery: ${pageUrl}`);
    } else {
        log.info(`Extracted "${metadata.title}" [${eventType}]`, { url: pageUrl });
        await pushData({ ...metadata, eventType, contentHash, previousScrapedAt });

        const { eventChargeLimitReached } = await Actor.charge({ eventName: RESULT_EVENT_NAME, count: 1 });
        if (eventChargeLimitReached) {
            log.info('Charge limit reached for this run - stopping further extraction.');
            await crawler.autoscaledPool?.abort();
            return;
        }
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
