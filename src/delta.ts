import type { DeltaState } from './state.js';
import type { ChangeEventType } from './types.js';

export interface ClassifyResult {
    eventType: ChangeEventType;
    previousScrapedAt: string | null;
}

// Pure classification: a URL is either seen for the first time, seen again
// with the same content fingerprint, or seen again with a different one.
// No STATUS_CHANGE/CLOSED here - unlike the fleet's registry-monitoring
// actors, this Actor crawls whatever URLs the caller supplies each run
// rather than discovering listings from an enumerable source, so there is
// no "the listing is gone from the register" signal to detect and no
// lifecycle status field on a page to track.
export function classifyPage(url: string, contentHash: string, state: DeltaState): ClassifyResult {
    const previous = state.entries[url];
    if (!previous) {
        return { eventType: 'NEW_URL', previousScrapedAt: null };
    }
    if (previous.contentHash !== contentHash) {
        return { eventType: 'CONTENT_CHANGED', previousScrapedAt: previous.lastSeenAt };
    }
    return { eventType: 'UNCHANGED', previousScrapedAt: previous.lastSeenAt };
}
